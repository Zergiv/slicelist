import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTrackLink } from "./parseTrack.ts";

const SP = "4cOdK2wGLETKBW3PvgPWqT";
const YT = "kOn-HdEg6AQ";

describe("parseTrackLink", () => {
  it("acepta pistas de Spotify", () => {
    assert.deepEqual(parseTrackLink(`https://open.spotify.com/track/${SP}`), {
      ok: true,
      kind: "spotify",
      id: SP,
    });
    assert.deepEqual(parseTrackLink(`spotify:track:${SP}`), {
      ok: true,
      kind: "spotify",
      id: SP,
    });
  });

  it("acepta vídeos de YouTube y YouTube Music", () => {
    assert.deepEqual(parseTrackLink(`https://www.youtube.com/watch?v=${YT}`), {
      ok: true,
      kind: "youtube",
      id: YT,
    });
    assert.deepEqual(parseTrackLink(`https://music.youtube.com/watch?v=${YT}&list=RD`), {
      ok: true,
      kind: "youtube",
      id: YT,
    });
    assert.deepEqual(parseTrackLink(`https://youtu.be/${YT}`), {
      ok: true,
      kind: "youtube",
      id: YT,
    });
  });

  it("rechaza playlists y texto suelto", () => {
    assert.equal(parseTrackLink("https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd").ok, false);
    assert.equal(parseTrackLink("beat it michael jackson").ok, false);
    assert.equal(parseTrackLink("").ok, false);
  });
});
