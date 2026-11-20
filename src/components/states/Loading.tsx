"use client";

import { SquareMarker } from "@/components/grid/SquareMarker";
import { useT } from "@/lib/i18n";

/** Mientras se lee la playlist: filas quietas y un marcador que late. */
export function Loading() {
  const t = useT();
  return (
    <div>
      <p className="flex items-center gap-3 px-[var(--cell-pad)] py-4 text-meta text-ash" role="status">
        <SquareMarker state="searching" />
        {t.list.reading}
      </p>
      <ul aria-hidden="true">
        {[58, 34, 47, 66, 41].map((width, i) => (
          <li key={width} className="song">
            <div className="song__head">
              <span className="text-meta text-line-strong">{String(i + 1).padStart(2, "0")}</span>
              <span className="h-12 w-12 rounded-m bg-ink-1" />
              <span>
                <span className="block h-3 rounded-xs bg-ink-2" style={{ width: `${width}%` }} />
                <span className="mt-2 block h-2 rounded-xs bg-ink-1" style={{ width: `${width / 2}%` }} />
              </span>
              <span />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
