// Pruebas sobre respuestas reales de BeatSaver, guardadas en ./fixtures
// (capturadas el 20 de noviembre de 2026 con la búsqueda que usa la web).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import type { BsMap } from "../beatsaver/types.ts";
import { buildCandidates } from "../titles/clean.ts";
import type { Track } from "../types.ts";
import { matchMaps } from "./match.ts";

function fixture(name: string): BsMap[] {
  const file = join(import.meta.dirname, "fixtures", `${name}.json`);
  return (JSON.parse(readFileSync(file, "utf8")) as { docs: BsMap[] }).docs;
}

function run(name: string, track: Pick<Track, "title" | "artists" | "videoType">) {
  const [candidate] = buildCandidates(track);
  const result = matchMaps(candidate, fixture(name));
  return {
    maps: result.maps.map((m) => m.id),
    others: Object.fromEntries(result.others.map((m) => [m.id, m.version])),
    result,
  };
}

const ATV = "MUSIC_VIDEO_TYPE_ATV";

test("Daft Punk: los remixes no cuentan y el cover sin artista se descarta", () => {
  const r = run("daft-punk-hbfs", {
    title: "Harder, Better, Faster, Stronger",
    artists: ["Daft Punk"],
    videoType: ATV,
  });
  assert.ok(r.maps.includes("32e"));
  assert.ok(r.maps.includes("13f3d"));
  assert.ok(r.maps.includes("3b1d9"), "con signo de exclamación sigue siendo la misma");
  assert.equal(r.others["57b8"], "remix");
  assert.equal(r.others["2ad5"], "remix", "sin campo de autor, pero con el artista en el nombre");
  assert.equal(r.others["1519"], "remix", "el bootleg solo aparece en el nombre del mapa");
  // "Harder Better Faster Stronger" de Pomplamoose: mismo título, otro artista.
  assert.ok(!r.maps.includes("1035d") && !("1035d" in r.others));
  // Parodias con título parecido ("...Whopper") y otras canciones del artista.
  for (const id of ["2f4f3", "2f0aa", "5335f", "2844", "283c0"]) {
    assert.ok(!r.maps.includes(id) && !(id in r.others), id);
  }
});

test("si la playlist trae el remix, el remix es el original", () => {
  const r = run("daft-punk-hbfs", {
    title: "Harder, Better, Faster, Stronger (Far Out Remix)",
    artists: ["Daft Punk"],
    videoType: ATV,
  });
  assert.deepEqual([...r.maps].sort(), ["2ad5", "57b8", "9daa"]);
  assert.ok("32e" in r.others, "la grabación normal pasa a 'otras versiones'");
});

test("mismo título, artistas distintos: 'Stay'", () => {
  const rihanna = run("rihanna-stay", { title: "Stay (feat. Mikky Ekko)", artists: ["Rihanna"], videoType: ATV });
  assert.deepEqual(rihanna.maps, ["9cda"]);
  assert.ok(!rihanna.maps.includes("2399d"), "el 'STAY' de BLACKPINK no es este");

  const laroi = run("kid-laroi-stay", {
    title: "The Kid LAROI, Justin Bieber - STAY (Official Video)",
    artists: ["TheKidLAROIVEVO"],
  });
  assert.ok(laroi.maps.length >= 10);
  assert.ok(laroi.maps.includes("1ef57"), "con los artistas en otro orden");
  assert.equal(laroi.others["2556e"], "cover");
  assert.equal(laroi.others["32375"], "cover");
});

test("vídeo con el título entero y remasterizado", () => {
  const r = run("queen-bohemian", {
    title: "Queen – Bohemian Rhapsody (Official Video Remastered)",
    artists: ["Queen Official"],
  });
  for (const id of ["d0be", "4a6", "77c", "45856"]) assert.ok(r.maps.includes(id), id);
  assert.ok(!r.maps.includes("3361"), "la versión del Live Aid no nombra a Queen");
  assert.ok(!r.maps.includes("d614"), "otra canción de Queen");
});

test("título en japonés escrito de otra forma en el mapa", () => {
  const r = run("yoasobi-yoru", { title: "夜に駆ける", artists: ["YOASOBI"], videoType: ATV });
  assert.ok(r.maps.includes("19cca"), "Into the Night/夜に駆ける");
  assert.ok(r.maps.includes("2698d"), "el título japonés solo está en el nombre del mapa");
  assert.equal(r.others["1c9a9"], "short");
  assert.ok(!r.maps.includes("1ee6b"), "otra canción de YOASOBI");
});

test("un cover declarado va aparte", () => {
  const r = run("lisa-gurenge", { title: "紅蓮華", artists: ["LiSA"], videoType: ATV });
  assert.deepEqual(r.maps, []);
  assert.equal(r.others["19cc3"], "cover");
});

test("nombre de artista con barra", () => {
  const r = run("acdc-thunderstruck", { title: "AC/DC - Thunderstruck (Official Video)", artists: ["acdcVEVO"] });
  assert.deepEqual([...r.maps].sort(), ["461f3", "48851", "c9f"]);
  assert.deepEqual(r.others, {});
});

test("regrabaciones: (Taylor's Version) no es la grabación antigua", () => {
  const r = run("taylor-love-story", { title: "Love Story (Taylor's Version)", artists: ["Taylor Swift"], videoType: ATV });
  assert.deepEqual(r.maps, ["16902"]);
  assert.ok("a00b" in r.others);

  const old = run("taylor-love-story", { title: "Love Story", artists: ["Taylor Swift"], videoType: ATV });
  assert.ok(old.maps.includes("a00b"));
  assert.ok(!old.maps.includes("16902"));
});

test("los mapas salen ordenados de mejor a peor", () => {
  const { result } = run("imagine-dragons-believer", { title: "Believer", artists: ["Imagine Dragons"], videoType: ATV });
  assert.ok(result.maps.length >= 3);
  for (let i = 1; i < result.maps.length; i++) {
    assert.ok(result.maps[i - 1].score >= result.maps[i].score);
  }
  assert.equal(result.others.find((m) => m.id === "c63")?.version, "remix");
  for (const m of [...result.maps, ...result.others]) {
    assert.match(m.downloadURL, /^https:\/\/.+\.zip$/);
    assert.ok(m.diffs.length > 0);
  }
});
