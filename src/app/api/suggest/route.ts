// GET /api/suggest?q=…  ->  { suggestions: SongHint[] }
// Autocompletado de canciones (iTunes). Sin claves.

import { searchItunesSongs, type SongHint } from "@/lib/suggest/itunes";
import { cacheGet, cacheSet, MINUTE } from "@/lib/server/cache";
import { take, visitorOf } from "@/lib/server/rateLimit";

function fail(status: number, retryAfter?: number) {
  return Response.json(
    { suggestions: [] as SongHint[] },
    { status, headers: retryAfter ? { "retry-after": String(retryAfter) } : undefined },
  );
}

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 200);
  if (q.length < 2) return Response.json({ suggestions: [] as SongHint[] });

  const key = `sg|${q.toLowerCase()}`;
  const cached = cacheGet<SongHint[]>(key);
  if (cached) return Response.json({ suggestions: cached });

  const wait = take("suggest", visitorOf(request));
  if (wait > 0) return fail(429, wait);

  const suggestions = await searchItunesSongs(q, 8);
  cacheSet(key, suggestions, 15 * MINUTE);
  return Response.json({ suggestions });
}
