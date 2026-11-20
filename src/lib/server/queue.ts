// Cola global: todo lo que sale hacia BeatSaver pasa por aquí, para no
// mandarle más de unas pocas peticiones a la vez, visite quien visite.

export class Backoff extends Error {
  /** Cuánto esperar antes de reintentar, en ms. */
  waitMs: number;
  constructor(waitMs: number) {
    super("backoff");
    this.name = "Backoff";
    this.waitMs = waitMs;
  }
}

export class QueueFull extends Error {
  constructor() {
    super("queue full");
    this.name = "QueueFull";
  }
}

type State = {
  active: number;
  waiting: (() => void)[];
  /** No se lanza nada nuevo antes de este instante (tras un "vas muy rápido"). */
  pausedUntil: number;
  inflight: Map<string, Promise<unknown>>;
};

const globals = globalThis as { __slicelistQueue?: State };
const fresh: State = { active: 0, waiting: [], pausedUntil: 0, inflight: new Map() };
const state: State = (globals.__slicelistQueue ??= fresh);

export const CONCURRENCY = 4;
const MAX_WAITING = 2000;
const MAX_ATTEMPTS = 4;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function acquire(): Promise<void> {
  if (state.active < CONCURRENCY) {
    state.active++;
    return;
  }
  if (state.waiting.length >= MAX_WAITING) throw new QueueFull();
  // Quien libera el hueco se lo pasa directamente al siguiente.
  await new Promise<void>((resolve) => state.waiting.push(resolve));
}

function release(): void {
  const next = state.waiting.shift();
  if (next) next();
  else state.active--;
}

/**
 * Ejecuta `task` respetando el límite. Si `task` lanza `Backoff`, toda la cola
 * espera y esa tarea se reintenta. Dos llamadas con la misma `key` comparten
 * una sola ejecución.
 */
export function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const running = state.inflight.get(key) as Promise<T> | undefined;
  if (running) return running;

  const promise = (async () => {
    await acquire();
    try {
      for (let attempt = 1; ; attempt++) {
        const pause = state.pausedUntil - Date.now();
        if (pause > 0) await sleep(pause);
        try {
          return await task();
        } catch (err) {
          if (!(err instanceof Backoff) || attempt >= MAX_ATTEMPTS) throw err;
          const wait = Math.min(30_000, Math.max(err.waitMs, 500 * 2 ** attempt));
          state.pausedUntil = Math.max(state.pausedUntil, Date.now() + wait);
        }
      }
    } finally {
      release();
    }
  })();

  state.inflight.set(key, promise);
  const forget = () => {
    if (state.inflight.get(key) === promise) state.inflight.delete(key);
  };
  promise.then(forget, forget);
  return promise;
}

export function queueStats() {
  return { active: state.active, waiting: state.waiting.length };
}
