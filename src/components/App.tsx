"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CoverMarquee } from "@/components/CoverMarquee";
import { Filters } from "@/components/Filters";
import { Cell, Frame } from "@/components/grid/Frame";
import { SlicedWordmark } from "@/components/hero/SlicedWordmark";
import { NowPlaying } from "@/components/NowPlaying";
import { PlaylistInput } from "@/components/PlaylistInput";
import { QuestPanel } from "@/components/QuestPanel";
import { SongList, type SongFilter } from "@/components/SongList";
import { Empty } from "@/components/states/Empty";
import { ErrorState } from "@/components/states/ErrorState";
import { Loading } from "@/components/states/Loading";
import { StatusBlock } from "@/components/StatusBlock";
import { TopBar } from "@/components/TopBar";
import { PreviewPlayerProvider, usePreviewPlayer } from "@/hooks/usePreviewPlayer";
import { QuestProvider, useQuest } from "@/hooks/useQuest";
import { useScan } from "@/hooks/useScan";
import { I18nProvider, useT } from "@/lib/i18n";
import type { Song } from "@/lib/types";

/** Identificador de la playlist de ejemplo (el mismo que lleva en sus datos). */
const SAMPLE_ID = "ejemplo";
const playlistLink = (id: string) => `https://music.youtube.com/playlist?list=${id}`;

function Screen() {
  const t = useT();
  const scan = useScan();
  const player = usePreviewPlayer();
  const quest = useQuest();
  const { state } = scan;
  const { songs, phase } = state;

  const [filter, setFilter] = useState<SongFilter>("with");
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const [sharedLink, setSharedLink] = useState("");

  // Un enlace compartido (?list=...) arranca la búsqueda nada más abrir.
  const { start, startSample } = scan;
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("list");
    if (!id) return;
    if (id === SAMPLE_ID) {
      void startSample();
      return;
    }
    const link = playlistLink(id);
    setSharedLink(link);
    void start(link);
  }, [start, startSample]);

  // La dirección de la página sigue a la playlist, para poder compartirla.
  const playlistId = state.playlist?.id;
  useEffect(() => {
    if (phase === "idle" || phase === "reading") return;
    const url = new URL(window.location.href);
    if (playlistId) url.searchParams.set("list", playlistId);
    else url.searchParams.delete("list");
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [playlistId, phase]);

  const fresh = useCallback(() => {
    setFilter("with");
    setOpenIds(new Set());
  }, []);

  const submit = useCallback(
    (link: string) => {
      fresh();
      void scan.start(link);
    },
    [fresh, scan],
  );

  const example = useCallback(() => {
    fresh();
    void scan.startSample();
  }, [fresh, scan]);

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const pick = useCallback((song: Song) => {
    if (song.status !== "found" && song.status !== "none") return;
    setFilter(song.status === "found" ? "with" : "without");
    if (song.maps.length + song.others.length > 0) {
      setOpenIds((prev) => new Set(prev).add(song.id));
    }
    requestAnimationFrame(() => {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document
        .getElementById(`song-${song.id}`)
        ?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    });
  }, []);

  const counts = useMemo(() => {
    let withMap = 0;
    let withoutMap = 0;
    for (const song of songs) {
      if (song.status === "found") withMap++;
      else if (song.status === "none") withoutMap++;
    }
    return { withMap, withoutMap };
  }, [songs]);

  const best = useMemo(() => quest.bestFor(songs), [quest, songs]);

  const soundingSong = useMemo(() => {
    const id = player.current?.id;
    if (!id || !player.playing) return undefined;
    return songs.find((s) => s.maps.some((m) => m.id === id) || s.others.some((m) => m.id === id))?.id;
  }, [player, songs]);

  const busy = phase === "reading" || phase === "scanning";
  const linkError = state.error === "bad_link" || state.error === "not_playlist";
  const showResults = phase === "reading" || phase === "scanning" || phase === "done";
  const toggleCurrent = () => player.current && player.toggle(player.current);

  return (
    <main className={`mx-auto max-w-[1760px] p-2 md:p-4 ${player.current ? "max-lg:pb-24" : ""}`}>
      <Frame>
        <TopBar phase={phase} />

        <Cell className="hero">
          <div className="saber-light" aria-hidden="true" />
          <div className="relative">
            <SlicedWordmark />
          </div>
        </Cell>

        <Cell as="section" className="lg:col-span-7">
          <PlaylistInput
            busy={busy}
            error={state.error}
            initialLink={sharedLink}
            onSubmit={submit}
            onStop={scan.stop}
            onExample={example}
          />
        </Cell>

        <Cell as="aside" className="bg-ink-1 lg:col-span-5">
          <StatusBlock scan={state} quest={quest.view.phase} />
        </Cell>

        {showResults && (
          <Cell>
            <CoverMarquee songs={songs} activeId={soundingSong} onPick={pick} />
          </Cell>
        )}

        {(phase === "idle" || (phase === "error" && linkError)) && (
          <Cell as="section">
            <Empty onExample={example} />
          </Cell>
        )}

        {phase === "error" && !linkError && state.error && (
          <Cell as="section" className="!py-12">
            <ErrorState
              code={state.error}
              onRetry={
                state.source?.kind === "link" ? () => submit((state.source as { link: string }).link) : undefined
              }
            />
          </Cell>
        )}

        {showResults && (
          <>
            <Cell as="aside" className="lg:col-span-3">
              <div className="flex flex-col gap-6 lg:sticky lg:top-6">
                <Filters
                  value={filter}
                  withMap={counts.withMap}
                  withoutMap={counts.withoutMap}
                  onChange={setFilter}
                />
                <div className="border-t border-line pt-6">
                  <QuestPanel
                    view={quest.view}
                    bestCount={best.length}
                    mappedCount={counts.withMap}
                    onConnect={() => void quest.connect()}
                    onDisconnect={quest.disconnect}
                    onSendBest={() => quest.sendBest(songs)}
                    onStopBatch={quest.stopBatch}
                  />
                </div>
                <div className="hidden border-t border-line pt-6 lg:block">
                  <NowPlaying
                    map={player.current}
                    playing={player.playing}
                    onToggle={toggleCurrent}
                    progress={player.progress}
                  />
                </div>
              </div>
            </Cell>

            <Cell as="section" className="!p-0 lg:col-span-9">
              {phase === "reading" ? (
                <Loading />
              ) : (
                <SongList
                  songs={songs}
                  filter={filter}
                  phase={phase}
                  openIds={openIds}
                  onToggle={toggle}
                  onRetry={(id) => void scan.retrySong(id)}
                  onResume={() => void scan.resume()}
                />
              )}
            </Cell>
          </>
        )}

        <Cell as="footer" className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 !py-4">
          <p className="text-meta text-smoke">{t.footer.credit}</p>
          <Link href="/design" className="link text-meta">
            {t.footer.design}
          </Link>
        </Cell>
      </Frame>

      <AnimatePresence>
        {player.current && (
          <motion.div
            className="dock lg:hidden"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
          >
            <NowPlaying
              variant="dock"
              map={player.current}
              playing={player.playing}
              onToggle={toggleCurrent}
              progress={player.progress}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <I18nProvider>
        <PreviewPlayerProvider>
          <QuestProvider>
            <Screen />
          </QuestProvider>
        </PreviewPlayerProvider>
      </I18nProvider>
    </MotionConfig>
  );
}
