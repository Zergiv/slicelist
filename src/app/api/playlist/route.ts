// GET /api/playlist?link=<enlace o id>  ->  { playlist }
// Lee las canciones de una playlist o álbum público a través del lector local.

import { parsePlaylistLink } from "@/lib/playlist/parseUrl";
import { cacheGet, cacheSet, MINUTE } from "@/lib/server/cache";
import { take, visitorOf } from "@/lib/server/rateLimit";
import type { ApiErrorCode, PlaylistData, Track } from "@/lib/types";

const READER = process.env.READER_URL || "http://127.0.0.1:4191";
const READER_ERRORS: ApiErrorCode[] = ["not_found", "empty", "busy", "upstream", "bad_link"];

type ReaderTrack = {
  videoId: string;
  title: string;
  artists: string[];
  album: string | null;
  durationSeconds: number | null;
  thumb: string | null;
  videoType: string | null;
};

type ReaderPlaylist = Omit<PlaylistData, "tracks" | "author" | "thumb"> & {
  author: string | null;
  thumb: string | null;
  tracks: ReaderTrack[];
};

function fail(error: ApiErrorCode, status: number, retryAfter?: number) {
  return Response.json(
    { error },
    { status, headers: retryAfter ? { "retry-after": String(retryAfter) } : undefined },
  );
}

export async function GET(request: Request) {
  const link = new URL(request.url).searchParams.get("link") ?? "";
  const parsed = parsePlaylistLink(link.slice(0, 2000));
  if (!parsed.ok) return fail(parsed.reason, 400);

  // p4: playlists de Spotify paginadas (más de 100).
  const key = `p4|${parsed.kind}|${parsed.id}`;
  const cached = cacheGet<PlaylistData>(key);
  if (cached) return Response.json({ playlist: cached });

  // Solo cuenta para el tope lo que de verdad sale a leer la playlist.
  const wait = take("playlist", visitorOf(request));
  if (wait > 0) return fail("too_many", 429, wait);

  let res: Response;
  try {
    res = await fetch(`${READER}/playlist?id=${encodeURIComponent(parsed.id)}&kind=${parsed.kind}`, {
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[playlist] el lector no responde", err);
    return fail("busy", 503);
  }

  const body = (await res.json().catch(() => null)) as (ReaderPlaylist & { error?: string }) | null;
  if (!res.ok || !body || !Array.isArray(body.tracks)) {
    const code = READER_ERRORS.find((c) => c === body?.error) ?? "upstream";
    const status = code === "not_found" || code === "empty" ? 404 : code === "busy" ? 503 : 502;
    return fail(code, status);
  }

  const tracks: Track[] = body.tracks.map((t, i) => ({
    id: `${t.videoId}-${i + 1}`,
    position: i + 1,
    title: t.title,
    artists: t.artists ?? [],
    album: t.album ?? undefined,
    durationSeconds: t.durationSeconds ?? undefined,
    thumb: t.thumb ?? undefined,
    videoType: t.videoType ?? undefined,
  }));

  const playlist: PlaylistData = {
    id: parsed.id,
    title: body.title || "playlist",
    author: body.author ?? undefined,
    thumb: body.thumb ?? undefined,
    trackCount: body.trackCount,
    truncated: body.truncated,
    tracks,
  };

  cacheSet(key, playlist, 15 * MINUTE);
  return Response.json({ playlist });
}
