// Historial local de playlists y canciones sueltas (solo el navegador).

export type HistoryPlaylist = {
  kind: "playlist";
  id: string;
  title: string;
  author?: string;
  thumb?: string;
  link: string;
  at: number;
};

export type HistorySong = {
  kind: "song";
  title: string;
  artists: string[];
  thumb?: string;
  album?: string;
  videoId?: string;
  videoType?: string;
  durationSeconds?: number;
  at: number;
};

export type HistoryEntry = HistoryPlaylist | HistorySong;

export const HISTORY_KEY = "slicelist:history";

function playlistKey(entry: HistoryPlaylist): string {
  return `playlist:${entry.link.trim().toLowerCase()}`;
}

function songKey(entry: HistorySong): string {
  return `song:${entry.title.trim().toLowerCase()}|${entry.artists.map((a) => a.trim().toLowerCase()).join(",")}`;
}

export function entryKey(entry: HistoryEntry): string {
  return entry.kind === "playlist" ? playlistKey(entry) : songKey(entry);
}

/** Mete la entrada al principio; si ya estaba, la sustituye. */
export function upsertHistory(list: readonly HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const key = entryKey(entry);
  return [entry, ...list.filter((item) => entryKey(item) !== key)];
}

export function removeHistory(list: readonly HistoryEntry[], key: string): HistoryEntry[] {
  return list.filter((item) => entryKey(item) !== key);
}

export function readHistory(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

export function writeHistory(list: readonly HistoryEntry[]): void {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // Sin espacio o modo privado: se deja lo que ya hubiera.
  }
}

function isEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (row.kind === "playlist") {
    return typeof row.id === "string" && typeof row.title === "string" && typeof row.link === "string";
  }
  if (row.kind === "song") {
    return typeof row.title === "string" && Array.isArray(row.artists);
  }
  return false;
}
