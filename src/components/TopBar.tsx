"use client";

import { useSyncExternalStore } from "react";
import { OutGlyph, StarGlyph } from "@/components/Glyphs";
import { Cell } from "@/components/grid/Frame";
import { SquareMarker } from "@/components/grid/SquareMarker";
import type { ScanPhase } from "@/hooks/useScan";
import { useI18n, type Lang } from "@/lib/i18n";

const REPO = "https://github.com/Zergiv/slicelist";

function subscribeMinute(onChange: () => void) {
  const timer = setInterval(onChange, 15_000);
  return () => clearInterval(timer);
}

function localTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** La hora de quien mira. Solo existe en el navegador. */
function LocalClock({ label }: { label: string }) {
  const time = useSyncExternalStore(subscribeMinute, localTime, () => "");
  return (
    <p className="hidden text-meta text-smoke sm:block">
      {label} <span className="text-ash">{time || "--:--"}</span>
    </p>
  );
}

const langs: Lang[] = ["es", "en"];

export function TopBar({ phase }: { phase: ScanPhase }) {
  const { t, lang, setLang } = useI18n();
  const marker =
    phase === "reading" || phase === "scanning"
      ? "searching"
      : phase === "error"
        ? "error"
        : "found";

  return (
    <Cell as="header" className="flex items-center justify-between gap-4 !py-3">
      <p className="flex items-center gap-3 text-meta text-bone">
        <SquareMarker state={marker} />
        slicelist
      </p>
      <div className="flex items-center gap-4 sm:gap-6">
        <LocalClock label={t.top.localTime} />
        <div className="flex items-center gap-1">
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="btn btn--bare !min-h-9 gap-2 !px-2"
          >
            <OutGlyph />
            {t.top.source}
          </a>
          <a
            href={`${REPO}/stargazers`}
            target="_blank"
            rel="noreferrer"
            className="btn btn--bare !min-h-9 gap-2 !px-2"
          >
            <StarGlyph />
            {t.top.star}
          </a>
        </div>
        <div role="group" aria-label={t.top.language} className="flex items-center text-meta">
          {langs.map((code, i) => (
            <span key={code} className="flex items-center">
              {i > 0 && (
                <span aria-hidden="true" className="text-line-strong">
                  /
                </span>
              )}
              <button
                type="button"
                lang={code}
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
                className={`btn btn--bare !min-h-9 !px-2 ${lang === code ? "!text-bone" : ""}`}
              >
                {code}
              </button>
            </span>
          ))}
        </div>
      </div>
    </Cell>
  );
}
