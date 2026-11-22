import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entryKey, removeHistory, upsertHistory, type HistoryEntry } from "./store.ts";

const pl = (link: string, title = "Lista"): HistoryEntry => ({
  kind: "playlist",
  id: "id",
  title,
  link,
  at: 1,
});

const song = (title: string, artists: string[]): HistoryEntry => ({
  kind: "song",
  title,
  artists,
  at: 1,
});

describe("upsertHistory", () => {
  it("pone la nueva arriba y no duplica", () => {
    const first = pl("https://a", "A");
    const second = pl("https://b", "B");
    const again = { ...pl("https://a", "A2"), at: 9 };
    let list = upsertHistory([], first);
    list = upsertHistory(list, second);
    list = upsertHistory(list, again);
    assert.equal(list.length, 2);
    assert.equal(list[0]?.kind === "playlist" && list[0].title, "A2");
    assert.equal(list[1]?.kind === "playlist" && list[1].title, "B");
  });

  it("deduplica canciones por título y artistas", () => {
    const a = song("Beat It", ["Michael Jackson"]);
    const b = song("beat it", ["michael jackson"]);
    const list = upsertHistory([a], { ...b, at: 2, thumb: "x" });
    assert.equal(list.length, 1);
    assert.equal(list[0]?.kind === "song" && list[0].thumb, "x");
  });
});

describe("removeHistory", () => {
  it("quita por clave", () => {
    const a = pl("https://a");
    const b = song("X", ["Y"]);
    const list = removeHistory([a, b], entryKey(a));
    assert.deepEqual(list, [b]);
  });
});
