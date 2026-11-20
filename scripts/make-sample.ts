// Genera src/lib/sample/playlist.ts a partir de las respuestas reales guardadas
// en src/lib/match/fixtures, pasándolas por la misma coincidencia que usa la web.
//   node scripts/make-sample.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BsMap } from "../src/lib/beatsaver/types.ts";
import { matchMaps } from "../src/lib/match/match.ts";
import { buildCandidates } from "../src/lib/titles/clean.ts";
import type { Song } from "../src/lib/types.ts";

const root = join(import.meta.dirname, "..");
const ATV = "MUSIC_VIDEO_TYPE_ATV";

const tracks: { fixture?: string; title: string; artists: string[]; seconds: number }[] = [
  { fixture: "daft-punk-hbfs", title: "Harder, Better, Faster, Stronger", artists: ["Daft Punk"], seconds: 224 },
  { fixture: "yoasobi-yoru", title: "夜に駆ける", artists: ["YOASOBI"], seconds: 261 },
  { fixture: "queen-bohemian", title: "Bohemian Rhapsody", artists: ["Queen"], seconds: 355 },
  { title: "Copenhague", artists: ["Vetusta Morla"], seconds: 304 },
  { fixture: "kid-laroi-stay", title: "STAY", artists: ["The Kid LAROI", "Justin Bieber"], seconds: 141 },
  { fixture: "lisa-gurenge", title: "紅蓮華", artists: ["LiSA"], seconds: 237 },
  { fixture: "imagine-dragons-believer", title: "Believer", artists: ["Imagine Dragons"], seconds: 204 },
  { fixture: "rosalia-malamente", title: "MALAMENTE", artists: ["ROSALÍA"], seconds: 150 },
  { title: "So payaso", artists: ["Extremoduro"], seconds: 283 },
  { fixture: "acdc-thunderstruck", title: "Thunderstruck", artists: ["AC/DC"], seconds: 292 },
  { fixture: "taylor-love-story", title: "Love Story (Taylor's Version)", artists: ["Taylor Swift"], seconds: 235 },
  { fixture: "rihanna-stay", title: "Stay (feat. Mikky Ekko)", artists: ["Rihanna"], seconds: 240 },
];

const songs: Song[] = tracks.map((t, i) => {
  const docs: BsMap[] = t.fixture
    ? JSON.parse(readFileSync(join(root, "src/lib/match/fixtures", `${t.fixture}.json`), "utf8")).docs
    : [];
  const [candidate] = buildCandidates({ title: t.title, artists: t.artists, videoType: ATV });
  const { maps, others } = matchMaps(candidate, docs);
  return {
    id: `ejemplo-${i + 1}`,
    position: i + 1,
    title: t.title,
    artists: t.artists,
    durationSeconds: t.seconds,
    thumb: maps[0]?.coverURL ?? others[0]?.coverURL,
    videoType: ATV,
    status: maps.length > 0 ? "found" : "none",
    maps,
    others,
  };
});

const file = `// Generado con scripts/make-sample.ts a partir de respuestas reales de BeatSaver
// (20 de noviembre de 2026). No editar a mano.
import type { PlaylistData, Song } from "../types";

export const samplePlaylist: Omit<PlaylistData, "tracks"> = {
  id: "ejemplo",
  title: "para probar el sable",
  author: "slicelist",
  trackCount: ${songs.length},
  truncated: false,
};

export const sampleSongs: Song[] = ${JSON.stringify(songs, null, 1)};
`;
writeFileSync(join(root, "src/lib/sample/playlist.ts"), file);
for (const s of songs) console.log(String(s.position).padStart(2), s.status.padEnd(5), String(s.maps.length).padStart(2), "+", String(s.others.length).padStart(2), s.title);
