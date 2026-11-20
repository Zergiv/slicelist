// "Añadir el mejor de cada canción": qué mapa se manda de cada una.

import type { BeatMap, Song } from "../types.ts";
import { isInstalled } from "./installed.ts";

/** El mapa mejor puntuado; a igualdad, el que más votos tiene. */
export function bestOf(maps: readonly BeatMap[]): BeatMap | undefined {
  let best: BeatMap | undefined;
  for (const map of maps) {
    if (
      !best ||
      map.score > best.score ||
      (map.score === best.score && map.upvotes > best.upvotes)
    ) {
      best = map;
    }
  }
  return best;
}

/**
 * Un mapa por canción, solo entre los de la grabación original. Las canciones
 * que ya tienen algún mapa en el visor se saltan, y no se repite un mismo mapa
 * aunque la canción salga dos veces en la playlist.
 */
export function pickBest(songs: readonly Song[], installed: ReadonlySet<string>): BeatMap[] {
  const picked = new Map<string, BeatMap>();
  for (const song of songs) {
    if (song.maps.length === 0) continue;
    if (song.maps.some((m) => isInstalled(m, installed))) continue;
    const best = bestOf(song.maps);
    if (best && !picked.has(best.id)) picked.set(best.id, best);
  }
  return [...picked.values()];
}
