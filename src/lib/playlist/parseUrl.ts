// Saca el identificador de playlist de lo que la persona pegue: un enlace de
// YouTube Music, uno de YouTube, uno de un vídeo dentro de una playlist o el
// identificador a secas.

export type ParsedLink =
  | { ok: true; id: string; kind: "playlist" | "album" }
  | { ok: false; reason: "bad_link" | "not_playlist" };

const HOSTS = /(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$/i;
const ID = /^[A-Za-z0-9_-]{10,80}$/;

export function parsePlaylistLink(input: string): ParsedLink {
  const text = input.trim();
  if (!text) return { ok: false, reason: "bad_link" };

  // Identificador pegado tal cual.
  if (!/[/.?=\s]/.test(text)) return fromId(text);

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { ok: false, reason: "bad_link" };
  }
  if (!HOSTS.test(url.hostname)) return { ok: false, reason: "bad_link" };

  const list = url.searchParams.get("list");
  if (list) return fromId(list);

  // music.youtube.com/browse/VLPL...
  const browse = url.pathname.match(/\/browse\/(VL[\w-]+)/);
  if (browse) return fromId(browse[1]);

  // Un enlace de YouTube válido, pero de una canción, un canal u otra cosa.
  return { ok: false, reason: "not_playlist" };
}

function fromId(raw: string): ParsedLink {
  const id = raw.startsWith("VL") ? raw.slice(2) : raw;
  // Listas privadas por definición ("me gusta", "ver más tarde"): no son playlists públicas.
  if (/^(LL|WL|LM|SE)$/.test(id)) return { ok: false, reason: "not_playlist" };
  if (!ID.test(id)) return { ok: false, reason: "bad_link" };

  // Mezclas automáticas: cambian en cada visita y no se pueden leer como playlist.
  if (id.startsWith("RD") && !id.startsWith("RDCLAK5uy_")) return { ok: false, reason: "not_playlist" };

  return { ok: true, id, kind: id.startsWith("OLAK5uy_") ? "album" : "playlist" };
}
