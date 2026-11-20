// Dónde viven las canciones en el visor y cómo reconocer las que ya están.
// Sin dependencias: se prueba con `pnpm test`.

import type { BeatMap } from "../types.ts";

/** Carpeta de datos del juego con mods. Si no existe, el juego no está modificado. */
export const MOD_DATA_DIR = "/sdcard/ModData/com.beatgames.beatsaber";

/** Única carpeta en la que slicelist escribe. */
export const SONGS_DIR = `${MOD_DATA_DIR}/Mods/SongCore/CustomLevels`;

const FORBIDDEN = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;

/** Nombre de carpeta al estilo habitual: `<id> (<canción> - <mapeador>)`. */
export function folderName(map: Pick<BeatMap, "id" | "songName" | "mapper">): string {
  const clean = (s: string) => s.replace(FORBIDDEN, "").replace(/\s+/g, " ").trim();
  const id = map.id.toLowerCase().replace(/[^0-9a-f]/g, "");
  if (!id) throw new Error("map without id");
  const label = [clean(map.songName), clean(map.mapper)].filter(Boolean).join(" - ");
  const name = label ? `${id} (${label.slice(0, 80).trim()})` : id;
  // Un nombre que acaba en punto o espacio da problemas al copiarlo a otros sistemas.
  return name.replace(/[. ]+$/, "") || id;
}

/** Claves (id o hash, en minúsculas) que se reconocen en nombres de carpeta. */
export function installedKeys(folderNames: Iterable<string>): Set<string> {
  const keys = new Set<string>();
  for (const name of folderNames) {
    const id = /^([0-9a-f]{1,7})(?=$|[ (_-])/i.exec(name);
    if (id) keys.add(id[1].toLowerCase());
    const hash = /[0-9a-f]{40}/i.exec(name);
    if (hash) keys.add(hash[0].toLowerCase());
  }
  return keys;
}

export function isInstalled(map: Pick<BeatMap, "id" | "hash">, keys: ReadonlySet<string>): boolean {
  return keys.has(map.id.toLowerCase()) || keys.has(map.hash.toLowerCase());
}
