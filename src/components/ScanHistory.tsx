"use client";

import { useId, useState } from "react";
import { ChevronGlyph } from "@/components/Glyphs";
import { useT } from "@/lib/i18n";
import { entryKey, type HistoryEntry } from "@/lib/history/store";

export function ScanHistory({
  entries,
  busy,
  onOpen,
  onRemove,
  onClear,
}: {
  entries: readonly HistoryEntry[];
  busy: boolean;
  onOpen(entry: HistoryEntry): void;
  onRemove(entry: HistoryEntry): void;
  onClear(): void;
}) {
  const t = useT();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  // Se monta al abrir y se queda, para que el cierre también se anime.
  const [mounted, setMounted] = useState(false);
  const [wave, setWave] = useState(0);
  if (open && !mounted) setMounted(true);

  if (busy || entries.length === 0) return null;

  return (
    <div className="mt-5 border-t border-line pt-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left text-meta text-smoke"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() =>
          setOpen((v) => {
            if (!v) setWave((n) => n + 1);
            return !v;
          })
        }
      >
        <span>
          {t.history.title}
          <span className="ml-2 text-ash">{entries.length}</span>
        </span>
        <span className="chevron text-ash">
          <ChevronGlyph />
        </span>
      </button>

      <div className="reveal" data-open={open} id={panelId} inert={!open}>
        <div>
          {mounted && (
            <div className="pt-2">
              <div className="mb-2 flex justify-end">
                <button type="button" className="link text-meta" onClick={onClear}>
                  {t.history.clear}
                </button>
              </div>
              <ul className="max-h-56 overflow-auto border border-line">
                {entries.map((entry, i) => {
                  const key = entryKey(entry);
                  const meta =
                    entry.kind === "playlist"
                      ? t.history.playlist
                      : entry.artists.length > 0
                        ? `${t.history.song} · ${entry.artists.join(", ")}`
                        : t.history.song;
                  return (
                    <li
                      key={`${wave}-${key}`}
                      className="flex items-stretch border-b border-line last:border-b-0"
                      style={{
                        animation: `history-in 320ms var(--ease-out) ${Math.min(i, 8) * 28}ms both`,
                      }}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left text-meta text-ash"
                        onClick={() => onOpen(entry)}
                      >
                        {entry.thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.thumb}
                            alt=""
                            className="h-8 w-8 flex-none rounded-xs object-cover"
                          />
                        ) : (
                          <span className="h-8 w-8 flex-none rounded-xs border border-line" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-bone">{entry.title}</span>
                          <span className="block truncate text-smoke">{meta}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="flex-none px-3 text-meta text-smoke"
                        aria-label={t.history.remove}
                        onClick={() => onRemove(entry)}
                      >
                        {t.history.remove}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
