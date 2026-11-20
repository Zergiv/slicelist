// De una canción de la playlist a sus mapas: decide qué se pregunta al
// buscador (como mucho dos veces por canción) y filtra lo que vuelve.
// El buscador se recibe por parámetro, así esto se prueba sin red.

import type { BsMap } from "../beatsaver/types.ts";
import { buildCandidates } from "../titles/clean.ts";
import type { MatchResult, Track } from "../types.ts";
import { matchMaps, mergeResults } from "./match.ts";

export type Search = (query: string) => Promise<BsMap[]>;

/** Búsquedas por canción, como máximo. */
export const MAX_SEARCHES = 2;

export async function matchTrack(
  track: Pick<Track, "title" | "artists" | "videoType">,
  search: Search,
): Promise<MatchResult> {
  const candidates = buildCandidates(track);
  if (candidates.length === 0) return { maps: [], others: [] };

  // Primero "artista título" de cada lectura; si no basta, el título a secas
  // (hay mapas que escriben el artista de otra manera o no lo ponen).
  const queries: string[] = [];
  const add = (q: string) => {
    const query = q.trim();
    if (query.length >= 2 && !queries.some((x) => x.toLowerCase() === query.toLowerCase())) {
      queries.push(query);
    }
  };
  for (const c of candidates) add(c.query);
  for (const c of candidates) add(c.title.base);

  const docs = new Map<string, BsMap>();
  let result: MatchResult = { maps: [], others: [] };

  for (const query of queries.slice(0, MAX_SEARCHES)) {
    for (const doc of await search(query)) docs.set(doc.id, doc);
    const all = [...docs.values()];
    result = mergeResults(candidates.map((c) => matchMaps(c, all)));
    if (result.maps.length > 0) break;
  }
  return result;
}
