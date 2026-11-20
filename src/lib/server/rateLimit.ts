// Tope por visitante (cubo de fichas en memoria). Sirve para que una sola
// persona no acapare la cola; no pretende ser una defensa contra ataques.

type Bucket = { tokens: number; at: number };

type Limit = {
  /** Ráfaga permitida. */
  capacity: number;
  /** Fichas que se recuperan por segundo. */
  perSecond: number;
};

export const LIMITS = {
  // Una playlist de 500 canciones cabe entera sin frenazos.
  match: { capacity: 300, perSecond: 8 },
  playlist: { capacity: 10, perSecond: 1 / 6 },
} satisfies Record<string, Limit>;

const globals = globalThis as { __slicelistBuckets?: Map<string, Bucket> };
const buckets = (globals.__slicelistBuckets ??= new Map());
const MAX_BUCKETS = 20_000;

/** Quién llama. Detrás del túnel, la dirección real viene en estas cabeceras. */
export function visitorOf(request: Request): string {
  const headers = request.headers;
  const ip =
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local";
  return ip.slice(0, 64);
}

/**
 * Gasta una ficha. Devuelve 0 si se puede seguir, o los segundos que hay que
 * esperar si se ha pasado.
 */
export function take(kind: keyof typeof LIMITS, visitor: string, now = Date.now()): number {
  const limit: Limit = LIMITS[kind];
  const key = `${kind}:${visitor}`;
  let bucket = buckets.get(key);

  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) prune(now);
    bucket = { tokens: limit.capacity, at: now };
    buckets.set(key, bucket);
  } else {
    const gained = ((now - bucket.at) / 1000) * limit.perSecond;
    bucket.tokens = Math.min(limit.capacity, bucket.tokens + gained);
    bucket.at = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return 0;
  }
  return Math.max(1, Math.ceil((1 - bucket.tokens) / limit.perSecond));
}

function prune(now: number) {
  // Fuera los que llevan más de diez minutos sin aparecer; si aun así no
  // cabe, se vacía entero (solo se pierde la cuenta de fichas).
  for (const [key, bucket] of buckets) {
    if (now - bucket.at > 10 * 60 * 1000) buckets.delete(key);
  }
  if (buckets.size >= MAX_BUCKETS) buckets.clear();
}
