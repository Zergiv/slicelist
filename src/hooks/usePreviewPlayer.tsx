"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { BeatMap } from "@/lib/types";

export type PreviewPlayer = {
  /** El mapa cuya vista previa está cargada. */
  current: BeatMap | null;
  playing: boolean;
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
    el.volume = 0.8;
    el.addEventListener("play", () => setPlaying(true));
    el.addEventListener("pause", () => setPlaying(false));
    el.addEventListener("ended", () => setPlaying(false));
    el.addEventListener("error", () => setPlaying(false));
    audio.current = el;
    return el;
  }, []);

  const toggle = useCallback(
    (map: BeatMap) => {
      const el = element();
      if (current?.id === map.id) {
        if (el.paused) void el.play().catch(() => setPlaying(false));
        else el.pause();
        return;
      }
      el.src = map.previewURL;
      setCurrent(map);
      void el.play().catch(() => setPlaying(false));
    },
    [current, element],
  );

  const pause = useCallback(() => audio.current?.pause(), []);

  const progress = useCallback(() => {
    const el = audio.current;
    if (!el || !el.duration || !Number.isFinite(el.duration)) return 0;
    return Math.min(1, el.currentTime / el.duration);
  }, []);

  const api = useMemo(
    () => ({ current, playing, toggle, pause, progress }),
    [current, playing, toggle, pause, progress],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePreviewPlayer(): PreviewPlayer {
  const api = useContext(Ctx);
  if (!api) throw new Error("usePreviewPlayer fuera de PreviewPlayerProvider");
  return api;
}
