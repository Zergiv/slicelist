"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { QuestSession } from "@/lib/quest/connect";
import { isInstalled } from "@/lib/quest/installed";
import { pickBest } from "@/lib/quest/pickBest";
import type { BatchStatus, QuestPhase, QuestView, SendStatus } from "@/lib/quest/types";
import type { BeatMap, Song } from "@/lib/types";

export type QuestApi = {
  view: QuestView;
  /** Estado del envío de un mapa; `null` si ni está en el visor ni en cola. */
  statusOf(map: BeatMap): SendStatus | null;
  connect(): Promise<boolean>;
  disconnect(): void;
  send(map: BeatMap): void;
  /** Mapas que mandaría "Añadir el mejor de cada canción". */
  bestFor(songs: readonly Song[]): BeatMap[];
  sendBest(songs: readonly Song[]): void;
  stopBatch(): void;
};

const DONE: SendStatus = { state: "done", progress: 1 };
const noBatch = null as BatchStatus | null;

const Ctx = createContext<QuestApi | null>(null);

export function QuestProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<QuestPhase>("idle");
  const [deviceName, setDeviceName] = useState<string>();
  const [installed, setInstalled] = useState<ReadonlySet<string>>(() => new Set());
  const [songCount, setSongCount] = useState(0);
  const [sends, setSends] = useState<ReadonlyMap<string, SendStatus>>(() => new Map());
  const [batch, setBatch] = useState(noBatch);

  const session = useRef<QuestSession | null>(null);
  const queue = useRef<BeatMap[]>([]);
  const pumping = useRef(false);
  const batchIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!("usb" in navigator)) setPhase("unsupported");
    return () => {
      void session.current?.close();
      session.current = null;
    };
  }, []);

  const setSend = useCallback((id: string, status: SendStatus | null) => {
    setSends((prev) => {
      const next = new Map(prev);
      if (status) next.set(id, status);
      else next.delete(id);
      return next;
    });
  }, []);

  const dropQueue = useCallback(() => {
    const waiting = queue.current;
    queue.current = [];
    if (waiting.length === 0) return;
    setSends((prev) => {
      const next = new Map(prev);
      for (const map of waiting) next.delete(map.id);
      return next;
    });
  }, []);

  const connect = useCallback(async () => {
    if (session.current) return true;
    if (!("usb" in navigator)) {
      setPhase("unsupported");
      return false;
    }
    setPhase("connecting");
    try {
      const { openQuest } = await import("@/lib/quest/connect");
      const opened = await openQuest(() => setPhase("authorizing"));
      session.current = opened;
      setDeviceName(opened.name || undefined);
      setInstalled(new Set(opened.installed));
      setSongCount(opened.songCount);
      setSends(new Map());
      setBatch(null);
      setPhase("connected");
      void opened.lost.then(() => {
        if (session.current !== opened) return;
        session.current = null;
        dropQueue();
        setBatch((b) => (b ? { ...b, running: false } : b));
        setPhase("error");
      });
      return true;
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      setPhase(
        code === "cancelled"
          ? "idle"
          : code === "busy"
            ? "busy"
            : code === "notModded"
              ? "notModded"
              : code === "unsupported"
                ? "unsupported"
                : "error",
      );
      return false;
    }
  }, [dropQueue]);

  const disconnect = useCallback(() => {
    const current = session.current;
    session.current = null;
    dropQueue();
    batchIds.current.clear();
    setBatch(null);
    setSends(new Map());
    setInstalled(new Set());
    setSongCount(0);
    setDeviceName(undefined);
    setPhase("idle");
    void current?.close();
  }, [dropQueue]);

  const pump = useCallback(async () => {
    if (pumping.current) return;
    pumping.current = true;
    try {
      for (;;) {
        const map = queue.current.shift();
        const active = session.current;
        if (!map || !active) break;

        let last = 0;
        setSend(map.id, { state: "sending", progress: 0 });
        let ok = true;
        try {
          await active.push(map, (progress) => {
            // Como mucho unas diez actualizaciones por segundo.
            const now = performance.now();
            if (progress < 1 && now - last < 100) return;
            last = now;
            setSend(map.id, { state: "sending", progress });
          });
        } catch {
          ok = false;
        }

        if (ok) {
          setInstalled(new Set(active.installed));
          setSongCount(active.songCount);
          setSend(map.id, null);
        } else {
          setSend(map.id, { state: "failed", progress: 0 });
        }

        if (batchIds.current.delete(map.id)) {
          const left = batchIds.current.size;
          setBatch((b) =>
            b
              ? {
                  ...b,
                  done: b.done + 1,
                  failed: b.failed + (ok ? 0 : 1),
                  running: left > 0,
                }
              : b,
          );
        }
      }
    } finally {
      pumping.current = false;
    }
  }, [setSend]);

  const enqueue = useCallback(
    (maps: BeatMap[]) => {
      const fresh = maps.filter((m) => !queue.current.some((q) => q.id === m.id));
      if (fresh.length === 0) return;
      queue.current.push(...fresh);
      setSends((prev) => {
        const next = new Map(prev);
        for (const map of fresh) next.set(map.id, { state: "queued", progress: 0 });
        return next;
      });
      void pump();
    },
    [pump],
  );

  const send = useCallback(
    (map: BeatMap) => {
      void (async () => {
        if (!(await connect())) return;
        const active = session.current;
        if (!active || isInstalled(map, active.installed)) return;
        enqueue([map]);
      })();
    },
    [connect, enqueue],
  );

  const bestFor = useCallback(
    (songs: readonly Song[]) => pickBest(songs, installed),
    [installed],
  );

  const sendBest = useCallback(
    (songs: readonly Song[]) => {
      void (async () => {
        if (!(await connect())) return;
        const active = session.current;
        if (!active) return;
        const maps = pickBest(songs, active.installed);
        if (maps.length === 0) return;
        batchIds.current = new Set(maps.map((m) => m.id));
        setBatch({ running: true, done: 0, total: maps.length, failed: 0 });
        enqueue(maps);
      })();
    },
    [connect, enqueue],
  );

  const stopBatch = useCallback(() => {
    dropQueue();
    batchIds.current.clear();
    setBatch((b) => (b ? { ...b, running: false, total: b.done } : b));
  }, [dropQueue]);

  const statusOf = useCallback(
    (map: BeatMap) => sends.get(map.id) ?? (isInstalled(map, installed) ? DONE : null),
    [sends, installed],
  );

  const api = useMemo<QuestApi>(
    () => ({
      view: { phase, deviceName, installedCount: songCount, batch },
      statusOf,
      connect,
      disconnect,
      send,
      bestFor,
      sendBest,
      stopBatch,
    }),
    [phase, deviceName, songCount, batch, statusOf, connect, disconnect, send, bestFor, sendBest, stopBatch],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useQuest(): QuestApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useQuest fuera de QuestProvider");
  return api;
}
