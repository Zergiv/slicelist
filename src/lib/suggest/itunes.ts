/** Sugerencias de canciones vía iTunes Search (sin claves). */

export type SongHint = {
  title: string;
  artists: string[];
  thumb?: string;
  album?: string;
};

type ItunesResult = {
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
};

type ItunesResponse = {
  results?: ItunesResult[];
};

const TIMEOUT_MS = 8_000;

function art(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace("100x100bb", "300x300bb").replace("100x100", "300x300");
}

export async function searchItunesSongs(term: string, limit = 8): Promise<SongHint[]> {
  const q = term.trim().replace(/\s+/g, " ");
  if (!q || q.length > 200) return [];

  const url =
    "https://itunes.apple.com/search?" +
    new URLSearchParams({
      term: q,
      entity: "song",
      limit: String(Math.min(25, Math.max(1, limit))),
    });

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  let body: ItunesResponse;
  try {
    body = (await res.json()) as ItunesResponse;
  } catch {
    return [];
  }

  const out: SongHint[] = [];
  const seen = new Set<string>();
  for (const raw of body.results ?? []) {
    const title = raw.trackName?.trim();
    const artist = raw.artistName?.trim();
    if (!title || !artist) continue;
    const key = `${title.toLowerCase()}|${artist.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      title,
      artists: [artist],
      album: raw.collectionName?.trim() || undefined,
      thumb: art(raw.artworkUrl100 || raw.artworkUrl60),
    });
    if (out.length >= limit) break;
  }
  return out;
}
