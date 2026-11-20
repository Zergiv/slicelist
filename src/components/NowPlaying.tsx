"use client";

import { useEffect, useRef } from "react";
import { Cover } from "@/components/Cover";
import { PauseGlyph, PlayGlyph } from "@/components/Glyphs";
import { ViewfinderCorners } from "@/components/grid/ViewfinderCorners";
import { useT } from "@/lib/i18n";
import type { BeatMap } from "@/lib/types";

/** Barra que sigue a la vista previa sin volver a renderizar nada. */
function Progress({ playing, read }: { playing: boolean; read(): number }) {
  const fill = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const paint = () => fill.current?.style.setProperty("--progress", String(read()));
    paint();
    if (!playing) return;
    let frame = requestAnimationFrame(function tick() {
      paint();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, read]);

  return (
    <div className="bar" aria-hidden="true">
      <div className="bar__fill" ref={fill} />
    </div>
  );
}

/**
 * "Ahora suena". `variant="dock"` es la barra compacta de pantallas pequeñas.
 */
export function NowPlaying({
  map,
  playing,
  onToggle,
  progress,
  variant = "panel",
}: {
  map: BeatMap | null;
  playing: boolean;
  onToggle(): void;
  progress(): number;
  variant?: "panel" | "dock";
}) {
  const t = useT();

  if (!map) {
    return (
      <div>
        <h2 className="text-meta text-smoke">{t.nowPlaying.title}</h2>
        <p className="mt-3 text-body text-ash">{t.nowPlaying.empty}</p>
      </div>
    );
  }

  const title = map.songName || map.name;
  const toggle = (
    <button
      type="button"
      className="btn flex-none !px-0"
      style={{ width: 36 }}
      onClick={onToggle}
      aria-label={playing ? t.nowPlaying.pause : t.nowPlaying.play}
    >
      {playing ? <PauseGlyph /> : <PlayGlyph />}
    </button>
  );

  if (variant === "dock") {
    return (
      <div className="overflow-hidden rounded-l">
        <div className="flex items-center gap-3 p-3">
          <Cover src={map.coverURL} title={title} size={40} className="!rounded-s" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body text-bone">{title}</p>
            <p className="truncate text-meta text-ash">
              {t.nowPlaying.by} {map.mapper}
            </p>
          </div>
          {toggle}
        </div>
        <Progress playing={playing} read={progress} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-meta text-smoke">{t.nowPlaying.title}</h2>
      <div className="mt-4 flex items-center gap-4">
        <ViewfinderCorners active={playing}>
          <Cover src={map.coverURL} title={title} size={64} className={playing ? "shadow-active" : ""} />
        </ViewfinderCorners>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body text-bone">{title}</p>
          <p className="truncate text-meta text-ash">
            {t.nowPlaying.by} {map.mapper}
          </p>
        </div>
        {toggle}
      </div>
      <div className="mt-4">
        <Progress playing={playing} read={progress} />
      </div>
    </div>
  );
}
