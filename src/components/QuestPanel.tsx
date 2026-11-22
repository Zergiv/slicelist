"use client";

import { HeadsetGlyph } from "@/components/Glyphs";
import { SquareMarker } from "@/components/grid/SquareMarker";
import { useT } from "@/lib/i18n";
import type { QuestView } from "@/lib/quest/types";

/** Panel del visor: conectar, ver cómo va y mandar el mejor de cada canción. */
export function QuestPanel({
  view,
  bestCount,
  mappedCount,
  onConnect,
  onDisconnect,
  onSendBest,
  onStopBatch,
}: {
  view: QuestView;
  /** Cuántos mapas mandaría "Añadir el mejor de cada canción". */
  bestCount: number;
  /** Cuántas canciones de la lista tienen mapa. */
  mappedCount: number;
  onConnect(): void;
  onDisconnect(): void;
  onSendBest(): void;
  onStopBatch(): void;
}) {
  const t = useT();
  const { phase, batch } = view;

  const marker =
    phase === "connected"
      ? "found"
      : phase === "connecting" || phase === "authorizing"
        ? "searching"
        : phase === "error" || phase === "busy" || phase === "notModded"
          ? "error"
          : "idle";

  const message =
    phase === "unsupported"
      ? t.quest.unsupported
      : phase === "connecting"
        ? t.quest.connecting
        : phase === "authorizing"
          ? t.quest.authorizing
          : phase === "connected"
            ? t.quest.connected(view.deviceName || t.quest.fallbackName, view.installedCount)
            : phase === "notModded"
              ? t.quest.notModded
              : phase === "busy"
                ? t.quest.busy
                : phase === "error"
                  ? t.quest.lost
                  : t.quest.idle;

  const waiting = phase === "connecting" || phase === "authorizing";
  const problem = phase === "error" || phase === "busy" || phase === "notModded";

  return (
    <div>
      <h2 className="flex items-center gap-2 text-meta text-smoke">
        <SquareMarker state={marker} />
        <HeadsetGlyph />
        {t.quest.title}
      </h2>

      <p className={`mt-3 text-body ${problem ? "text-bone" : "text-ash"}`} role="status">
        {message}
      </p>

      {(phase === "idle" || problem) && (
        <button type="button" className="btn mt-4" onClick={onConnect}>
          <HeadsetGlyph />
          {problem ? t.quest.retry : t.quest.connect}
        </button>
      )}

      {waiting && (
        <button type="button" className="btn mt-4" disabled>
          <HeadsetGlyph />
          {t.quest.connect}
        </button>
      )}

      {phase === "connected" && (
        <div className="mt-4">
          {batch?.running ? (
            <div>
              <div className="flex items-center justify-between gap-3 text-meta">
                <p className="text-bone" role="status">
                  {t.quest.batchProgress(batch.done, batch.total)}
                </p>
                <button type="button" className="btn" onClick={onStopBatch}>
                  {t.quest.stop}
                </button>
              </div>
              <div className="bar mt-3" aria-hidden="true">
                <div
                  className="bar__fill"
                  data-smooth="true"
                  style={{ "--progress": batch.total ? batch.done / batch.total : 0 } as React.CSSProperties}
                />
              </div>
            </div>
          ) : (
            <>
              {batch && batch.done > 0 && (
                <p className="mb-4 text-body text-bone" role="status">
                  {batch.failed > 0 ? t.quest.doneWithFailures(batch.failed) : t.quest.done}
                </p>
              )}
              {bestCount > 0 ? (
                <button
                  type="button"
                  className="btn btn--solid w-full !justify-between !whitespace-normal py-2 text-left"
                  onClick={onSendBest}
                >
                  {t.quest.sendBest}
                  <span className="flex-none font-display text-title font-black">{bestCount}</span>
                </button>
              ) : (
                !batch && mappedCount > 0 && (
                  <p className="text-meta text-smoke">{t.quest.nothingToSend}</p>
                )
              )}
            </>
          )}
          <button type="button" className="link mt-4 block text-meta" onClick={onDisconnect}>
            {t.quest.disconnect}
          </button>
        </div>
      )}
    </div>
  );
}
