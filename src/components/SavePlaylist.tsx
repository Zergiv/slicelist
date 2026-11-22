"use client";

import { PcGlyph } from "@/components/Glyphs";
import { useT } from "@/lib/i18n";
import { buildPlaylistFile, downloadPlaylistFile } from "@/lib/playlist/bplist";
import type { Song } from "@/lib/types";

/** Baja un .bplist con el mejor mapa de cada canción, para el Beat Saber del PC. */
export function SavePlaylist({
  title,
  songs,
  count,
}: {
  title: string;
  songs: readonly Song[];
  count: number;
}) {
  const t = useT();
  if (count <= 0) return null;

  return (
    <div>
      <h2 className="flex items-center gap-2 text-meta text-smoke">
        <PcGlyph />
        {t.savePlaylist.title}
      </h2>
      <p className="mt-3 text-body text-ash">{t.savePlaylist.hint}</p>
      <button
        type="button"
        className="btn mt-4 w-full !justify-between !whitespace-normal py-2 text-left"
        onClick={() => downloadPlaylistFile(buildPlaylistFile(title, songs))}
      >
        {t.savePlaylist.action}
        <span className="flex-none font-display text-title font-black">{count}</span>
      </button>
    </div>
  );
}
