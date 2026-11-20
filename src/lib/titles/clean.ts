// Limpieza de títulos: separa lo que es la canción de todo lo que le cuelga
// YouTube ("(Official Video)", "[HD]", "feat. X", "Remastered 2011"...).
//
// La misma función se aplica al título de la playlist y al del mapa, para que
// los dos lados se comparen con las mismas reglas.
//
// Este archivo se ejecuta también con el ejecutor de pruebas de Node, así que
// las importaciones relativas llevan extensión y no se usa el alias "@/".

import type { Track, VersionTag } from "../types.ts";

export type ParsedTitle = {
  /** Título sin añadidos, para enseñar y para buscar. */
  base: string;
  /** Título normalizado y sin espacios: es lo que se compara. */
  key: string;
  /** Artistas invitados encontrados en el título. */
  feats: string[];
  /** Qué clase de versión es (vacío = la grabación tal cual). */
  tags: VersionTag[];
  /** Texto normalizado de cada marca de versión ("far out remix"). */
  descriptors: string[];
  /** Paréntesis que no son ni ruido ni versión conocida ("backstreets back"). */
  extras: string[];
};

export type Candidate = {
  title: ParsedTitle;
  artists: string[];
  /** Texto para el buscador. */
  query: string;
};

// ---------------------------------------------------------------------------
// Normalización
// ---------------------------------------------------------------------------

/** Minúsculas, sin tildes ni puntuación, espacios simples. Conserva cualquier alfabeto. */
export function norm(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // solo marcas latinas: los kana se quedan como están
    .normalize("NFC")
    .replace(/(?<=\p{L})\$|\$(?=\p{L})/gu, "s") // Ke$ha, A$AP
    .replace(/(?<=\p{L})!(?=\p{L})/gu, "i") // P!nk
    .replace(/&/g, " and ")
    .replace(/['’‘`´.]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Como `norm`, pero sin espacios: "AC/DC", "AC DC" y "ACDC" dan lo mismo. */
export function squash(input: string): string {
  return norm(input).replace(/ /g, "");
}

/** Parte "A, B & C" o "A x B" en nombres sueltos. */
export function splitNames(input: string): string[] {
  return input
    .split(/\s*(?:,|&|、|\/|\+|\bx\b|\band\b|\by\b|\bvs\.?\b|\bfeat\.?\b|\bft\.?\b|\bfeaturing\b|\bwith\b)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * ¿Aparece este artista en ese texto? Coincidencia por palabras completas
 * ("Sia" no está en "Asian Kung-Fu Generation") o igualdad sin espacios con
 * alguno de los nombres del texto.
 */
export function artistIn(artist: string, text: string): boolean {
  const a = norm(artist).replace(/^the /, "");
  const t = norm(text);
  if (!a || !t) return false;
  if (` ${t} `.includes(` ${a} `)) return true;
  const flat = flatName(artist);
  if (flat.length < 2) return false;
  return flatName(text) === flat || splitNames(text).some((part) => flatName(part) === flat);
}

/** Nombre sin espacios ni "the" inicial: "TheKidLAROI" y "The Kid LAROI" dan lo mismo. */
function flatName(name: string): string {
  return squash(name).replace(/^the(?=.{2})/, "");
}

// ---------------------------------------------------------------------------
// Clasificación de añadidos
// ---------------------------------------------------------------------------

type Piece =
  | { kind: "noise" }
  | { kind: "feat"; names: string[] }
  | { kind: "version"; tag: VersionTag; text: string }
  | { kind: "extra"; text: string };

const EXACT_NOISE = new Set([
  "hd", "hq", "4k", "8k", "uhd", "1080p", "720p", "60fps", "explicit", "clean", "dirty",
  "original", "original mix", "original version", "album version", "single version", "single",
  "radio edit", "radio version", "radio mix", "main version", "full version", "full ver",
  "full size", "full", "stereo", "mono", "deluxe", "deluxe edition", "deluxe version",
  "bonus track", "bonus", "new", "out now", "free download", "free dl", "studio version",
]);

const FEAT = /^(?:feat\.?|ft\.?|featuring|with|w\/)\s+(.+)$/i;

// Orden de prioridad: la primera que encaje da la etiqueta.
const VERSION_RULES: [VersionTag, RegExp][] = [
  ["nightcore", /\b(nightcore|nightstep)\b/],
  ["cover", /\b(cover|covered|covers)\b|カバー|歌ってみた/],
  ["mashup", /\b(mashup|mash up|medley)\b/],
  ["speed", /\b(sped up|speed up|slowed|reverb|daycore)\b|\b\d(?: \d+)?x\b/],
  ["short", /\b(tv size|tv ver|tv version|tv edit|short ver|short version|short edit|short|game size|game ver|game version|anime size|anime ver|movie size|movie ver|cut)\b/],
  ["extended", /\b(extended|long ver|long version)\b/],
  ["live", /\b(live|concert|unplugged|session|sessions|tour)\b|ライブ/],
  ["acoustic", /\b(acoustic|stripped|orchestral|piano version|piano ver)\b/],
  ["instrumental", /\b(instrumental|inst|karaoke|off vocal)\b|カラオケ/],
  ["remix", /\b(remix|remixed|rmx|bootleg|flip|rework|remake|vip|edit|mix|refix)\b|リミックス/],
  ["other", /\b(ver|version|demo|8 ?bit|chiptune|parody|arrange|arranged|arrangement)\b|アレンジ/],
];

const NOISE_RULES: RegExp[] = [
  /\b(official|oficial|officiel|offizielles?|ufficiale)\b/,
  /\b(lyrics?|letras?|paroles|subtitulad[oa]|subs?|subtitles|legendado|romaji|romanized|color coded)\b/,
  /\b(audio|video|videoclip|visuali[sz]er|mv|m v|pv|clip)\b/,
  /^(from|de la|del|aus)\b/,
  /\b(ost|soundtrack|opening|ending|op|ed|theme|theme song|insert song)\b/,
  /^prod\b|\bprod(?:uced)? by\b/,
];

function classify(content: string): Piece {
  const text = norm(content);
  if (!text) return { kind: "noise" };
  if (EXACT_NOISE.has(text)) return { kind: "noise" };
  if (/\bremaster(ed)?\b/.test(text) || /^\d{4}(?: version)?$/.test(text)) return { kind: "noise" };

  const feat = content.trim().match(FEAT);
  if (feat) return { kind: "feat", names: splitNames(feat[1]) };

  for (const [tag, rule] of VERSION_RULES) {
    if (rule.test(text)) return { kind: "version", tag, text };
  }
  for (const rule of NOISE_RULES) {
    if (rule.test(text)) return { kind: "noise" };
  }
  return { kind: "extra", text };
}

/** Etiquetas de versión conocidas que hay en un texto suelto (subtítulo, nombre del mapa). */
export function versionOf(text: string): { tag: VersionTag; text: string } | null {
  const piece = classify(text);
  return piece.kind === "version" ? { tag: piece.tag, text: piece.text } : null;
}

// ---------------------------------------------------------------------------
// Título
// ---------------------------------------------------------------------------

const BRACKETS = /[(\[{【（［〔]([^()\[\]{}【】（）［］〔〕]*)[)\]}】）］〕]/g;
const DASH = /\s+[-–—|]+\s+|\s+\/\/\s+/;
const TRAILING_FEAT = /\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/i;
const TRAILING_NOISE =
  /[\s\-–—|]*\b(?:official\s+(?:music\s+|lyric\s+)?(?:video|audio|mv|visuali[sz]er)|lyrics?\s+video|music\s+video|with\s+lyrics|lyrics|m\/v|mv|hd|hq|4k)\s*$/i;

export function parseTitle(raw: string): ParsedTitle {
  const feats: string[] = [];
  const tags: VersionTag[] = [];
  const descriptors: string[] = [];
  const extras: string[] = [];

  const take = (piece: Piece) => {
    if (piece.kind === "feat") feats.push(...piece.names);
    else if (piece.kind === "version") {
      if (!tags.includes(piece.tag)) tags.push(piece.tag);
      descriptors.push(piece.text);
    } else if (piece.kind === "extra") extras.push(piece.text);
  };

  // 1. Paréntesis y corchetes, de dentro hacia fuera.
  let rest = raw.normalize("NFKC");
  for (let guard = 0; guard < 8; guard++) {
    const next = rest.replace(BRACKETS, (_all, content: string) => {
      take(classify(content));
      return " ";
    });
    if (next === rest) break;
    rest = next;
  }
  rest = rest.replace(/[()\[\]{}【】〔〕]/g, " ");

  // 2. Colas sin paréntesis: "... feat. X", "... Official Video".
  for (let guard = 0; guard < 6; guard++) {
    const before = rest;
    const feat = rest.match(TRAILING_FEAT);
    if (feat) {
      feats.push(...splitNames(feat[1]));
      rest = rest.slice(0, feat.index);
    }
    rest = rest.replace(TRAILING_NOISE, "");
    if (rest === before) break;
  }

  // 3. Segmentos finales tras un guion: "- Remastered 2011", "- Live at Wembley".
  const segments = rest.split(DASH).map((s) => s.trim()).filter(Boolean);
  while (segments.length > 1) {
    const piece = classify(segments[segments.length - 1]);
    if (piece.kind === "extra") break;
    take(piece);
    segments.pop();
  }

  const base = segments
    .join(" - ")
    .replace(/\s+/g, " ")
    .replace(/^["“”'‘’\s]+|["“”'‘’\s]+$/g, "")
    .trim();

  return {
    base,
    key: squash(base),
    feats: unique(feats),
    tags: tags.sort(),
    descriptors: unique(descriptors).sort(),
    extras: unique(extras).sort(),
  };
}

/** El mismo título con otra base (para probar "Artista - Título" partido). */
export function withBase(title: ParsedTitle, base: string): ParsedTitle {
  const clean = base.replace(/\s+/g, " ").trim();
  return { ...title, base: clean, key: squash(clean) };
}

// ---------------------------------------------------------------------------
// Canción de la playlist -> candidatos de búsqueda
// ---------------------------------------------------------------------------

/** Quita lo que YouTube añade al nombre del canal: " - Topic", "VEVO", "Official". */
export function cleanArtist(name: string): string {
  return name
    .replace(/\s*-\s*topic$/i, "")
    .replace(/\s*vevo$/i, "")
    .replace(/\s+official(?:\s+channel)?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

const QUOTED = /^(.*?)[「『]([^」』]+)[」』]/;

/**
 * De una canción de la playlist saca una o dos lecturas posibles (artista + título).
 * El audio oficial ya viene separado; los vídeos suelen traer "Artista - Título"
 * todo junto en el título, con el canal como artista.
 */
export function buildCandidates(track: Pick<Track, "title" | "artists" | "videoType">): Candidate[] {
  const parsed = parseTitle(track.title);
  const given = unique(track.artists.map(cleanArtist).filter(Boolean));
  const everyone = unique([...given, ...parsed.feats]);
  const official = track.videoType === "MUSIC_VIDEO_TYPE_ATV";
  const out: Candidate[] = [];
  let sure = false;

  const add = (title: ParsedTitle, artists: string[]) => {
    if (!title.key) return;
    if (out.some((c) => c.title.key === title.key && c.artists.join("|") === artists.join("|"))) return;
    out.push({ title, artists, query: `${artists[0] ?? ""} ${title.base}`.trim().slice(0, 120) });
  };

  if (!official) {
    // Estilo japonés: Artista「Título」
    const quoted = track.title.normalize("NFKC").match(QUOTED);
    if (quoted && quoted[2].trim()) {
      const who = cleanArtist(quoted[1].replace(/[-–—|/]+\s*$/, "").trim());
      add(withBase(parsed, quoted[2]), unique([...namesIn(who), ...everyone]));
      sure = true;
    }

    const parts = parsed.base.split(/\s+[-–—]\s+/);
    if (parts.length >= 2) {
      const left = parts[0];
      const right = parts.slice(1).join(" - ");
      const leftIsArtist = given.some((a) => artistIn(a, left));
      const rightIsArtist = given.some((a) => artistIn(a, right));

      if (rightIsArtist && !leftIsArtist) {
        // "Título - Artista"
        add(withBase(parsed, left), unique([...namesIn(right), ...everyone]));
        sure = true;
      } else if (leftIsArtist) {
        // "Artista - Título", y el canal es el propio artista
        add(withBase(parsed, right), unique([...namesIn(left), ...everyone]));
        sure = true;
      } else {
        // El canal no es el artista (subidas de terceros): manda lo que dice el título.
        add(withBase(parsed, right), unique([...namesIn(left), ...parsed.feats]));
      }
    }
  }

  // La lectura literal sobra cuando ya se sabe cuál de las dos partes es el artista.
  if (!sure) add(parsed, everyone);
  return out;
}

/** El nombre entero y, detrás, cada nombre suelto ("A & B" -> "A & B", "A", "B"). */
function namesIn(text: string): string[] {
  const whole = text.trim();
  if (!whole) return [];
  return unique([whole, ...splitNames(whole).filter((part) => part.length > 2)]);
}

function unique<T>(list: T[]): T[] {
  return [...new Set(list)];
}
