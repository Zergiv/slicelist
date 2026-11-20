"use client";

import { motion } from "motion/react";
import { SquareMarker } from "@/components/grid/SquareMarker";
import { SongRow } from "@/components/SongRow";
import type { ScanPhase } from "@/hooks/useScan";
import { useT } from "@/lib/i18n";
import type { Song } from "@/lib/types";

export type SongFilter = "with" | "without";

function Note({ children }: { children: React.ReactNode }) {
  return <p className="px-[var(--cell-pad)] py-6 text-body text-ash">{children}</p>;
}

export function SongList({
  songs,
  filter,
  phase,
  openIds,
  onToggle,
  onRetry,
  onResume,
}: {
  songs: Song[];
  filter: SongFilter;
  phase: ScanPhase;
  openIds: ReadonlySet<string>;
  onToggle(id: string): void;
  onRetry(id: string): void;
  onResume(): void;
}) {
  const t = useT();
  const scanning = phase === "scanning";

  const shown = songs.filter((s) => (filter === "with" ? s.status === "found" : s.status === "none"));
  const failed = songs.filter((s) => s.status === "error");
  const pending = songs.filter((s) => s.status === "pending" || s.status === "searching").length;
  const resolved = songs.length - pending;

  return (
    <div>
      {filter === "without" && shown.length > 0 && (
        <p className="border-b border-line px-[var(--cell-pad)] py-3 text-meta text-smoke">
          {t.list.withoutMapLead}
        </p>
      )}

      {shown.length === 0 && (
        <Note>
          {filter === "with"
            ? scanning
              ? t.list.noneWithMapScanning
              : t.list.noneWithMap
            : scanning
              ? t.list.noneWithMapScanning
              : t.list.allHaveMap}
        </Note>
      )}

      <ul>
        {shown.map((song) => (
          <motion.li
            key={song.id}
            id={`song-${song.id}`}
            className="song scroll-mt-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
          >
            <SongRow
              song={song}
              open={openIds.has(song.id)}
              onToggle={onToggle}
              onRetry={onRetry}
            />
          </motion.li>
        ))}
      </ul>

      {/* Lo que sigue en marcha o necesita una mano va al final. */}
      {scanning && (
        <p
          className="flex items-center gap-3 border-t border-line px-[var(--cell-pad)] py-4 text-meta text-ash"
          role="status"
        >
          <SquareMarker state="searching" />
          {t.list.scanning(resolved, songs.length)}
        </p>
      )}

      {!scanning && pending > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-[var(--cell-pad)] py-4">
          <p className="text-meta text-ash">{t.list.pendingLeft(pending)}</p>
          <button type="button" className="btn" onClick={onResume}>
            {t.list.resume}
          </button>
        </div>
      )}

      {failed.length > 0 && (
        <section className="border-t border-line">
          <div className="flex flex-wrap items-center justify-between gap-3 px-[var(--cell-pad)] py-3">
            <h3 className="text-meta text-ember">{t.list.failedLead(failed.length)}</h3>
            {!scanning && failed.length > 1 && (
              <button type="button" className="btn" onClick={onResume}>
                {t.list.retryAll}
              </button>
            )}
          </div>
          <ul className="border-t border-line">
            {failed.map((song) => (
              <li key={song.id} className="song">
                <SongRow song={song} open={false} onToggle={onToggle} onRetry={onRetry} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
