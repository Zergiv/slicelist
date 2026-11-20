"use client";

import { useId, useState } from "react";
import { SquareMarker } from "@/components/grid/SquareMarker";
import { useT } from "@/lib/i18n";
import type { ApiErrorCode } from "@/lib/types";

export function PlaylistInput({
  busy,
  error,
  initialLink = "",
  onSubmit,
  onStop,
  onExample,
  showExample = true,
}: {
  /** Hay una búsqueda en marcha. */
  busy: boolean;
  error: ApiErrorCode | null;
  initialLink?: string;
  onSubmit(link: string): void;
  onStop(): void;
  onExample(): void;
  /** Enseñar el enlace a la playlist de ejemplo bajo el campo. */
  showExample?: boolean;
}) {
  const t = useT();
  const id = useId();
  const [link, setLink] = useState(initialLink);
  const [seen, setSeen] = useState(initialLink);

  // Si la página trae un enlace compartido, el campo lo enseña.
  if (initialLink !== seen) {
    setSeen(initialLink);
    setLink(initialLink);
  }

  const invalid = error === "bad_link" || error === "not_playlist";

  return (
    <div>
      <p className="max-w-[46ch] text-lead text-bone">{t.input.lead}</p>

      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) onStop();
          else if (link.trim()) onSubmit(link.trim());
        }}
      >
        <label htmlFor={id} className="sr-only">
          {t.input.label}
        </label>
        <input
          id={id}
          className="field"
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t.input.placeholder}
          value={link}
          onChange={(event) => setLink(event.target.value)}
          aria-invalid={invalid}
          aria-describedby={`${id}-help`}
        />
        {busy ? (
          <button type="submit" className="btn btn--big flex-none">
            {t.input.stop}
          </button>
        ) : (
          <button type="submit" className="btn btn--solid btn--big flex-none" disabled={!link.trim()}>
            {t.input.submit}
          </button>
        )}
      </form>

      <div id={`${id}-help`} className="mt-3 min-h-[3lh] text-meta sm:min-h-[2lh]">
        {invalid && error ? (
          <p role="alert" className="flex items-start gap-2 text-ember">
            <SquareMarker state="error" className="mt-[5px]" />
            <span className="max-w-[60ch]">{t.errors[error]}</span>
          </p>
        ) : (
          <p className="text-smoke">{t.input.hint}</p>
        )}
        {!busy && showExample && (
          <button type="button" className="link mt-1 text-meta" onClick={onExample}>
            {t.input.example}
          </button>
        )}
      </div>
    </div>
  );
}
