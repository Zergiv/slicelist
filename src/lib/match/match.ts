// Coincidencia real entre una canción de la playlist y los mapas que devuelve
// el buscador. Que el buscador lo devuelva no basta: el título tiene que ser el
// mismo y el artista tiene que aparecer en los datos del mapa.
//
// - "maps": la grabación tal cual. Es lo que cuenta el contador.
// - "others": mismo título y artista mencionado, pero otra versión (remix,
//   cover, directo, nightcore...). Se enseñan aparte.
//
// Se ejecuta también con el ejecutor de pruebas de Node: importaciones relativas
// con extensión y sin alias.

import type { BsMap } from "../beatsaver/types.ts";
import {
  artistIn,
  parseTitle,
  squash,
  versionOf,
  type Candidate,
  type ParsedTitle,
} from "../titles/clean.ts";
import type { BeatMap, MatchResult, VersionTag } from "../types.ts";

const TAG_PRIORITY: VersionTag[] = [
  "nightcore",
  "cover",
  "mashup",
  "remix",
  "live",
  "acoustic",
  "instrumental",
  "speed",
  "short",
  "extended",
  "other",
];

type Verdict = { kind: "original" } | { kind: "other"; version: VersionTag } | null;

type Alias = { key: string; author: string };

/**
 * Todas las formas en que un mapa puede llevar escrito el título: el campo de
 * canción, con su subtítulo, partido por guion ("Artista - Título") o por barra
 * ("Into the Night/夜に駆ける"), lo que lleve entre paréntesis y lo mismo con el
 * nombre del mapa. Cada forma recuerda qué texto quedó fuera, por si es el artista.
 */
function aliases(song: ParsedTitle, sub: string, name: ParsedTitle): Alias[] {
  const out: Alias[] = [];
  const add = (text: string, author = "") => {
    const key = squash(text);
    if (key && !out.some((a) => a.key === key)) out.push({ key, author });
  };
  const spread = (base: string) => {
    add(base);
    const dashed = base.split(/\s+[-–—|]+\s+/).filter(Boolean);
    dashed.forEach((part, i) => {
      const others = dashed.filter((_, j) => j !== i).join(" / ");
      if (dashed.length > 1) add(part, others);
      const slashed = part.split(/\s*[\/／]\s*/).filter(Boolean);
      if (slashed.length > 1) slashed.forEach((piece) => add(piece, others));
    });
  };

  spread(song.base);
  if (sub) {
    add(`${song.base} ${sub}`);
    const subTitle = parseTitle(sub);
    if (subTitle.tags.length === 0) add(subTitle.base);
  }
  song.extras.forEach((extra) => add(extra));
  spread(name.base);
  name.extras.forEach((extra) => add(extra));
  return out;
}

/** ¿Qué es este mapa respecto a la canción buscada? */
export function judge(candidate: Candidate, map: BsMap): Verdict {
  const meta = map.metadata;
  const song = parseTitle(meta.songName ?? "");
  const name = parseTitle(map.name ?? "");
  const sub = (meta.songSubName ?? "").trim();

  const alias = aliases(song, sub, name).find((a) => a.key === candidate.title.key);
  if (!alias) return null;

  // Versión del mapa: lo que digan su título, su subtítulo, su nombre y sus etiquetas.
  const mapTitle: ParsedTitle = {
    ...song,
    tags: [...song.tags],
    descriptors: [...song.descriptors],
    extras: song.extras.filter((e) => e.replace(/ /g, "") !== alias.key),
  };
  const addVersion = (v: { tag: VersionTag; text: string } | null) => {
    if (!v) return;
    if (!mapTitle.tags.includes(v.tag)) mapTitle.tags.push(v.tag);
    if (!mapTitle.descriptors.includes(v.text)) mapTitle.descriptors.push(v.text);
  };
  if (sub) addVersion(versionOf(sub));
  for (const text of name.descriptors) {
    const found = versionOf(text);
    if (found && !mapTitle.tags.includes(found.tag)) addVersion(found);
  }
  if (map.tags?.includes("nightcore")) addVersion({ tag: "nightcore", text: "nightcore" });

  // Artista: fuerte si está en el campo de autor; débil si solo se le menciona.
  const authorField = meta.songAuthorName ?? "";
  const authorText = [authorField, ...song.feats].filter(Boolean).join(" / ");
  const mentions = [map.name ?? "", sub, alias.author].filter(Boolean).join(" / ");
  const strong = candidate.artists.some((a) => artistIn(a, authorText));
  const weak = candidate.artists.some((a) => artistIn(a, mentions));
  const authorEmpty = squash(authorField) === "";

  if (!strong && !weak) return null;

  const same = sameVersion(candidate.title, mapTitle);
  if (same && (strong || authorEmpty)) return { kind: "original" };

  const extra = TAG_PRIORITY.find(
    (tag) => mapTitle.tags.includes(tag) && !candidate.title.tags.includes(tag),
  );
  // Otro artista en el campo de autor y el nuestro solo mencionado: es un cover.
  return { kind: "other", version: extra ?? (!strong && !authorEmpty ? "cover" : "other") };
}

/** ¿Las dos partes describen la misma versión de la canción? */
function sameVersion(a: ParsedTitle, b: ParsedTitle): boolean {
  if (a.tags.length !== b.tags.length) return false;
  if (a.tags.some((tag) => !b.tags.includes(tag))) return false;

  if (a.tags.length > 0) {
    // Dos remixes solo son el mismo si los firma el mismo: "far out remix".
    const da = a.descriptors.map((d) => d.replace(/ /g, "")).sort().join("|");
    const db = b.descriptors.map((d) => d.replace(/ /g, "")).sort().join("|");
    if (da !== db && !da.includes(db) && !db.includes(da)) return false;
  }

  // Paréntesis desconocidos ("Part 2"): si los dos los llevan, tienen que coincidir.
  if (a.extras.length > 0 && b.extras.length > 0) {
    const eb = new Set(b.extras.map((e) => e.replace(/ /g, "")));
    if (!a.extras.some((e) => eb.has(e.replace(/ /g, "")))) return false;
  }
  return true;
}

/** Pasa un mapa de BeatSaver a la forma que usa la interfaz. */
export function toBeatMap(map: BsMap, version?: VersionTag): BeatMap | null {
  const published =
    [...map.versions].reverse().find((v) => v.state === "Published") ??
    map.versions[map.versions.length - 1];
  if (!published) return null;

  return {
    id: map.id,
    hash: published.hash,
    name: map.name,
    songName: map.metadata.songName,
    songSubName: map.metadata.songSubName ?? "",
    songAuthor: map.metadata.songAuthorName ?? "",
    mapper: map.metadata.levelAuthorName ?? "",
    durationSeconds: map.metadata.duration,
    bpm: map.metadata.bpm,
    score: map.stats.score,
    upvotes: map.stats.upvotes,
    downvotes: map.stats.downvotes,
    coverURL: published.coverURL,
    previewURL: published.previewURL,
    downloadURL: published.downloadURL,
    diffs: published.diffs.map((d) => ({
      characteristic: d.characteristic,
      difficulty: d.difficulty,
    })),
    curated: Boolean(map.curatedAt),
    ranked: Boolean(map.ranked || map.blRanked),
    ...(version ? { version } : {}),
  };
}

/** Mejor primero: puntuación y, a igualdad, más votos. */
export function byScore(a: BeatMap, b: BeatMap): number {
  return b.score - a.score || b.upvotes - a.upvotes;
}

/** Filtra los resultados del buscador para una lectura de la canción. */
export function matchMaps(candidate: Candidate, docs: BsMap[]): MatchResult {
  const maps: BeatMap[] = [];
  const others: BeatMap[] = [];
  const seen = new Set<string>();

  for (const doc of docs) {
    if (seen.has(doc.id) || doc.automapper) continue;
    const verdict = judge(candidate, doc);
    if (!verdict) continue;
    const map = toBeatMap(doc, verdict.kind === "other" ? verdict.version : undefined);
    if (!map) continue;
    seen.add(doc.id);
    (verdict.kind === "original" ? maps : others).push(map);
  }

  return { maps: maps.sort(byScore), others: others.sort(byScore) };
}

/** Une los resultados de varias lecturas sin repetir mapas. */
export function mergeResults(results: MatchResult[]): MatchResult {
  const maps = new Map<string, BeatMap>();
  const others = new Map<string, BeatMap>();
  for (const r of results) for (const m of r.maps) maps.set(m.id, m);
  for (const r of results) for (const m of r.others) if (!maps.has(m.id)) others.set(m.id, m);
  return { maps: [...maps.values()].sort(byScore), others: [...others.values()].sort(byScore) };
}
