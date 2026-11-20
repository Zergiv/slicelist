"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScanState } from "@/hooks/useScan";
import { count, seconds } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { QuestPhase } from "@/lib/quest/types";
import type { Song, SongStatus } from "@/lib/types";

const MAX_PIXELS = 144;
const IDLE_PIXELS = 36;
/** Lado del bloque, en px. Los cuadrados se reparten para llenarlo. */
const BLOCK = 141;
const GAP = 3;

type PixelState = "idle" | "searching" | "found" | "none" | "error";

function pixelOf(status: SongStatus): PixelState {
  return status === "pending" ? "idle" : status;
}

/** Un cuadrado por canción; si son muchas, cada cuadrado resume un tramo. */
function pixelsFor(songs: Song[]): PixelState[] {
  if (songs.length <= MAX_PIXELS) return songs.map((s) => pixelOf(s.status));
  return Array.from({ length: MAX_PIXELS }, (_, i) => {
    const from = Math.floor((i * songs.length) / MAX_PIXELS);
    const to = Math.floor(((i + 1) * songs.length) / MAX_PIXELS);
    const slice = songs.slice(from, Math.max(to, from + 1));
    if (slice.some((s) => s.status === "searching")) return "searching";
    if (slice.some((s) => s.status === "pending")) return "idle";
    if (slice.some((s) => s.status === "found")) return "found";
    if (slice.some((s) => s.status === "error")) return "error";
    return "none";
  });
}

/** Cronómetro en marcha: solo se repinta él. */
function Running({ since, base, locale }: { since: number; base: number; locale: string }) {
  const [now, setNow] = useState(since);
  useEffect(() => {
    const timer = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(timer);
  }, []);
  return <>{seconds(base + Math.max(0, now - since), locale)}</>;
}

function Line({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="w-[10ch] flex-none text-smoke">{label}</dt>
      <dd className={`min-w-0 truncate ${strong ? "text-saber" : "text-bone"}`}>{children}</dd>
    </div>
  );
}

const swatches = ["bg-line-strong", "bg-edge", "bg-smoke", "bg-ash", "bg-bone", "bg-saber-deep", "bg-saber", "bg-ember"];

export function StatusBlock({ scan, quest }: { scan: ScanState; quest: QuestPhase }) {
  const t = useT();
  const { songs, phase, playlist } = scan;

  const stats = useMemo(() => {
    let withMap = 0;
    let withoutMap = 0;
    let maps = 0;
    for (const song of songs) {
      if (song.status === "found") withMap++;
      else if (song.status === "none") withoutMap++;
      maps += song.maps.length;
    }
    return { withMap, withoutMap, maps, done: withMap + withoutMap };
  }, [songs]);

  const pixels = useMemo<PixelState[]>(
    () => (songs.length > 0 ? pixelsFor(songs) : Array<PixelState>(IDLE_PIXELS).fill("idle")),
    [songs],
  );

  // Pocas canciones, cuadrados grandes; muchas, pequeños. El bloque mide lo mismo.
  const cols = Math.min(12, Math.max(4, Math.ceil(Math.sqrt(pixels.length))));
  const side = Math.floor((BLOCK - (cols - 1) * GAP) / cols);

  const blank = <span className="text-smoke">--</span>;
  const has = songs.length > 0;
  const n = (value: number) => count(value, t.locale);

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
      <div
        className="pixels"
        role="img"
        aria-label={t.status.blockLabel(stats.done, songs.length)}
        style={{ "--cols": cols, "--side": `${side}px` } as React.CSSProperties}
      >
        {pixels.map((state, i) => (
          <span key={i} className="pixel" data-state={state} />
        ))}
      </div>

      <div className="min-w-0 flex-1 text-body">
        <p className="text-bone">
          {t.status.you}
          <span className="text-smoke">@</span>slicelist
        </p>
        <p aria-hidden="true" className="select-none overflow-hidden whitespace-nowrap text-line-strong">
          {"-".repeat(40)}
        </p>
        <dl>
          <Line label={t.status.playlist}>
            {playlist ? (
              playlist.title
            ) : phase === "reading" ? (
              <span className="text-ash">{t.status.reading}</span>
            ) : (
              <span className="text-smoke">{t.status.nothing}</span>
            )}
          </Line>
          <Line label={t.status.songs}>
            {has ? (
              <>
                {n(songs.length)}
                {playlist?.truncated && (
                  <span className="text-smoke"> / {t.status.truncated(songs.length)}</span>
                )}
              </>
            ) : (
              blank
            )}
          </Line>
          <Line label={t.status.withMap} strong={has}>
            {has ? n(stats.withMap) : blank}
          </Line>
          <Line label={t.status.withoutMap}>{has ? n(stats.withoutMap) : blank}</Line>
          <Line label={t.status.maps}>{has ? n(stats.maps) : blank}</Line>
          <Line label={t.status.took}>
            {scan.startedAt !== null ? (
              <>
                <Running since={scan.startedAt} base={scan.elapsedMs ?? 0} locale={t.locale} /> s
              </>
            ) : scan.elapsedMs !== null && has ? (
              t.status.seconds(seconds(scan.elapsedMs, t.locale))
            ) : (
              blank
            )}
          </Line>
          <Line label={t.status.headset}>
            <span className={quest === "connected" ? "text-bone" : "text-ash"}>
              {t.headsetStatus[quest]}
            </span>
          </Line>
        </dl>
        <div className="mt-4 flex gap-[3px]" aria-hidden="true">
          {swatches.map((bg) => (
            <span key={bg} className={`h-3 w-6 ${bg}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
