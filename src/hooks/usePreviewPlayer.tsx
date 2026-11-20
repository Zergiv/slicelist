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
import type { BeatMap } from "@/lib/types";

const VOLUME_KEY = "slicelist-volume";
const DEFAULT_VOLUME = 0.35;

function readStoredVolume(): number {
  if (typeof window === "undefined") return DEFAULT_VOLUME;
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    if (raw == null) return DEFAULT_VOLUME;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_VOLUME;
    return Math.min(1, Math.max(0, n));
  } catch {
    return DEFAULT_VOLUME;
  }
}

export type PreviewPlayer = {
  /** El mapa cuya vista previa está cargada. */
  current: BeatMap | null;
  playing: boolean;
  /** De 0 a 1. */
  volume: number;
  setVolume(value: number): void;
  /** Escuchar este mapa; si ya suena, lo pausa. */
  toggle(map: BeatMap): void;
  pause(): void;
  /** De 0 a 1, para pintar el avance sin volver a renderizar. */
  progress(): number;
};

const Ctx = createContext<PreviewPlayer | null>(null);

export function PreviewPlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<BeatMap | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);

  useEffect(() => {
    setVolumeState(readStoredVolume());
  }, []);

  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
    },
    [],
  );

  const element = useCallback(() => {
    if (audio.current) return audio.current;
    const el = new Audio();
    el.preload = "none";
    el.volume = readStoredVolume();
    el.addEventListener("play", () => setPlaying(true));
    el.addEventListener("pause", () => setPlaying(false));
    el.addEventListener("ended", () => setPlaying(false));
    el.addEventListener("error", () => setPlaying(false));
    audio.current = el;
    return el;
  }, []);

  const setVolume = useCallback(
    (value: number) => {
      const next = Math.min(1, Math.max(0, value));
      setVolumeState(next);
      const el = element();
      el.volume = next;
      try {
        window.localStorage.setItem(VOLUME_KEY, String(next));
      } catch {
        /* sin almacenamiento: igual se aplica a esta sesión */
      }
    },
    [element],
  );

  const toggle = useCallback(
    (map: BeatMap) => {
      const el = element();
      el.volume = volume;
      if (current?.id === map.id) {
        if (el.paused) void el.play().catch(() => setPlaying(false));
        else el.pause();
        return;
      }
      el.src = map.previewURL;
      setCurrent(map);
      void el.play().catch(() => setPlaying(false));
    },
    [current, element, volume],
  );

  const pause = useCallback(() => audio.current?.pause(), []);

  const progress = useCallback(() => {
    const el = audio.current;
    if (!el || !el.duration || !Number.isFinite(el.duration)) return 0;
    return Math.min(1, el.currentTime / el.duration);
  }, []);

  const api = useMemo(
    () => ({ current, playing, volume, setVolume, toggle, pause, progress }),
    [current, playing, volume, setVolume, toggle, pause, progress],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePreviewPlayer(): PreviewPlayer {
  const api = useContext(Ctx);
  if (!api) throw new Error("usePreviewPlayer fuera de PreviewPlayerProvider");
  return api;
}
