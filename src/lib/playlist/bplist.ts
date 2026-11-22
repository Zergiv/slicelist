// Playlist de Beat Saber (.bplist) para importar en el PC.

import type { Song } from "../types.ts";
import { pickBest } from "../quest/pickBest.ts";

export type BplistSong = {
  hash: string;
  songName: string;
  levelAuthorName: string;
};

export type BplistFile = {
  playlistTitle: string;
  playlistAuthor: string;
  songs: BplistSong[];
};

/** El mejor mapa de cada canción (grabación original), sin mirar el visor. */
export function buildPlaylistFile(title: string, songs: readonly Song[]): BplistFile {
  const maps = pickBest(songs, new Set());
  return {
    playlistTitle: title.trim() || "playlist",
    playlistAuthor: "slicelist",
    songs: maps.map((map) => ({
      hash: map.hash.toLowerCase(),
      songName: map.songName,
      levelAuthorName: map.mapper,
    })),
  };
}

/** Nombre de archivo seguro para la descarga. */
export function playlistFileName(title: string): string {
  const clean = title
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${clean || "playlist"}.bplist`;
}

/** Baja el .bplist en el navegador. */
export function downloadPlaylistFile(file: BplistFile): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = playlistFileName(file.playlistTitle);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
