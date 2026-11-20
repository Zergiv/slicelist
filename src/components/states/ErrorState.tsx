"use client";

import { SquareMarker } from "@/components/grid/SquareMarker";
import { useT } from "@/lib/i18n";
import type { ApiErrorCode } from "@/lib/types";

/** La playlist no se ha podido leer: qué ha pasado y qué hacer. */
export function ErrorState({ code, onRetry }: { code: ApiErrorCode; onRetry?: () => void }) {
  const t = useT();
  // Reintentar solo sirve cuando el fallo no depende de la playlist.
  const retriable = code === "busy" || code === "upstream" || code === "too_many";
  return (
    <div role="alert">
      <p className="flex items-start gap-3 text-title font-medium text-bone">
        <SquareMarker state="error" className="mt-[10px]" />
        <span className="max-w-[32ch]">{t.errors[code]}</span>
      </p>
      {retriable && onRetry && (
        <button type="button" className="btn mt-6" onClick={onRetry}>
          {t.list.retry}
        </button>
      )}
    </div>
  );
}
