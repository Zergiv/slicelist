"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import type { SongHint } from "@/lib/suggest/itunes";

export type LookupTrack = {
  title: string;
  artists: string[];
  thumb?: string;
  album?: string;
  videoId?: string;
  videoType?: string;
  durationSeconds?: number;
};

export function SongLookup({
  busy,
  onLookup,
}: {
  busy: boolean;
  onLookup(track: LookupTrack): void;
}) {
  const t = useT();
  const id = useId();
  const listId = `${id}-list`;
  const [q, setQ] = useState("");
  const [hints, setHints] = useState<SongHint[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  /** Tras elegir/resolver: no sugerir de nuevo hasta que el usuario edite. */
  const [locked, setLocked] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (locked || busy) {
      abort.current?.abort();
      setOpen(false);
      if (locked) {
        setHints([]);
        setActive(-1);
      }
      return;
    }

    const term = q.trim();
    if (term.length < 2) {
      setHints([]);
      setOpen(false);
      setEmpty(false);
      return;
    }
    // Enlaces: no hace falta sugerir.
    if (/^https?:\/\//i.test(term) || /^spotify:track:/i.test(term)) {
      setHints([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const body = (await res.json().catch(() => null)) as { suggestions?: SongHint[] } | null;
        if (ctrl.signal.aborted) return;
        const list = body?.suggestions ?? [];
        setHints(list);
        setOpen(list.length > 0);
        setActive(list.length > 0 ? 0 : -1);
      } catch {
        if (!ctrl.signal.aborted) {
          setHints([]);
          setOpen(false);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [q, busy, locked]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (hint: SongHint) => {
    abort.current?.abort();
    setLocked(true);
    setQ(`${hint.title} · ${hint.artists.join(", ")}`);
    setOpen(false);
    setHints([]);
    setActive(-1);
    onLookup(hint);
  };

  const submit = async () => {
    const term = q.trim();
    if (!term || busy || loading) return;
    setLoading(true);
    setEmpty(false);
    setOpen(false);
    try {
      if (!locked && active >= 0 && hints[active]) {
        pick(hints[active]);
        return;
      }
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: term }),
      });
      const body = (await res.json().catch(() => null)) as
        | { track?: LookupTrack; error?: string }
        | null;
      if (!res.ok || !body?.track?.title) {
        setEmpty(true);
        return;
      }
      abort.current?.abort();
      setLocked(true);
      setHints([]);
      setActive(-1);
      onLookup(body.track);
    } catch {
      setEmpty(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={wrap} className="relative mt-5 border-t border-line pt-4">
      <p className="text-meta text-smoke">{t.input.lookupLabel}</p>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label htmlFor={id} className="sr-only">
          {t.input.lookupLabel}
        </label>
        <input
          id={id}
          className="field !min-h-10 !text-meta"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          placeholder={t.input.lookupPlaceholder}
          value={q}
          disabled={busy}
          onChange={(event) => {
            setLocked(false);
            setQ(event.target.value);
            setEmpty(false);
          }}
          onFocus={() => {
            if (!locked && hints.length > 0) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (!open || hints.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((i) => (i + 1) % hints.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) => (i <= 0 ? hints.length - 1 : i - 1));
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <button
          type="submit"
          className="btn !min-h-10 flex-none !px-3 !text-meta"
          disabled={busy || loading || !q.trim()}
        >
          {t.input.lookupSubmit}
        </button>
      </form>
      <p className="mt-2 text-meta text-smoke">{empty ? t.input.lookupEmpty : t.input.lookupHint}</p>

      {open && hints.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto border border-line-strong bg-ink-1 py-1 shadow-lg"
        >
          {hints.map((hint, i) => (
            <li key={`${hint.title}-${hint.artists[0]}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                id={`${listId}-${i}`}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-meta ${
                  i === active ? "bg-ink-2 text-bone" : "text-ash"
                }`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(event) => {
                  // Evita robo de foco del input (patrón combobox).
                  event.preventDefault();
                  pick(hint);
                }}
              >
                {hint.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hint.thumb} alt="" className="h-8 w-8 flex-none rounded-xs object-cover" />
                ) : (
                  <span className="h-8 w-8 flex-none rounded-xs border border-line" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-bone">{hint.title}</span>
                  <span className="block truncate text-smoke">{hint.artists.join(", ")}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
