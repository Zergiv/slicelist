"use client";

import { SquareMarker } from "@/components/grid/SquareMarker";
import type { SongFilter } from "@/components/SongList";
import { useT } from "@/lib/i18n";

/** "con mapa / sin mapa": qué grupo de canciones enseña la lista. */
export function Filters({
  value,
  withMap,
  withoutMap,
  onChange,
}: {
  value: SongFilter;
  withMap: number;
  withoutMap: number;
  onChange(value: SongFilter): void;
}) {
  const t = useT();
  const options: { key: SongFilter; label: string; n: number }[] = [
    { key: "with", label: t.filters.withMap, n: withMap },
    { key: "without", label: t.filters.withoutMap, n: withoutMap },
  ];

  return (
    <div role="group" aria-label={t.filters.label} className="flex gap-8 lg:block">
      {options.map((option) => {
        const selected = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            className="filter"
            aria-pressed={selected}
            onClick={() => onChange(option.key)}
          >
            <span className="flex items-center gap-3 text-body">
              <SquareMarker state={selected ? (option.key === "with" ? "found" : "none") : "idle"} />
              {option.label}
            </span>
            <span className="font-display text-num font-extrabold">
              {String(option.n).padStart(2, "0")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
