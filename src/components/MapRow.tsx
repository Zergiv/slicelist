"use client";

import { Cover } from "@/components/Cover";
import {
  DownGlyph,
  DownloadGlyph,
  OutGlyph,
  PauseGlyph,
  PlayGlyph,
  UpGlyph,
} from "@/components/Glyphs";
import { ViewfinderCorners } from "@/components/grid/ViewfinderCorners";
import { SendButton } from "@/components/SendButton";
import { bpm, clock, count, percent } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { SendStatus } from "@/lib/quest/types";
import type { BeatMap, MapDiff } from "@/lib/types";

const ORDER = ["Easy", "Normal", "Hard", "Expert", "ExpertPlus"] as const;
const SHORT: Record<string, string> = { ExpertPlus: "Expert+" };
const DIFF_CLASS: Record<string, string> = {
  Easy: "tag--diff tag--easy",
  Normal: "tag--diff tag--normal",
  Hard: "tag--diff tag--hard",
  Expert: "tag--diff tag--expert",
  ExpertPlus: "tag--diff tag--expert-plus",
};

/** Dificultades del modo normal; si no lo tiene, las del primer modo que traiga. */
function difficulties(diffs: MapDiff[]): string[] {
  const standard = diffs.filter((d) => d.characteristic === "Standard");
  const pool =
    standard.length > 0
      ? standard
      : diffs.filter((d) => d.characteristic === diffs[0]?.characteristic);
  return [...new Set(pool.map((d) => d.difficulty))]
    .sort((a, b) => ORDER.indexOf(a as (typeof ORDER)[number]) - ORDER.indexOf(b as (typeof ORDER)[number]));
}

function scoreTone(score: number): string {
  if (score >= 0.9) return "score score--high";
  if (score >= 0.7) return "score score--mid";
  return "score score--low";
}

export function MapRow({
  map,
  playing,
  onListen,
  sendStatus,
  onSend,
  canSend,
}: {
  map: BeatMap;
  /** Su vista previa está cargada. */
  playing: boolean;
  onListen(): void;
  sendStatus: SendStatus | null;
  onSend(): void;
  /** El navegador puede hablar con el visor. */
  canSend: boolean;
}) {
  const t = useT();
  const title = map.songName || map.name;
  const diffs = difficulties(map.diffs);

  return (
    <li className="map flex flex-col gap-4 py-4 xl:flex-row xl:items-center xl:gap-6">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <ViewfinderCorners active={playing} className="mt-1">
          <Cover src={map.coverURL} title={title} size={56} />
        </ViewfinderCorners>

        <div className="min-w-0 flex-1">
          <p className="truncate text-body text-bone">
            {title}
            {map.songSubName && <span className="text-smoke"> {map.songSubName}</span>}
          </p>
          <p className="truncate text-meta text-ash">
            {map.songAuthor && <>{map.songAuthor} / </>}
            {t.map.by} {map.mapper}
          </p>

          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-ash">
            <span className={scoreTone(map.score)}>
              <span className="sr-only">{t.map.score}: </span>
              {percent(map.score, t.locale)}
            </span>
            <span className="inline-flex items-center gap-1 text-bone">
              <UpGlyph />
              <span className="sr-only">{t.map.upvotes}: </span>
              {count(map.upvotes, t.locale)}
            </span>
            <span className="inline-flex items-center gap-1 text-smoke">
              <DownGlyph />
              <span className="sr-only">{t.map.downvotes}: </span>
              {count(map.downvotes, t.locale)}
            </span>
            <span>{clock(map.durationSeconds)}</span>
            <span>{bpm(map.bpm)}</span>
          </p>

          <ul className="mt-2 flex flex-wrap gap-1" aria-label={t.map.difficulties}>
            {map.version && <li className="tag tag--strong">{t.version[map.version]}</li>}
            {map.curated && <li className="tag tag--strong">{t.map.curated}</li>}
            {map.ranked && <li className="tag tag--strong">{t.map.ranked}</li>}
            {diffs.map((d) => (
              <li key={d} className={`tag ${DIFF_CLASS[d] ?? ""}`}>
                {SHORT[d] ?? d}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-none flex-wrap items-center gap-2 xl:flex-nowrap xl:justify-end">
        <button type="button" className="btn" onClick={onListen} aria-pressed={playing}>
          {playing ? <PauseGlyph /> : <PlayGlyph />}
          {playing ? t.map.pause : t.map.listen}
        </button>
        {canSend && <SendButton status={sendStatus} onSend={onSend} />}
        <a className="btn btn--bare" href={map.downloadURL} download>
          <DownloadGlyph />
          {t.map.download}
        </a>
        <a
          className="btn btn--bare"
          href={`https://beatsaver.com/maps/${map.id}`}
          target="_blank"
          rel="noreferrer"
        >
          {t.map.view}
          <OutGlyph />
        </a>
      </div>
    </li>
  );
}
