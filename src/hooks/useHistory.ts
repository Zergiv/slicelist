"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  entryKey,
  readHistory,
  removeHistory,
  upsertHistory,
  writeHistory,
  type HistoryEntry,
  type HistoryPlaylist,
  type HistorySong,
} from "@/lib/history/store";

const listeners = new Set<() => void>();
let cached: HistoryEntry[] | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function getSnapshot(): HistoryEntry[] {
  if (cached) return cached;
  cached = typeof window === "undefined" ? [] : readHistory();
  return cached;
}

function getServerSnapshot(): HistoryEntry[] {
  return [];
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== "slicelist:history") return;
    cached = null;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function commit(next: HistoryEntry[]) {
  cached = next;
  writeHistory(next);
  emit();
}

export function useHistory() {
  const entries = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const rememberPlaylist = useCallback((entry: Omit<HistoryPlaylist, "kind" | "at">) => {
    commit(upsertHistory(getSnapshot(), { ...entry, kind: "playlist", at: Date.now() }));
  }, []);

  const rememberSong = useCallback((entry: Omit<HistorySong, "kind" | "at">) => {
    commit(upsertHistory(getSnapshot(), { ...entry, kind: "song", at: Date.now() }));
  }, []);

  const remove = useCallback((entry: HistoryEntry) => {
    commit(removeHistory(getSnapshot(), entryKey(entry)));
  }, []);

  const clear = useCallback(() => {
    commit([]);
  }, []);

  return { entries, rememberPlaylist, rememberSong, remove, clear };
}
