"use client";

import { memo, useState } from "react";
import { Cover } from "@/components/Cover";
import { ChevronGlyph, OutGlyph } from "@/components/Glyphs";
import { SquareMarker } from "@/components/grid/SquareMarker";
import { ViewfinderCorners } from "@/components/grid/ViewfinderCorners";
import { MapRow } from "@/components/MapRow";
import { usePreviewPlayer } from "@/hooks/usePreviewPlayer";
import { useQuest } from "@/hooks/useQuest";
import { useT } from "@/lib/i18n";
import type { BeatMap, Song } from "@/lib/types";

function Maps({ maps }: { maps: BeatMap[] }) {
  const player = usePreviewPlayer();
  const quest = useQuest();
  const canSend = quest.view.phase !== "unsupported";

  return (
    <ul>
      {maps.map((map) => (
        <MapRow
          key={map.id}
          map={map}
          playing={player.playing && player.current?.id === map.id}
          onListen={() => player.toggle(map)}
          canSend={canSend}
          sendStatus={quest.statusOf(map)}
          onSend={() => quest.send(map)}
        />
      ))}
    </ul>
  );
}

/** Contenido de una canción. Quien la usa pone el `<li className="song">`. */
export const SongRow = memo(function SongRow({
  song,
  open,
  onToggle,
  onRetry,
}: {
  song: Song;
  open: boolean;
  onToggle(id: string): void;
  onRetry(id: string): void;
}) {
  const t = useT();
  const player = usePreviewPlayer();
  // Los mapas se montan la primera vez que se abre y ya se quedan,
  // para que el cierre también se anime.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  const expandable = song.maps.length + song.others.length > 0;
  const sounding =
    player.playing &&
    !!player.current &&
    (song.maps.some((m) => m.id === player.current?.id) ||
      song.others.some((m) => m.id === player.current?.id));
  const panelId = `maps-${song.id}`;

  const summary = (
    <>
      <span className="text-meta text-smoke" aria-label={t.list.position(song.position)}>
        {String(song.position).padStart(2, "0")}
      </span>
      <ViewfinderCorners active={open || sounding}>
        <Cover src={song.thumb} title={song.title} size={48} />
      </ViewfinderCorners>
      <span className="min-w-0">
        <span className="block truncate text-title font-medium text-bone">{song.title}</span>
        <span className="block truncate text-meta text-ash">{song.artists.join(", ")}</span>
      </span>
    </>
  );

  const versions = song.others.length > 0 && (
    <span className="hidden text-meta text-smoke sm:block">{t.song.versions(song.others.length)}</span>
  );

  return (
    <>
      {expandable ? (
        <button
          type="button"
          className="song__head framing-host"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onToggle(song.id)}
        >
          {summary}
          <span className="flex items-center gap-4">
            <span className="text-right">
              <span className={`block text-body ${song.maps.length > 0 ? "text-bone" : "text-smoke"}`}>
                {song.maps.length > 0 ? t.song.maps(song.maps.length) : t.song.noMap}
              </span>
              {versions}
            </span>
            <span className="chevron text-ash">
              <ChevronGlyph />
            </span>
          </span>
        </button>
      ) : (
        <div className="song__head">
          {summary}
          {song.status === "error" ? (
            <span className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex items-center gap-2 text-meta text-ember">
                <SquareMarker state="error" />
                {t.song.failed}
              </span>
              <button type="button" className="btn" onClick={() => onRetry(song.id)}>
                {t.song.retry}
              </button>
            </span>
          ) : song.status === "searching" || song.status === "pending" ? (
            <span className="flex items-center gap-2 text-meta text-ash">
              <SquareMarker state={song.status === "searching" ? "searching" : "idle"} />
              {song.status === "searching" && t.song.searching}
            </span>
          ) : (
            <a
              className="btn btn--bare"
              href={`https://beatsaver.com/?q=${encodeURIComponent(`${song.artists[0] ?? ""} ${song.title}`.trim())}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`${t.song.searchElsewhere}: ${song.title}`}
              title={t.song.searchElsewhere}
            >
              <span className="hidden md:inline">{t.song.searchElsewhere}</span>
              <span className="md:hidden">BeatSaver</span>
              <OutGlyph />
            </a>
          )}
        </div>
      )}

      {expandable && (
        <div className="reveal bg-ink-1" data-open={open} id={panelId} inert={!open}>
          <div>
            {mounted && (
              <div className="px-[var(--cell-pad)] pb-2 md:pl-[calc(var(--cell-pad)+3ch+var(--s-4))]">
                {song.maps.length > 0 && <Maps maps={song.maps} />}
                {song.others.length > 0 && (
                  <section className={song.maps.length > 0 ? "border-t border-line pt-4" : ""}>
                    <h3 className="text-meta text-bone">{t.song.others(song.others.length)}</h3>
                    <p className="text-meta text-smoke">{t.song.othersHint}</p>
                    <Maps maps={song.others} />
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});
