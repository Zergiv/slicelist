"use client";

import { MotionConfig } from "motion/react";
import { useState } from "react";
import { Cell } from "@/components/grid/Frame";
import { MapRow } from "@/components/MapRow";
import { NowPlaying } from "@/components/NowPlaying";
import { QuestPanel } from "@/components/QuestPanel";
import { SendButton } from "@/components/SendButton";
import { SongRow } from "@/components/SongRow";
import { Empty } from "@/components/states/Empty";
import { ErrorState } from "@/components/states/ErrorState";
import { Loading } from "@/components/states/Loading";
import { StatusBlock } from "@/components/StatusBlock";
import { PreviewPlayerProvider } from "@/hooks/usePreviewPlayer";
import { QuestProvider } from "@/hooks/useQuest";
import type { ScanState } from "@/hooks/useScan";
import { I18nProvider, useI18n, type Lang } from "@/lib/i18n";
import type { QuestView, SendStatus } from "@/lib/quest/types";
import { samplePlaylist, sampleSongs } from "@/lib/sample/playlist";
import type { Song } from "@/lib/types";

function Label({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-6 text-meta text-smoke">{children}</h2>;
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-meta text-smoke">{children}</p>;
}

const found = sampleSongs[0];
const none = sampleSongs.find((s) => s.status === "none" && s.others.length === 0) ?? sampleSongs[3];
const map = found.maps[0];
const noop = () => {};

const songStates: { caption: string; song: Song }[] = [
  { caption: "con mapa", song: found },
  { caption: "buscando", song: { ...sampleSongs[2], status: "searching", maps: [], others: [] } },
  { caption: "sin mapa", song: none },
  { caption: "fallo", song: { ...sampleSongs[6], status: "error", maps: [], others: [] } },
];

const sendStates: { caption: string; status: SendStatus | null }[] = [
  { caption: "reposo", status: null },
  { caption: "en cola", status: { state: "queued", progress: 0 } },
  { caption: "enviando", status: { state: "sending", progress: 0.42 } },
  { caption: "en el visor", status: { state: "done", progress: 1 } },
  { caption: "fallo", status: { state: "failed", progress: 0 } },
];

const base: QuestView = { phase: "idle", installedCount: 0, batch: null };
const questStates: { caption: string; view: QuestView; best: number }[] = [
  { caption: "sin conectar", view: base, best: 9 },
  { caption: "esperando permiso", view: { ...base, phase: "authorizing" }, best: 9 },
  {
    caption: "conectado",
    view: { ...base, phase: "connected", deviceName: "Quest 3", installedCount: 214 },
    best: 9,
  },
  {
    caption: "enviando",
    view: {
      ...base,
      phase: "connected",
      deviceName: "Quest 3",
      installedCount: 218,
      batch: { running: true, done: 4, total: 9, failed: 0 },
    },
    best: 5,
  },
  {
    caption: "terminado",
    view: {
      ...base,
      phase: "connected",
      deviceName: "Quest 3",
      installedCount: 223,
      batch: { running: false, done: 9, total: 9, failed: 0 },
    },
    best: 0,
  },
  { caption: "sin mods", view: { ...base, phase: "notModded" }, best: 0 },
  { caption: "ocupado", view: { ...base, phase: "busy" }, best: 0 },
  { caption: "se soltó", view: { ...base, phase: "error" }, best: 0 },
  { caption: "navegador sin soporte", view: { ...base, phase: "unsupported" }, best: 0 },
];

const scanning: ScanState = {
  phase: "scanning",
  source: { kind: "sample" },
  playlist: samplePlaylist,
  songs: sampleSongs.map((s, i) =>
    i < 6 ? s : { ...s, status: i < 8 ? "searching" : "pending", maps: [], others: [] },
  ),
  error: null,
  startedAt: null,
  elapsedMs: 1400,
};

const langs: Lang[] = ["es", "en"];

function Pieces() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(true);

  return (
    <>
      <Cell as="section" className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-meta text-smoke">piezas y estados</h2>
        <div role="group" aria-label="Idioma de las piezas" className="flex gap-2">
          {langs.map((code) => (
            <button
              key={code}
              type="button"
              className="btn"
              aria-pressed={lang === code}
              onClick={() => setLang(code)}
            >
              {code}
            </button>
          ))}
        </div>
      </Cell>

      <Cell as="section" className="!p-0 lg:col-span-8">
        <div className="p-[var(--cell-pad)] pb-0">
          <Label>canción</Label>
        </div>
        <ul>
          {songStates.map(({ caption, song }) => (
            <li key={caption} className="song">
              <p className="px-[var(--cell-pad)] pt-3 text-meta text-smoke">{caption}</p>
              <SongRow
                song={song}
                open={song === found && open}
                onToggle={() => setOpen((o) => !o)}
                onRetry={noop}
              />
            </li>
          ))}
        </ul>
      </Cell>

      <Cell as="section" className="bg-ink-1 lg:col-span-4">
        <Label>bloque de estado</Label>
        <StatusBlock scan={scanning} quest="connected" />
      </Cell>

      <Cell as="section" className="lg:col-span-8">
        <Label>mapa</Label>
        <ul>
          <MapRow map={map} playing={false} onListen={noop} sendStatus={null} onSend={noop} canSend />
          <MapRow
            map={found.others[0] ?? map}
            playing
            onListen={noop}
            sendStatus={{ state: "sending", progress: 0.42 }}
            onSend={noop}
            canSend
          />
        </ul>
      </Cell>

      <Cell as="section" className="lg:col-span-4">
        <Label>añadir al visor</Label>
        <ul className="space-y-4">
          {sendStates.map(({ caption, status }) => (
            <li key={caption} className="flex items-center justify-between gap-4">
              <span className="text-meta text-smoke">{caption}</span>
              <SendButton status={status} onSend={noop} />
            </li>
          ))}
        </ul>
      </Cell>

      <Cell as="section">
        <Label>visor</Label>
        <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {questStates.map(({ caption, view, best }) => (
            <li key={caption}>
              <Caption>{caption}</Caption>
              <QuestPanel
                view={view}
                bestCount={best}
                mappedCount={9}
                onConnect={noop}
                onDisconnect={noop}
                onSendBest={noop}
                onStopBatch={noop}
              />
            </li>
          ))}
        </ul>
      </Cell>

      <Cell as="section" className="lg:col-span-4">
        <Label>ahora suena</Label>
        <Caption>en silencio</Caption>
        <NowPlaying
          map={null}
          playing={false}
          volume={0.35}
          onVolume={noop}
          onToggle={noop}
          progress={() => 0}
        />
        <div className="mt-8">
          <Caption>sonando</Caption>
          <NowPlaying
            map={map}
            playing
            volume={0.35}
            onVolume={noop}
            onToggle={noop}
            progress={() => 0.38}
          />
        </div>
        <div className="mt-8">
          <Caption>en pantallas pequeñas</Caption>
          <div className="rounded-l border border-line-strong bg-ink-1">
            <NowPlaying
              variant="dock"
              map={map}
              playing
              volume={0.35}
              onVolume={noop}
              onToggle={noop}
              progress={() => 0.38}
            />
          </div>
        </div>
      </Cell>

      <Cell as="section" className="lg:col-span-8">
        <Label>antes de pegar nada</Label>
        <Empty onExample={noop} />
      </Cell>

      <Cell as="section" className="!p-0 lg:col-span-7">
        <div className="p-[var(--cell-pad)] pb-0">
          <Label>leyendo la playlist</Label>
        </div>
        <Loading />
      </Cell>

      <Cell as="section" className="lg:col-span-5">
        <Label>no se pudo leer</Label>
        <div className="space-y-10">
          <ErrorState code="not_found" />
          <ErrorState code="busy" onRetry={noop} />
        </div>
      </Cell>
    </>
  );
}

/** Todas las piezas de la pantalla principal, en cada uno de sus estados. */
export function Gallery() {
  return (
    <MotionConfig reducedMotion="user">
      <I18nProvider>
        <PreviewPlayerProvider>
          <QuestProvider>
            <Pieces />
          </QuestProvider>
        </PreviewPlayerProvider>
      </I18nProvider>
    </MotionConfig>
  );
}
