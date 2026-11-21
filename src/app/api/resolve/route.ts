// POST /api/resolve  { q: string }  ->  { track } | { error }
 // Texto libre (iTunes) o enlace de pista YT/Spotify (lector).

import { parseTrackLink } from "@/lib/playlist/parseTrack";
import { searchItunesSongs } from "@/lib/suggest/itunes";
import { cacheGet, cacheSet, HOUR, MINUTE } from "@/lib/server/cache";
import { take, visitorOf } from "@/lib/server/rateLimit";
import type { ApiErrorCode } from "@/lib/types";

const READER = process.env.READER_URL || "http://127.0.0.1:4191";
const READER_ERRORS: ApiErrorCode[] = ["not_found", "empty", "busy", "upstream", "bad_link"];

export type ResolvedTrack = {
  title: string;
  artists: string[];
  thumb?: string;
  album?: string;
  videoId?: string;
  videoType?: string;
  durationSeconds?: number;
};

function fail(error: ApiErrorCode, status: number, retryAfter?: number) {
  return Response.json(
    { error },
    { status, headers: retryAfter ? { "retry-after": String(retryAfter) } : undefined },
  );
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean && clean.length <= max ? clean : null;
}

type ReaderTrack = {
  videoId: string;
  title: string;
  artists: string[];
  album: string | null;
  durationSeconds: number | null;
  thumb: string | null;
  videoType: string | null;
};

async function fromReader(kind: "youtube" | "spotify", id: string): Promise<ResolvedTrack | ApiErrorCode> {
  const key = `rt|${kind}|${id}`;
  const cached = cacheGet<ResolvedTrack>(key);
  if (cached) return cached;

  let res: Response;
  try {
    res = await fetch(`${READER}/track?id=${encodeURIComponent(id)}&kind=${kind}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return "busy";
  }

  const body = (await res.json().catch(() => null)) as
    | { track?: ReaderTrack; error?: string }
    | null;
  if (!res.ok || !body?.track) {
    const code = body?.error;
    return READER_ERRORS.includes(code as ApiErrorCode) ? (code as ApiErrorCode) : "upstream";
  }

  const t = body.track;
  const track: ResolvedTrack = {
    title: t.title,
    artists: t.artists ?? [],
    thumb: t.thumb ?? undefined,
    album: t.album ?? undefined,
    videoId: t.videoId,
    videoType: t.videoType ?? undefined,
    durationSeconds: t.durationSeconds ?? undefined,
  };
  cacheSet(key, track, 6 * HOUR);
  return track;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("bad_link", 400);
  }
  const q = text((body as Record<string, unknown>)?.q, 2000);
  if (!q) return fail("bad_link", 400);

  const wait = take("resolve", visitorOf(request));
  if (wait > 0) return fail("too_many", 429, wait);

  const parsed = parseTrackLink(q);
  if (parsed.ok) {
    const track = await fromReader(parsed.kind, parsed.id);
    if (typeof track === "string") return fail(track, track === "not_found" ? 404 : 502);
    return Response.json({ track });
  }

  // Texto libre: primera sugerencia de iTunes, o el propio texto como título.
  const key = `rx|${q.toLowerCase()}`;
  const cached = cacheGet<ResolvedTrack>(key);
  if (cached) return Response.json({ track: cached });

  const hints = await searchItunesSongs(q, 1);
  const track: ResolvedTrack =
    hints[0] ??
    ({
      title: q,
      artists: [],
    } satisfies ResolvedTrack);

  cacheSet(key, track, 15 * MINUTE);
  return Response.json({ track });
}
