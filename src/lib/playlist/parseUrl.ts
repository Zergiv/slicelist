// Saca el identificador de playlist de lo que la persona pegue: un enlace de
// YouTube Music, YouTube, Spotify, un vídeo dentro de una playlist o el
// identificador a secas.

export type ParsedLink =
  | {
      ok: true;
      id: string;
      kind: "playlist" | "album" | "spotify_playlist" | "spotify_album";
    }
  | { ok: false; reason: "bad_link" | "not_playlist" };

const YT_HOSTS = /(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$/i;
const SP_HOSTS = /(^|\.)spotify\.com$/i;
const YT_ID = /^[A-Za-z0-9_-]{10,80}$/;
const SP_ID = /^[A-Za-z0-9]{22}$/;

export function parsePlaylistLink(input: string): ParsedLink {
  const text = input.trim();
  if (!text) return { ok: false, reason: "bad_link" };

  // Identificador pegado tal cual (YouTube). Los de Spotify sin host son ambiguos.
  if (!/[/.?=\s:]/.test(text)) return fromYouTubeId(text);

  // URI nativa de Spotify: spotify:playlist:… / spotify:album:…
  const spotifyUri = text.match(/^spotify:(playlist|album):([A-Za-z0-9]{22})$/i);
  if (spotifyUri) {
    return {
      ok: true,
      id: spotifyUri[2],
      kind: spotifyUri[1].toLowerCase() === "album" ? "spotify_album" : "spotify_playlist",
    };
  }

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { ok: false, reason: "bad_link" };
  }

  if (SP_HOSTS.test(url.hostname)) return fromSpotifyUrl(url);
  if (YT_HOSTS.test(url.hostname)) return fromYouTubeUrl(url);

  return { ok: false, reason: "bad_link" };
}

function fromYouTubeUrl(url: URL): ParsedLink {
  const list = url.searchParams.get("list");
  if (list) return fromYouTubeId(list);

  // music.youtube.com/browse/VLPL...
  const browse = url.pathname.match(/\/browse\/(VL[\w-]+)/);
  if (browse) return fromYouTubeId(browse[1]);

  return { ok: false, reason: "not_playlist" };
}

function fromSpotifyUrl(url: URL): ParsedLink {
  // /playlist/ID, /album/ID, /intl-es/playlist/ID, …
  const match = url.pathname.match(/\/(playlist|album)\/([A-Za-z0-9]{22})(?:\/|$|\?)/i);
  if (!match) {
    // Canción, artista u otra cosa.
    if (/\/(track|artist|episode|show)\//i.test(url.pathname)) {
      return { ok: false, reason: "not_playlist" };
    }
    return { ok: false, reason: "bad_link" };
  }
  return {
    ok: true,
    id: match[2],
    kind: match[1].toLowerCase() === "album" ? "spotify_album" : "spotify_playlist",
  };
}

function fromYouTubeId(raw: string): ParsedLink {
  const id = raw.startsWith("VL") ? raw.slice(2) : raw;
  // Listas privadas por definición ("me gusta", "ver más tarde"): no son playlists públicas.
  if (/^(LL|WL|LM|SE)$/.test(id)) return { ok: false, reason: "not_playlist" };
  if (!YT_ID.test(id)) return { ok: false, reason: "bad_link" };

  // Mezclas automáticas: cambian en cada visita y no se pueden leer como playlist.
  if (id.startsWith("RD") && !id.startsWith("RDCLAK5uy_")) return { ok: false, reason: "not_playlist" };

  // Un id de Spotify de 22 caracteres sin host no lo tratamos aquí.
  if (SP_ID.test(id) && !id.startsWith("PL") && !id.startsWith("OL") && !id.startsWith("RD")) {
    // Podría ser Spotify o un id raro de YT; sin host no apostamos.
  }

  return { ok: true, id, kind: id.startsWith("OLAK5uy_") ? "album" : "playlist" };
}
