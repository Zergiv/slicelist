// Cliente del buscador de BeatSaver (solo servidor).
//
// Parámetros comprobados en la definición oficial
// (https://api.beatsaver.com/docs/swagger.json) y con llamadas reales:
//   GET /search/text/{page}?q=<texto>&order=Relevance&pageSize=<n>
// Por defecto el buscador ya deja fuera los mapas generados automáticamente.

import net from "node:net";
import { Backoff, enqueue } from "../server/queue";
import type { BsMap, BsSearchResponse } from "./types";

// Hay redes sin salida IPv6 en las que Node se rinde antes de probar IPv4
// (le da 250 ms a cada intento). Se le da margen para que llegue a IPv4.
net.setDefaultAutoSelectFamilyAttemptTimeout(2500);

const BASE = "https://api.beatsaver.com";
const PAGE_SIZE = 50;
const TIMEOUT_MS = 12_000;
// BeatSaver pide identificarse; el contacto (web o correo) se pone en .env.
const CONTACT = process.env.SLICELIST_CONTACT?.trim();
const USER_AGENT = CONTACT ? `slicelist/0.1 (${CONTACT})` : "slicelist/0.1";

export class BeatSaverError extends Error {
  status: number;
  constructor(status: number) {
    super(`BeatSaver respondió ${status}`);
    this.name = "BeatSaverError";
    this.status = status;
  }
}

/** Deja de cada mapa solo lo que usa la web. */
function trim(doc: BsMap): BsMap {
  return {
    id: doc.id,
    name: doc.name,
    automapper: doc.automapper,
    ranked: doc.ranked,
    blRanked: doc.blRanked,
    curatedAt: doc.curatedAt,
    tags: doc.tags,
    metadata: {
      bpm: doc.metadata.bpm,
      duration: doc.metadata.duration,
      songName: doc.metadata.songName,
      songSubName: doc.metadata.songSubName,
      songAuthorName: doc.metadata.songAuthorName,
      levelAuthorName: doc.metadata.levelAuthorName,
    },
    stats: {
      upvotes: doc.stats.upvotes,
      downvotes: doc.stats.downvotes,
      score: doc.stats.score,
    },
    versions: (doc.versions ?? []).map((v) => ({
      hash: v.hash,
      state: v.state,
      coverURL: v.coverURL,
      previewURL: v.previewURL,
      downloadURL: v.downloadURL,
      diffs: (v.diffs ?? []).map((d) => ({
        characteristic: d.characteristic,
        difficulty: d.difficulty,
      })),
    })),
  };
}

async function request(query: string): Promise<BsMap[]> {
  const url = new URL(`${BASE}/search/text/0`);
  url.searchParams.set("q", query);
  url.searchParams.set("order", "Relevance");
  url.searchParams.set("pageSize", String(PAGE_SIZE));

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    // Sin respuesta: red caída o BeatSaver tardando demasiado.
    throw new BeatSaverError(0);
  }

  if (res.status === 429 || res.status === 503) {
    const retryAfter = Number(res.headers.get("retry-after"));
    throw new Backoff(retryAfter > 0 ? retryAfter * 1000 : 2000);
  }
  if (!res.ok) throw new BeatSaverError(res.status);

  const body = (await res.json()) as BsSearchResponse;
  return Array.isArray(body.docs) ? body.docs.filter((d) => d?.metadata && d?.stats).map(trim) : [];
}

/** Busca mapas por texto. Pasa por la cola global y comparte búsquedas iguales. */
export async function searchMaps(query: string): Promise<BsMap[]> {
  const q = query.trim().replace(/\s+/g, " ");
  if (!q) return [];
  try {
    return await enqueue(`bs:${q.toLowerCase()}`, () => request(q));
  } catch (err) {
    if (err instanceof Backoff) throw new BeatSaverError(429);
    throw err;
  }
}
