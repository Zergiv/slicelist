"use client";

import { useT } from "@/lib/i18n";

/** Antes de pegar nada: tres filas vacías que enseñan lo que vendrá. */
export function Empty({ onExample }: { onExample(): void }) {
  const t = useT();
  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center">
      <div>
        <p className="max-w-[24ch] text-title font-medium text-bone">{t.list.emptyTitle}</p>
        <button type="button" className="btn mt-6" onClick={onExample}>
          {t.input.example}
        </button>
      </div>
      <ul aria-hidden="true">
        {[62, 38, 51].map((width, i) => (
          <li key={width} className="flex items-center gap-4 border-t border-line py-3 first:border-t-0">
            <span className="text-meta text-line-strong">{String(i + 1).padStart(2, "0")}</span>
            <span className="h-12 w-12 flex-none rounded-m border border-dashed border-line-strong" />
            <span className="flex-1">
              <span className="block h-3 rounded-xs bg-ink-2" style={{ width: `${width}%` }} />
              <span className="mt-2 block h-2 rounded-xs bg-ink-1" style={{ width: `${width / 2}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
