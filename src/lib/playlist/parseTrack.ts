/** Detecta enlaces de una sola pista (YouTube / Spotify). */

export type ParsedTrackLink =
  | { ok: true; kind: "youtube"; id: string }
  | { ok: true; kind: "spotify"; id: string }
  | { ok: false };

const SP_ID = /^[A-Za-z0-9]{22}$/;
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

function hostOf(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

/** Si el texto es un enlace de pista, lo descompone. Si no, `ok: false`. */
export function parseTrackLink(raw: string): ParsedTrackLink {
  const text = raw.trim();
  if (!text || text.length > 2000) return { ok: false };

  const uri = text.match(/^spotify:track:([A-Za-z0-9]{22})$/i);
  if (uri) return { ok: true, kind: "spotify", id: uri[1] };

  let url: URL;
  try {
    url = new URL(text.includes("://") ? text : `https://${text}`);
  } catch {
    return { ok: false };
  }

  const host = hostOf(url.hostname);

  if (host === "open.spotify.com" || host.endsWith(".spotify.com")) {
    const m = url.pathname.match(/\/track\/([A-Za-z0-9]{22})/i);
    if (m && SP_ID.test(m[1])) return { ok: true, kind: "spotify", id: m[1] };
    return { ok: false };
  }

  if (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com"
  ) {
    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "").slice(0, 11);
      if (YT_ID.test(id)) return { ok: true, kind: "youtube", id };
      return { ok: false };
    }
    const v = url.searchParams.get("v");
    if (v && YT_ID.test(v)) return { ok: true, kind: "youtube", id: v };
    const shorts = url.pathname.match(/\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/);
    if (shorts) return { ok: true, kind: "youtube", id: shorts[1] };
  }

  return { ok: false };
}
