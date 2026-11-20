"use client";

import { useMemo, useState } from "react";
import { Cover } from "@/components/Cover";
import { PauseGlyph, PlayGlyph } from "@/components/Glyphs";
import { ViewfinderCorners } from "@/components/grid/ViewfinderCorners";
import { useT } from "@/lib/i18n";
import type { Song } from "@/lib/types";

const SIZE = 96;
const GAP = 24;
/** Cuánto tiene que medir media tira para que nunca se vea el final. */
const MIN_HALF = 2000;
const MAX_COVERS = 40;
const SPEED = 22; // px por segundo

export function CoverMarquee({
  songs,
  activeId,
  onPick,
}: {
  songs: Song[];
  /** Canción cuyo mapa está sonando. */
  activeId?: string;
  onPick(song: Song): void;
}) {
  const t = useT();
  const [paused, setPaused] = useState(false);

  // Solo las que tienen portada, sin repetir imagen.
  const covers = useMemo(() => {
    const seen = new Set<string>();
    const out: Song[] = [];
    for (const song of songs) {
      if (!song.thumb || seen.has(song.thumb)) continue;
      seen.add(song.thumb);
      out.push(song);
      if (out.length === MAX_COVERS) break;
    }
    return out;
  }, [songs]);

  if (covers.length === 0) {
    return (
      <div className="flex items-center gap-6 overflow-hidden" style={{ height: SIZE + 52 }}>
        <div className="flex flex-none gap-6" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <ViewfinderCorners key={i}>
              <span
                className="block rounded-m border border-dashed border-line-strong"
                style={{ width: SIZE, height: SIZE }}
              />
            </ViewfinderCorners>
          ))}
        </div>
        <p className="max-w-[24ch] text-meta text-smoke">{t.marquee.empty}</p>
      </div>
    );
  }

  const step = SIZE + GAP;
  const repeats = Math.max(1, Math.ceil(MIN_HALF / (covers.length * step)));
  const half = Array.from({ length: repeats }, () => covers).flat();
  const duration = Math.round((half.length * step) / SPEED);

  const strip = (hidden: boolean) =>
    half.map((song, i) => {
      const repeated = hidden || i >= covers.length;
      return (
        <button
          key={`${hidden ? "b" : "a"}-${i}`}
          type="button"
          className="framing-host flex-none rounded-m border-0 bg-transparent p-0"
          onClick={() => onPick(song)}
          aria-label={t.marquee.open(song.title)}
          aria-hidden={repeated || undefined}
          tabIndex={repeated ? -1 : undefined}
        >
          <ViewfinderCorners active={song.id === activeId}>
            <Cover src={song.thumb} title={song.title} size={SIZE} />
          </ViewfinderCorners>
        </button>
      );
    });

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-4">
        <p className="text-meta text-smoke">{t.marquee.title}</p>
        <button
          type="button"
          className="btn btn--bare !min-h-8 motion-reduce:hidden"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
        >
          {paused ? <PlayGlyph size={10} /> : <PauseGlyph size={10} />}
          {paused ? t.marquee.resume : t.marquee.pause}
        </button>
      </div>
      <div
        className="marquee"
        data-moving="true"
        data-paused={paused}
        role="group"
        aria-label={t.marquee.label}
        style={{ "--t-marquee": `${duration}s` } as React.CSSProperties}
      >
        <div className="marquee__track">
          {strip(false)}
          {strip(true)}
        </div>
      </div>
    </div>
  );
}
