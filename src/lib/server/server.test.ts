import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import type { BsMap } from "../beatsaver/types.ts";
import { MAX_SEARCHES, matchTrack } from "../match/matchTrack.ts";
import { Backoff, CONCURRENCY, enqueue } from "./queue.ts";
import { LIMITS, take } from "./rateLimit.ts";

const ATV = "MUSIC_VIDEO_TYPE_ATV";
const fixture = (name: string): BsMap[] =>
  JSON.parse(readFileSync(join(import.meta.dirname, "../match/fixtures", `${name}.json`), "utf8")).docs;

test("una canción con mapas se resuelve con una sola búsqueda", async () => {
  const asked: string[] = [];
  const result = await matchTrack(
    { title: "Harder, Better, Faster, Stronger", artists: ["Daft Punk"], videoType: ATV },
    async (q) => {
      asked.push(q);
      return fixture("daft-punk-hbfs");
    },
  );
  assert.equal(asked.length, 1);
  assert.match(asked[0], /daft punk/i);
  assert.ok(result.maps.length >= 3);
  assert.ok(result.others.every((m) => m.version));
});

test("si la primera búsqueda no da nada, prueba con el título a secas y ahí para", async () => {
  const asked: string[] = [];
  const result = await matchTrack(
    { title: "Copenhague", artists: ["Vetusta Morla"], videoType: ATV },
    async (q) => {
      asked.push(q);
      return [];
    },
  );
  assert.deepEqual(asked, ["Vetusta Morla Copenhague", "Copenhague"]);
  assert.ok(asked.length <= MAX_SEARCHES);
  assert.deepEqual(result, { maps: [], others: [] });
});

test("lo que llega en la segunda búsqueda también cuenta", async () => {
  let calls = 0;
  const result = await matchTrack(
    { title: "Thunderstruck", artists: ["AC/DC"], videoType: ATV },
    async () => (++calls === 1 ? [] : fixture("acdc-thunderstruck")),
  );
  assert.equal(calls, 2);
  assert.ok(result.maps.length > 0);
});

test("la cola no deja pasar más de unas pocas tareas a la vez", async () => {
  let running = 0;
  let peak = 0;
  const task = async () => {
    peak = Math.max(peak, ++running);
    await new Promise((r) => setTimeout(r, 15));
    running--;
    return 1;
  };
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => enqueue(`t${i}`, task)));
  assert.equal(results.length, 20);
  assert.equal(peak, CONCURRENCY);
});

test("dos búsquedas iguales a la vez comparten una sola salida", async () => {
  let calls = 0;
  const task = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 10));
    return "ok";
  };
  const [a, b] = await Promise.all([enqueue("misma", task), enqueue("misma", task)]);
  assert.equal(a, "ok");
  assert.equal(b, "ok");
  assert.equal(calls, 1);
});

test("si piden frenar, la tarea espera y se reintenta", async () => {
  let calls = 0;
  const started = Date.now();
  const value = await enqueue("freno", async () => {
    if (++calls === 1) throw new Backoff(50);
    return "al segundo intento";
  });
  assert.equal(value, "al segundo intento");
  assert.equal(calls, 2);
  assert.ok(Date.now() - started >= 50);
});

test("los fallos normales no se reintentan", async () => {
  let calls = 0;
  await assert.rejects(
    enqueue("fallo", async () => {
      calls++;
      throw new Error("roto");
    }),
    /roto/,
  );
  assert.equal(calls, 1);
});

test("tope por visitante: ráfaga, espera y recuperación", () => {
  const now = 1_000_000;
  const { capacity, perSecond } = LIMITS.playlist;
  for (let i = 0; i < capacity; i++) assert.equal(take("playlist", "v1", now), 0);
  const wait = take("playlist", "v1", now);
  assert.ok(wait > 0 && wait <= Math.ceil(1 / perSecond));
  // Otro visitante no se ve afectado.
  assert.equal(take("playlist", "v2", now), 0);
  // Pasado el tiempo que se le dijo, vuelve a poder.
  assert.equal(take("playlist", "v1", now + wait * 1000), 0);
});

test("una playlist entera cabe en el tope de búsquedas", () => {
  const now = 2_000_000;
  // 500 canciones a 10 por segundo, que es más rápido de lo que va la web.
  for (let i = 0; i < 500; i++) assert.equal(take("match", "grande", now + i * 100), 0);
});
