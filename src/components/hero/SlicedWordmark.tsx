"use client";

import { useState } from "react";

/**
 * El titular: "slicelist" cortado en diagonal. Es el único momento
 * orquestado de la página y ocurre una vez, al cargar. Con movimiento
 * reducido aparece ya cortado (lo resuelve el CSS).
 */
export function SlicedWordmark({ replayable = false }: { replayable?: boolean }) {
  const [run, setRun] = useState(0);

  const mark = (
    <h1 key={run} className="wordmark" data-play="true">
      <span className="sr-only">slicelist</span>
      <span className="wordmark__half wordmark__half--top" aria-hidden="true">
        slicelist
      </span>
      <span className="wordmark__half wordmark__half--bottom" aria-hidden="true">
        slicelist
      </span>
      <svg
        className="wordmark__blade"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Los extremos coinciden con --cut-l y --cut-r del CSS. */}
        <line x1="-5" y1="70" x2="105" y2="24" pathLength={1} />
      </svg>
    </h1>
  );

  if (!replayable) return mark;

  return (
    <div>
      {mark}
      <div className="mt-6">
        <button type="button" className="btn" onClick={() => setRun((n) => n + 1)}>
          Repetir el corte
        </button>
      </div>
    </div>
  );
}
