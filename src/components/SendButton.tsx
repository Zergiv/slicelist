"use client";

import { CheckGlyph, HeadsetGlyph } from "@/components/Glyphs";
import { useT } from "@/lib/i18n";
import type { SendStatus } from "@/lib/quest/types";

/** Botón "Añadir al visor": se rellena con el avance real del envío. */
export function SendButton({
  status,
  onSend,
  className = "",
}: {
  status: SendStatus | null;
  onSend(): void;
  className?: string;
}) {
  const t = useT();
  const state = status?.state ?? "idle";
  const percent = Math.round((status?.progress ?? 0) * 100);
  const locked = state === "queued" || state === "sending" || state === "done";

  const label =
    state === "queued"
      ? t.send.queued
      : state === "sending"
        ? t.send.sending(percent)
        : state === "done"
          ? t.send.done
          : state === "failed"
            ? t.send.failed
            : t.send.idle;

  return (
    <button
      type="button"
      className={`btn send ${className}`}
      data-state={state}
      // Sigue siendo enfocable para que el lector de pantalla lea el estado.
      aria-disabled={locked || undefined}
      onClick={() => {
        if (!locked) onSend();
      }}
      style={{ "--progress": state === "sending" ? status?.progress ?? 0 : 0 } as React.CSSProperties}
    >
      <span className="send__fill" aria-hidden="true" />
      <span className="send__label">
        {state === "done" ? <CheckGlyph /> : <HeadsetGlyph />}
        {label}
      </span>
      {/* Solo se anuncia el final, no cada tanto por ciento. */}
      <span className="sr-only" role="status">
        {state === "done" ? t.send.done : state === "failed" ? t.send.failed : ""}
      </span>
    </button>
  );
}
