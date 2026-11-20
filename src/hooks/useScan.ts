"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { parsePlaylistLink } from "@/lib/playlist/parseUrl";
import type { ApiErrorCode, MatchResult, PlaylistData, Song, SongStatus } from "@/lib/types";

export type ScanPhase = "idle" | "reading" | "scanning" | "done" | "error";

export type ScanState = {
  phase: ScanPhase;
  /** Lo que se está buscando: un enlace o la playlist de ejemplo. */
  source: { kind: "link"; link: string } | { kind: "sample" } | null;
  playlist: Omit<PlaylistData, "tracks"> | null;
  songs: Song[];
  error: ApiErrorCode | null;
  /** Marca de tiempo (performance.now) en que empezó la búsqueda. */
  startedAt: number | null;
  /** Lo que tardó, cuando ya ha terminado. */
  elapsedMs: number | null;
};

type Action =
  | { type: "reading"; source: NonNullable<ScanState["source"]>; at: number }
  | { type: "loaded"; playlist: Omit<PlaylistData, "tracks">; songs: Song[] }
  | { type: "resume"; at: number }
  | { type: "song"; id: string; status: SongStatus; result?: MatchResult }
  | { type: "finished"; at: number }
  | { type: "failed"; error: ApiErrorCode }
  | { type: "reset" };

const initial: ScanState = {
  phase: "idle",
  source: null,
  playlist: null,
  songs: [],
  error: null,
  startedAt: null,
  elapsedMs: null,
};

function reducer(state: ScanState, action: Action): ScanState {
  switch (action.type) {
    case "reading":
      return { ...initial, phase: "reading", source: action.source, startedAt: action.at };
    case "loaded":
      return { ...state, phase: "scanning", playlist: action.playlist, songs: action.songs };
    case "resume":
      return { ...state, phase: "scanning", startedAt: action.at, elapsedMs: null };
    case "song":
      return {
        ...state,
        songs: state.songs.map((song) =>
          song.id === action.id
            ? {
                ...song,
                status: action.status,
                maps: action.result?.maps ?? song.maps,
                others: action.result?.others ?? song.others,
              }
            : song,
        ),
      };
    case "finished":
      return {
        ...state,
        phase: "done",
        // Lo que se quedó a medias vuelve a "pendiente".
        songs: state.songs.map((s) => (s.status === "searching" ? { ...s, status: "pending" } : s)),
        elapsedMs: (state.elapsedMs ?? 0) + (state.startedAt === null ? 0 : action.at - state.startedAt),
        startedAt: null,
      };
    case "failed":
      return { ...state, phase: "error", error: action.error, startedAt: null };
    case "reset":
      return initial;
  }
}

const CONCURRENCY = 4;
const ERROR_CODES: ApiErrorCode[] = [
  "bad_link",
  "not_playlist",
  "not_found",
  "empty",
  "busy",
  "upstream",
  "too_many",
];

function asErrorCode(value: unknown): ApiErrorCode {
  return ERROR_CODES.includes(value as ApiErrorCode) ? (value as ApiErrorCode) : "busy";
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

async function matchSong(song: Song, signal: AbortSignal): Promise<MatchResult | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: song.title,
        artists: song.artists,
        videoType: song.videoType,
      }),
      signal,
    });
    if (res.ok) return (await res.json()) as MatchResult;
    if (res.status !== 429 && res.status !== 503) return null;
    const retryAfter = Number(res.headers.get("retry-after"));
    await wait(Math.min(20_000, (retryAfter > 0 ? retryAfter : 2 ** attempt) * 1000), signal);
    if (signal.aborted) return null;
  }
  return null;
}

/** Reparte el trabajo entre unos pocos a la vez, respetando el orden. */
async function pool<T>(items: T[], size: number, signal: AbortSignal, work: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length && !signal.aborted) {
      await work(items[next++]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
}

export function useScan() {
  const [state, dispatch] = useReducer(reducer, initial);
  const abort = useRef<AbortController | null>(null);
  const songsRef = useRef<Song[]>([]);

  useEffect(() => {
    songsRef.current = state.songs;
  }, [state.songs]);
  useEffect(() => () => abort.current?.abort(), []);

  const begin = useCallback(() => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    return ctrl.signal;
  }, []);

  const searchOne = useCallback(async (song: Song, signal: AbortSignal) => {
    dispatch({ type: "song", id: song.id, status: "searching" });
    try {
      const result = await matchSong(song, signal);
      if (signal.aborted) return;
      if (!result) dispatch({ type: "song", id: song.id, status: "error" });
      else
        dispatch({
          type: "song",
          id: song.id,
          status: result.maps.length > 0 ? "found" : "none",
          result,
        });
    } catch {
      if (!signal.aborted) dispatch({ type: "song", id: song.id, status: "error" });
    }
  }, []);

  const searchAll = useCallback(
    async (songs: Song[], signal: AbortSignal) => {
      await pool(songs, CONCURRENCY, signal, (song) => searchOne(song, signal));
      if (abort.current?.signal === signal) dispatch({ type: "finished", at: performance.now() });
    },
    [searchOne],
  );

  /** Busca los mapas de una playlist. Devuelve el motivo si el enlace no vale. */
  const start = useCallback(
    async (link: string): Promise<void> => {
      const parsed = parsePlaylistLink(link);
      if (!parsed.ok) {
        abort.current?.abort();
        dispatch({ type: "reading", source: { kind: "link", link }, at: performance.now() });
        dispatch({ type: "failed", error: parsed.reason });
        return;
      }

      const signal = begin();
      dispatch({ type: "reading", source: { kind: "link", link }, at: performance.now() });
      try {
        const res = await fetch(`/api/playlist?link=${encodeURIComponent(link)}`, { signal });
        const body = (await res.json().catch(() => null)) as
          | { playlist?: PlaylistData; error?: string }
          | null;
        if (signal.aborted) return;
        if (!res.ok || !body?.playlist) {
          dispatch({ type: "failed", error: asErrorCode(body?.error) });
          return;
        }
        const { tracks, ...playlist } = body.playlist;
        if (tracks.length === 0) {
          dispatch({ type: "failed", error: "empty" });
          return;
        }
        const songs: Song[] = tracks.map((t) => ({ ...t, status: "pending", maps: [], others: [] }));
        dispatch({ type: "loaded", playlist, songs });
        await searchAll(songs, signal);
      } catch {
        if (!signal.aborted) dispatch({ type: "failed", error: "busy" });
      }
    },
    [begin, searchAll],
  );

  /** Playlist de ejemplo: mismos datos reales, sin salir a buscar nada. */
  const startSample = useCallback(async () => {
    const signal = begin();
    dispatch({ type: "reading", source: { kind: "sample" }, at: performance.now() });
    const { samplePlaylist, sampleSongs } = await import("@/lib/sample/playlist");
    await wait(500, signal);
    if (signal.aborted) return;

    dispatch({
      type: "loaded",
      playlist: samplePlaylist,
      songs: sampleSongs.map((s) => ({ ...s, status: "pending", maps: [], others: [] })),
    });
    await pool(sampleSongs, 3, signal, async (song) => {
      dispatch({ type: "song", id: song.id, status: "searching" });
      await wait(260 + ((song.position * 137) % 320), signal);
      if (signal.aborted) return;
      dispatch({
        type: "song",
        id: song.id,
        status: song.status,
        result: { maps: song.maps, others: song.others },
      });
    });
    if (abort.current?.signal === signal) dispatch({ type: "finished", at: performance.now() });
  }, [begin]);

  const stop = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    dispatch({ type: "finished", at: performance.now() });
  }, []);

  /** Vuelve a buscar todo lo que quedó pendiente o falló. */
  const resume = useCallback(async () => {
    const todo = songsRef.current.filter((s) => s.status === "pending" || s.status === "error");
    if (todo.length === 0) return;
    const signal = begin();
    dispatch({ type: "resume", at: performance.now() });
    await searchAll(todo, signal);
  }, [begin, searchAll]);

  /** Reintenta una sola canción sin tocar el resto de la búsqueda. */
  const retrySong = useCallback(
    async (id: string) => {
      const song = songsRef.current.find((s) => s.id === id);
      if (!song || song.status === "searching") return;
      await searchOne(song, new AbortController().signal);
    },
    [searchOne],
  );

  const reset = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    dispatch({ type: "reset" });
  }, []);

  return { state, start, startSample, stop, resume, retrySong, reset };
}

export type Scan = ReturnType<typeof useScan>;
