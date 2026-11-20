import assert from "node:assert/strict";
import { test } from "node:test";
import { artistIn, buildCandidates, cleanArtist, norm, parseTitle, squash } from "./clean.ts";

test("normaliza sin romper otros alfabetos", () => {
  assert.equal(norm("Harder, Better, Faster, Stronger!"), "harder better faster stronger");
  assert.equal(norm("Beyoncé & JAY-Z"), "beyonce and jay z");
  assert.equal(norm("Guns N' Roses"), "guns n roses");
  assert.equal(norm("P!nk"), "pink");
  assert.equal(norm("Ke$ha"), "kesha");
  assert.equal(norm("夜に駆ける"), "夜に駆ける");
  assert.equal(norm("ずっと真夜中でいいのに。"), "ずっと真夜中でいいのに");
  assert.equal(squash("AC/DC"), squash("ACDC"));
  assert.equal(squash("AC DC"), squash("ACDC"));
});

test("quita el ruido de YouTube del título", () => {
  const cases: [string, string][] = [
    ["Bohemian Rhapsody (Official Video Remastered)", "Bohemian Rhapsody"],
    ["Bohemian Rhapsody - Remastered 2011", "Bohemian Rhapsody"],
    ["Mr. Brightside [HD]", "Mr. Brightside"],
    ["Blinding Lights (Official Audio)", "Blinding Lights"],
    ["Blinding Lights (Lyrics)", "Blinding Lights"],
    ["Blinding Lights Official Music Video", "Blinding Lights"],
    ["Numb [Official Music Video] [4K UPGRADE]", "Numb"],
    ["Smooth Criminal (2012 Remaster)", "Smooth Criminal"],
    ["Titanium (feat. Sia) [Official Video]", "Titanium"],
    ["【MV】アイドル (Official Music Video)", "アイドル"],
    ["Levels - Radio Edit", "Levels"],
    ["Gurenge (From \"Demon Slayer\")", "Gurenge"],
    ["Unravel (Tokyo Ghoul OP)", "Unravel"],
  ];
  for (const [raw, base] of cases) {
    const parsed = parseTitle(raw);
    assert.equal(parsed.base, base, raw);
    assert.deepEqual(parsed.tags, [], raw);
  }
});

test("los invitados se guardan, no se tiran", () => {
  assert.deepEqual(parseTitle("Titanium (feat. Sia)").feats, ["Sia"]);
  assert.deepEqual(parseTitle("Stay (with Justin Bieber)").feats, ["Justin Bieber"]);
  assert.deepEqual(parseTitle("Walk On Water (feat. Beyoncé)").feats, ["Beyoncé"]);
  assert.deepEqual(parseTitle("Lean On ft. MØ & DJ Snake").feats, ["MØ", "DJ Snake"]);
  assert.equal(parseTitle("Lean On ft. MØ & DJ Snake").base, "Lean On");
});

test("reconoce versiones que no son la grabación original", () => {
  const cases: [string, string, string][] = [
    ["Harder, Better, Faster, Stronger (Far Out Remix)", "Harder, Better, Faster, Stronger", "remix"],
    ["Believer (Nightcore)", "Believer", "nightcore"],
    ["Hallelujah (Live at Wembley)", "Hallelujah", "live"],
    ["Hallelujah - Live", "Hallelujah", "live"],
    ["Zombie (Acoustic)", "Zombie", "acoustic"],
    ["Unravel (TV Size)", "Unravel", "short"],
    ["Bad Apple!! (Instrumental)", "Bad Apple!!", "instrumental"],
    ["Stay (Our Last Night Rock Cover)", "Stay", "cover"],
    ["Love Story (Taylor's Version)", "Love Story", "other"],
    ["Mr. Blue Sky (Sped Up)", "Mr. Blue Sky", "speed"],
  ];
  for (const [raw, base, tag] of cases) {
    const parsed = parseTitle(raw);
    assert.equal(parsed.base, base, raw);
    assert.deepEqual(parsed.tags, [tag], raw);
  }
});

test("un paréntesis desconocido no es ruido ni versión", () => {
  const parsed = parseTitle("Everybody (Backstreet's Back)");
  assert.equal(parsed.base, "Everybody");
  assert.deepEqual(parsed.tags, []);
  assert.deepEqual(parsed.extras, ["backstreets back"]);
});

test("limpia el nombre del canal", () => {
  assert.equal(cleanArtist("Daft Punk - Topic"), "Daft Punk");
  assert.equal(cleanArtist("DaftPunkVEVO"), "DaftPunk");
  assert.equal(cleanArtist("Queen Official"), "Queen");
});

test("el artista se busca por palabras completas", () => {
  assert.equal(artistIn("Sia", "Asian Kung-Fu Generation"), false);
  assert.equal(artistIn("Sia", "David Guetta feat. Sia"), true);
  assert.equal(artistIn("Daft Punk", "daft punk"), true);
  assert.equal(artistIn("DaftPunk", "Daft Punk"), true);
  assert.equal(artistIn("AC/DC", "ACDC"), true);
  assert.equal(artistIn("The Beatles", "Beatles"), true);
  assert.equal(artistIn("TheKidLAROI", "The Kid LAROI, Justin Bieber"), true);
  assert.equal(artistIn("Rihanna", "BLACKPINK"), false);
  assert.equal(artistIn("YOASOBI", "Ayase/Yoasobi"), true);
});

test("audio oficial: el título y los artistas ya vienen separados", () => {
  const [only, ...rest] = buildCandidates({
    title: "Harder, Better, Faster, Stronger",
    artists: ["Daft Punk"],
    videoType: "MUSIC_VIDEO_TYPE_ATV",
  });
  assert.equal(rest.length, 0);
  assert.equal(only.title.base, "Harder, Better, Faster, Stronger");
  assert.deepEqual(only.artists, ["Daft Punk"]);
  assert.equal(only.query, "Daft Punk Harder, Better, Faster, Stronger");
});

test("audio oficial con guion en el título: no se parte", () => {
  const cands = buildCandidates({
    title: "Symphony No. 5 - Allegro con brio",
    artists: ["Ludwig van Beethoven"],
    videoType: "MUSIC_VIDEO_TYPE_ATV",
  });
  assert.equal(cands.length, 1);
  assert.equal(cands[0].title.base, "Symphony No. 5 - Allegro con brio");
});

test("vídeo con 'Artista - Título' y el canal del propio artista", () => {
  const cands = buildCandidates({
    title: "Queen – Bohemian Rhapsody (Official Video Remastered)",
    artists: ["Queen Official"],
  });
  assert.equal(cands.length, 1);
  assert.equal(cands[0].title.base, "Bohemian Rhapsody");
  assert.ok(cands[0].artists.includes("Queen"));

  const acdc = buildCandidates({ title: "AC/DC - Thunderstruck (Official Video)", artists: ["acdcVEVO"] });
  assert.equal(acdc.length, 1);
  assert.equal(acdc[0].title.base, "Thunderstruck");
  assert.equal(acdc[0].artists[0], "AC/DC");
});

test("vídeo subido por terceros: manda lo que dice el título y queda la lectura literal", () => {
  const cands = buildCandidates({
    title: "Darude - Sandstorm (Lyrics)",
    artists: ["7clouds"],
  });
  assert.equal(cands[0].title.base, "Sandstorm");
  assert.deepEqual(cands[0].artists, ["Darude"]);
  assert.equal(cands[1].title.base, "Darude - Sandstorm");
});

test("vídeo con 'Título - Artista'", () => {
  const cands = buildCandidates({ title: "Sandstorm - Darude", artists: ["Darude"] });
  assert.equal(cands.length, 1);
  assert.equal(cands[0].title.base, "Sandstorm");
});

test("estilo japonés: Artista「Título」", () => {
  const cands = buildCandidates({ title: "YOASOBI「アイドル」 Official Music Video", artists: ["Ayase / YOASOBI"] });
  assert.equal(cands[0].title.base, "アイドル");
  assert.ok(cands[0].artists.includes("YOASOBI"));
});
