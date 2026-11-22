import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BeatMap, Song } from "../types.ts";
import { buildPlaylistFile, playlistFileName } from "./bplist.ts";

function map(id: string, score: number, extra: Partial<BeatMap> = {}): BeatMap {
  return {
    id,
    hash: id.padEnd(40, "A"),
    name: `map ${id}`,
    songName: `Song ${id}`,
    songSubName: "",
    songAuthor: "Artist",
    mapper: `Mapper ${id}`,
    durationSeconds: 200,
    bpm: 120,
    score,
    upvotes: 10,
    downvotes: 1,
    coverURL: "",
    previewURL: "",
    downloadURL: "",
    diffs: [],
    curated: false,
    ranked: false,
    ...extra,
  };
}

function song(id: string, maps: BeatMap[]): Song {
  return {
    id,
    position: 1,
    title: id,
    artists: ["Artist"],
    status: maps.length > 0 ? "found" : "none",
    maps,
    others: [],
  };
}

describe("buildPlaylistFile", () => {
  it("elige el mejor mapa por canción y pone el hash en minúsculas", () => {
    const file = buildPlaylistFile("Mi lista", [
      song("a", [map("aa", 0.5), map("ab", 0.9)]),
      song("b", []),
      song("c", [map("cc", 0.7)]),
    ]);
    assert.equal(file.playlistTitle, "Mi lista");
    assert.equal(file.playlistAuthor, "slicelist");
    assert.deepEqual(
      file.songs.map((s) => s.hash),
      ["ab".padEnd(40, "A").toLowerCase(), "cc".padEnd(40, "A").toLowerCase()],
    );
    assert.equal(file.songs[0]?.songName, "Song ab");
    assert.equal(file.songs[0]?.levelAuthorName, "Mapper ab");
  });

  it("devuelve songs vacío si nadie tiene mapa", () => {
    const file = buildPlaylistFile(" vacía ", [song("x", [])]);
    assert.equal(file.playlistTitle, "vacía");
    assert.deepEqual(file.songs, []);
  });
});

describe("playlistFileName", () => {
  it("limpia caracteres raros y añade .bplist", () => {
    assert.equal(playlistFileName('AC/DC: "Thunder"?'), "ACDC Thunder.bplist");
    assert.equal(playlistFileName("   "), "playlist.bplist");
  });
});
