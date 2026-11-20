// POST /api/match  { title, artists, videoType }  ->  { maps, others }
// Busca los mapas de UNA canción. La web llama a esto canción a canción.

import { BeatSaverError, searchMaps } from "@/lib/beatsaver/client";
import { matchTrack } from "@/lib/match/matchTrack";
import { cacheGet, cacheSet, HOUR } from "@/lib/server/cache";
import { QueueFull } from "@/lib/server/queue";
import { take, visitorOf } from "@/lib/server/rateLimit";
import type { ApiErrorCode, MatchResult } from "@/lib/types";

/** Súbelo cuando cambie la forma de decidir qué mapa es de qué canción. */
const MATCH_VERSION = 1;

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

export async function POST(request: Request) {
  const wait = take("match", visitorOf(request));
  if (wait > 0) return fail("too_many", 429, wait);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("bad_link", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;

  const title = text(input.title, 300);
  const artists = Array.isArray(input.artists)
    ? input.artists
        .slice(0, 12)
        .map((a) => text(a, 200))
        .filter((a): a is string => a !== null)
    : [];
  const videoType = text(input.videoType, 60) ?? undefined;
  if (!title) return fail("bad_link", 400);

  const key = `m${MATCH_VERSION}|${JSON.stringify([title, artists, videoType ?? ""])}`;
  const cached = cacheGet<MatchResult>(key);
  if (cached) return Response.json(cached);

  try {
    const result = await matchTrack({ title, artists, videoType }, searchMaps);
    const empty = result.maps.length === 0 && result.others.length === 0;
    cacheSet(key, result, empty ? 6 * HOUR : 24 * HOUR);
    return Response.json(result);
  } catch (err) {
    if (err instanceof QueueFull) return fail("busy", 503, 5);
    if (err instanceof BeatSaverError && err.status === 429) return fail("busy", 503, 10);
    console.error("[match]", title, err);
    return fail("upstream", 502);
  }
}
