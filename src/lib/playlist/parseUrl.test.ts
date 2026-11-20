import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePlaylistLink } from "./parseUrl.ts";

const PL = "PLQwVIlKxHM6qv-o99iX9R85og7IzF9YS_";

test("enlaces de YouTube Music y de YouTube", () => {
  for (const link of [
    `https://music.youtube.com/playlist?list=${PL}`,
    `https://music.youtube.com/playlist?list=${PL}&si=abc123`,
    `https://www.youtube.com/playlist?list=${PL}`,
    `https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=${PL}&index=3`,
    `https://youtu.be/dQw4w9WgXcQ?list=${PL}`,
    `music.youtube.com/playlist?list=${PL}`,
    `https://music.youtube.com/browse/VL${PL}`,
    `  ${PL}  `,
  ]) {
    assert.deepEqual(parsePlaylistLink(link), { ok: true, id: PL, kind: "playlist" }, link);
  }
});

test("álbumes y playlists de la casa", () => {
  assert.deepEqual(
    parsePlaylistLink("https://music.youtube.com/playlist?list=OLAK5uy_nMr9h2VlS-2PULNz3M3XVXQj_P3C2bqaY"),
    { ok: true, id: "OLAK5uy_nMr9h2VlS-2PULNz3M3XVXQj_P3C2bqaY", kind: "album" },
  );
  assert.deepEqual(
    parsePlaylistLink("https://music.youtube.com/playlist?list=RDCLAK5uy_mbdO3_xdD4NtU1rWI0OmvRSRZ8NH4uJCM"),
    { ok: true, id: "RDCLAK5uy_mbdO3_xdD4NtU1rWI0OmvRSRZ8NH4uJCM", kind: "playlist" },
  );
});

test("lo que no es una playlist pública", () => {
  for (const link of [
    "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://music.youtube.com/playlist?list=LM",
    "https://www.youtube.com/playlist?list=WL",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ",
    "https://music.youtube.com/playlist?list=RDAMPLPLQwVIlKxHM6qv-o99iX9R85og7IzF9YS_",
    "https://music.youtube.com/channel/UCkgCRdnnqWnUeIH7EIc3dBg",
  ]) {
    assert.deepEqual(parsePlaylistLink(link), { ok: false, reason: "not_playlist" }, link);
  }
});

test("lo que no es un enlace válido", () => {
  for (const link of [
    "",
    "hola",
    "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    "https://youtube.com.evil.example/playlist?list=" + PL,
    "https://music.youtube.com/playlist?list=../../etc",
    "javascript:alert(1)",
  ]) {
    assert.deepEqual(parsePlaylistLink(link), { ok: false, reason: "bad_link" }, link);
  }
});
