// Caché en disco (SQLite, el que trae Node). Guarda JSON con caducidad.
// Vive en `data/cache.db`; se puede borrar sin miedo, solo se pierde lo guardado.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type StatementSync } from "node:sqlite";

type Store = {
  get: StatementSync;
  set: StatementSync;
  prune: StatementSync;
  writes: number;
};

const globals = globalThis as { __slicelistCache?: Store };

function open(): Store {
  const dir = process.env.SLICELIST_DATA_DIR || join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(join(dir, "cache.db"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 3000;
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires INTEGER NOT NULL
    ) WITHOUT ROWID;
    CREATE INDEX IF NOT EXISTS cache_expires ON cache (expires);
  `);
  return {
    get: db.prepare("SELECT value FROM cache WHERE key = ? AND expires > ?"),
    set: db.prepare(
      "INSERT INTO cache (key, value, expires) VALUES (?, ?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires = excluded.expires",
    ),
    prune: db.prepare("DELETE FROM cache WHERE expires <= ?"),
    writes: 0,
  };
}

function store(): Store {
  // Una sola conexión por proceso, también al recargar en desarrollo.
  return (globals.__slicelistCache ??= open());
}

export function cacheGet<T>(key: string): T | undefined {
  try {
    const row = store().get.get(key, Date.now()) as { value: string } | undefined;
    return row ? (JSON.parse(row.value) as T) : undefined;
  } catch (err) {
    console.error("[cache] no se pudo leer", err);
    return undefined;
  }
}

export function cacheSet(key: string, value: unknown, ttlMs: number): void {
  try {
    const s = store();
    s.set.run(key, JSON.stringify(value), Date.now() + ttlMs);
    // De vez en cuando se tira lo caducado.
    if (++s.writes % 200 === 0) s.prune.run(Date.now());
  } catch (err) {
    console.error("[cache] no se pudo guardar", err);
  }
}

export const HOUR = 60 * 60 * 1000;
export const MINUTE = 60 * 1000;
