// Prepara los archivos de un mapa para escribirlos en el visor.
// Aquí solo hay lógica pura (se prueba con `pnpm test`); lo que toca el visor
// está en connect.ts.

import { SONGS_DIR } from "./installed.ts";

export type PlannedFile = {
  /** Ruta completa en el visor, siempre dentro de la carpeta de canciones. */
  path: string;
  data: Uint8Array;
};

export class BadMapError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "BadMapError";
  }
}

const MAX_FILES = 400;
const MAX_BYTES = 400 * 1024 * 1024;
const BAD_SEGMENT = /[<>:"\\|?*\u0000-\u001f\u007f]/;

function isInfo(name: string) {
  return name.toLowerCase() === "info.dat";
}

/**
 * Convierte el contenido de un zip en la lista de archivos a escribir.
 * - Exige un `Info.dat` (en la raíz o dentro de una única carpeta envolvente).
 * - Rechaza cualquier ruta que intente salirse de la carpeta del mapa.
 * - Deja `Info.dat` para el final: si el envío se corta, el juego no ve un
 *   mapa a medias.
 */
export function planFiles(entries: Record<string, Uint8Array>, folder: string): PlannedFile[] {
  if (!folder || folder.includes("/") || folder === "." || folder === "..") {
    throw new BadMapError("bad folder");
  }

  let files = Object.entries(entries)
    .map(([name, data]) => ({ name: name.replace(/^\.\//, ""), data }))
    // Las carpetas vienen como entradas vacías acabadas en barra.
    .filter((f) => !f.name.endsWith("/"));

  // Algunos zips traen todo metido en una carpeta: se quita ese nivel.
  if (!files.some((f) => isInfo(f.name))) {
    const tops = new Set(files.map((f) => f.name.split("/")[0]));
    const [top] = tops;
    if (tops.size === 1 && files.every((f) => f.name.startsWith(`${top}/`))) {
      files = files.map((f) => ({ ...f, name: f.name.slice(top.length + 1) }));
    }
  }

  if (!files.some((f) => isInfo(f.name))) throw new BadMapError("no info.dat");
  if (files.length > MAX_FILES) throw new BadMapError("too many files");

  const base = `${SONGS_DIR}/${folder}/`;
  const seen = new Set<string>();
  let bytes = 0;
  const planned: PlannedFile[] = [];

  for (const file of files) {
    const segments = file.name.split("/");
    for (const seg of segments) {
      if (!seg || seg === "." || seg === ".." || BAD_SEGMENT.test(seg) || seg.length > 200) {
        throw new BadMapError("unsafe path");
      }
    }
    const key = file.name.toLowerCase();
    if (seen.has(key)) throw new BadMapError("duplicate file");
    seen.add(key);

    bytes += file.data.byteLength;
    if (bytes > MAX_BYTES) throw new BadMapError("too big");

    planned.push({ path: base + segments.join("/"), data: file.data });
  }

  planned.sort((a, b) => Number(isInfo(leaf(a.path))) - Number(isInfo(leaf(b.path))));
  return planned;
}

function leaf(path: string) {
  return path.slice(path.lastIndexOf("/") + 1);
}

export function totalBytes(files: readonly PlannedFile[]): number {
  return files.reduce((sum, f) => sum + f.data.byteLength, 0);
}
