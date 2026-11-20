import assert from "node:assert/strict";
import { test } from "node:test";
import type { BeatMap, Song } from "../types.ts";
import { SONGS_DIR, folderName, installedKeys, isInstalled } from "./installed.ts";
import { bestOf, pickBest } from "./pickBest.ts";
import { BadMapError, planFiles } from "./push.ts";

const bytes = (n: number) => new Uint8Array(n);

function map(id: string, score: number, extra: Partial<BeatMap> = {}): BeatMap {
  return {
    id,
    hash: id.padEnd(40, "0"),
    name: `map ${id}`,
    songName: "Song",
    songSubName: "",
    songAuthor: "Artist",
    mapper: "Mapper",
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

function song(id: string, maps: BeatMap[], others: BeatMap[] = []): Song {
  return {
    id,
    position: 1,
    title: id,
    artists: ["Artist"],
    status: maps.length > 0 ? "found" : "none",
    maps,
    others,
  };
}

test("nombre de carpeta: id, canción y mapeador, sin caracteres raros", () => {
  assert.equal(
    folderName({ id: "32E", songName: 'AC/DC: "Thunder"?', mapper: "a\\b|c*" }),
    "32e (ACDC Thunder - abc)",
  );
  assert.equal(folderName({ id: "1a2b", songName: "", mapper: "" }), "1a2b");
  assert.equal(folderName({ id: "1a2b", songName: "../../etc", mapper: ".." }), "1a2b (....etc - ..)");
  assert.ok(!folderName({ id: "1a2b", songName: "a/b", mapper: "c" }).includes("/"));
  assert.throws(() => folderName({ id: "../x", songName: "a", mapper: "b" }) === "", /./);
});

test("nombre de carpeta: se recorta y no acaba en punto ni espacio", () => {
  const name = folderName({ id: "abc", songName: "x".repeat(300), mapper: "y" });
  assert.ok(name.length <= 90);
  assert.equal(folderName({ id: "abc", songName: "Fin.", mapper: "" }), "abc (Fin.)");
});

test("reconoce lo que ya está en el visor por id o por hash", () => {
  const hash = "7c7f38d467bb43fe11a142581e63e324622ecc71";
  const keys = installedKeys([
    "32e (Harder Better Faster Stronger - RunRockGame)",
    "1A2B",
    "abcdef01 (tema largo - Mapper)",
    `custom_level_${hash.toUpperCase()}`,
    "Beat It",
    "deadbeefcafe no es un id",
  ]);
  assert.ok(isInstalled({ id: "32E", hash: "x" }, keys));
  assert.ok(isInstalled({ id: "1a2b", hash: "x" }, keys));
  assert.ok(isInstalled({ id: "abcdef01", hash: "x" }, keys));
  assert.ok(isInstalled({ id: "zzz", hash }, keys));
  assert.ok(!isInstalled({ id: "bea", hash: "y" }, keys));
  assert.ok(!isInstalled({ id: "deadbeefcafe", hash: "y" }, keys));
});

test("el mejor de cada canción: mayor puntuación, y votos para desempatar", () => {
  assert.equal(bestOf([map("a", 0.8), map("b", 0.95), map("c", 0.9)])?.id, "b");
  assert.equal(bestOf([map("a", 0.9, { upvotes: 5 }), map("b", 0.9, { upvotes: 50 })])?.id, "b");
  assert.equal(bestOf([]), undefined);
});

test("el lote salta canciones sin mapa, ya añadidas y repetidas", () => {
  const songs = [
    song("uno", [map("a1", 0.7), map("a2", 0.9)]),
    song("dos", [], [map("r1", 0.99, { version: "remix" })]),
    song("tres", [map("c1", 0.8), map("c2", 0.6)]),
    song("uno otra vez", [map("a1", 0.7), map("a2", 0.9)]),
  ];
  assert.deepEqual(pickBest(songs, new Set()).map((m) => m.id), ["a2", "c1"]);
  // "tres" ya tiene uno de sus mapas en el visor, aunque no sea el mejor.
  assert.deepEqual(pickBest(songs, new Set(["c2"])).map((m) => m.id), ["a2"]);
});

test("archivos del mapa: todo dentro de su carpeta e Info.dat al final", () => {
  const files = planFiles(
    { "Info.dat": bytes(3), "song.egg": bytes(10), "ExpertStandard.dat": bytes(5), "cover.jpg": bytes(2) },
    "32e (Song - Mapper)",
  );
  assert.equal(files.length, 4);
  for (const f of files) assert.ok(f.path.startsWith(`${SONGS_DIR}/32e (Song - Mapper)/`));
  assert.ok(files.at(-1)?.path.endsWith("/Info.dat"));
});

test("archivos del mapa: quita la carpeta envolvente y las entradas de carpeta", () => {
  const files = planFiles(
    { "Mapa/": bytes(0), "Mapa/info.dat": bytes(3), "Mapa/song.ogg": bytes(10) },
    "abc",
  );
  assert.deepEqual(
    files.map((f) => f.path),
    [`${SONGS_DIR}/abc/song.ogg`, `${SONGS_DIR}/abc/info.dat`],
  );
});

test("archivos del mapa: rechaza zips sin Info.dat o con rutas que se salen", () => {
  assert.throws(() => planFiles({ "song.egg": bytes(1) }, "abc"), BadMapError);
  assert.throws(() => planFiles({ "Info.dat": bytes(1), "../fuera.txt": bytes(1) }, "abc"), BadMapError);
  assert.throws(() => planFiles({ "Info.dat": bytes(1), "a/../../b": bytes(1) }, "abc"), BadMapError);
  assert.throws(() => planFiles({ "Info.dat": bytes(1), "/sdcard/x": bytes(1) }, "abc"), BadMapError);
  assert.throws(() => planFiles({ "Info.dat": bytes(1), "a\\..\\b": bytes(1) }, "abc"), BadMapError);
  assert.throws(() => planFiles({ "Info.dat": bytes(1), "INFO.DAT": bytes(1) }, "abc"), BadMapError);
  assert.throws(() => planFiles({ "Info.dat": bytes(1) }, "../abc"), BadMapError);
  assert.throws(() => planFiles({ "Info.dat": bytes(1) }, ".."), BadMapError);
});
