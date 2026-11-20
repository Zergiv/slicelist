"""Lector de playlists para slicelist.

Un servicio HTTP mínimo (solo biblioteca estándar) que lee playlists y álbumes
públicos de YouTube Music con ytmusicapi y los devuelve en JSON.

Escucha únicamente en 127.0.0.1: solo la web, que vive en la misma máquina,
puede llamarlo. No necesita claves ni cuenta.

    GET /health
    GET /playlist?id=<id>&kind=playlist|album

Variables de entorno:
    READER_PORT        puerto (por defecto 4191)
    READER_MAX_TRACKS  tope de canciones por playlist (por defecto 500)
"""

from __future__ import annotations

import json
import os
import re
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import requests
from ytmusicapi import YTMusic

HOST = "127.0.0.1"
PORT = int(os.environ.get("READER_PORT", "4191"))
MAX_TRACKS = int(os.environ.get("READER_MAX_TRACKS", "500"))
TIMEOUT_SECONDS = 20
ID_RE = re.compile(r"^[A-Za-z0-9_-]{10,80}$")

# Como mucho unas pocas lecturas a la vez hacia YouTube Music.
_slots = threading.BoundedSemaphore(4)
_local = threading.local()


class _Session(requests.Session):
    """Sesión con tiempo de espera por defecto, para no quedarse colgada."""

    def request(self, *args, **kwargs):  # type: ignore[override]
        kwargs.setdefault("timeout", TIMEOUT_SECONDS)
        return super().request(*args, **kwargs)


def _client() -> YTMusic:
    """Un cliente por hilo: la sesión de requests no se comparte entre hilos."""
    if not hasattr(_local, "yt"):
        _local.yt = YTMusic(requests_session=_Session())
    return _local.yt


class ReaderError(Exception):
    def __init__(self, code: str, status: int):
        super().__init__(code)
        self.code = code
        self.status = status


def _thumb(thumbnails) -> str | None:
    """La miniatura más pequeña que ya se ve bien a 96 px en pantallas densas."""
    if not thumbnails:
        return None
    ordered = sorted(thumbnails, key=lambda t: t.get("width") or 0)
    for item in ordered:
        if (item.get("width") or 0) >= 192:
            return item.get("url")
    return ordered[-1].get("url")


def _names(artists) -> list[str]:
    return [a["name"] for a in (artists or []) if isinstance(a, dict) and a.get("name")]


def _track(raw: dict, fallback_thumb: str | None = None, fallback_artists: list[str] | None = None) -> dict | None:
    video_id = raw.get("videoId")
    title = raw.get("title")
    if not video_id or not title:
        # Canciones retiradas o no disponibles: no hay nada que buscar.
        return None
    album = raw.get("album")
    return {
        "videoId": video_id,
        "title": title,
        "artists": _names(raw.get("artists")) or (fallback_artists or []),
        "album": album.get("name") if isinstance(album, dict) else (album if isinstance(album, str) else None),
        "durationSeconds": raw.get("duration_seconds"),
        "thumb": _thumb(raw.get("thumbnails")) or fallback_thumb,
        "videoType": raw.get("videoType"),
    }


def _looks_missing(err: Exception) -> bool:
    text = str(err).lower()
    return any(
        hint in text
        for hint in ("404", "not found", "does not exist", "unable to find", "403", "private", "400")
    )


def read_playlist(playlist_id: str) -> dict:
    yt = _client()
    try:
        data = yt.get_playlist(playlist_id, limit=MAX_TRACKS)
    except requests.RequestException as err:
        raise ReaderError("busy", 503) from err
    except Exception as err:  # ytmusicapi lanza de todo cuando no la encuentra
        if _looks_missing(err) or isinstance(err, (KeyError, IndexError, TypeError)):
            raise ReaderError("not_found", 404) from err
        raise ReaderError("upstream", 502) from err

    raw_tracks = data.get("tracks") or []
    tracks = [t for t in (_track(r) for r in raw_tracks[:MAX_TRACKS]) if t]
    author = data.get("author")
    total = data.get("trackCount")
    return {
        "id": playlist_id,
        "title": data.get("title") or "",
        "author": author.get("name") if isinstance(author, dict) else None,
        "thumb": _thumb(data.get("thumbnails")),
        "trackCount": total if isinstance(total, int) else len(raw_tracks),
        "truncated": len(raw_tracks) >= MAX_TRACKS and isinstance(total, int) and total > MAX_TRACKS,
        "tracks": tracks,
    }


def read_album(album_id: str) -> dict:
    yt = _client()
    try:
        browse_id = yt.get_album_browse_id(album_id)
        if not browse_id:
            raise ReaderError("not_found", 404)
        data = yt.get_album(browse_id)
    except ReaderError:
        raise
    except requests.RequestException as err:
        raise ReaderError("busy", 503) from err
    except Exception as err:
        if _looks_missing(err) or isinstance(err, (KeyError, IndexError, TypeError)):
            raise ReaderError("not_found", 404) from err
        raise ReaderError("upstream", 502) from err

    cover = _thumb(data.get("thumbnails"))
    artists = _names(data.get("artists"))
    raw_tracks = data.get("tracks") or []
    tracks = [t for t in (_track(r, cover, artists) for r in raw_tracks[:MAX_TRACKS]) if t]
    for track in tracks:
        track["album"] = track["album"] or data.get("title")
    return {
        "id": album_id,
        "title": data.get("title") or "",
        "author": ", ".join(artists) or None,
        "thumb": cover,
        "trackCount": data.get("trackCount") if isinstance(data.get("trackCount"), int) else len(raw_tracks),
        "truncated": len(raw_tracks) > MAX_TRACKS,
        "tracks": tracks,
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "slicelist-reader"
    protocol_version = "HTTP/1.1"

    def _send(self, status: int, body: dict) -> None:
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:  # noqa: N802 (nombre impuesto por http.server)
        url = urlparse(self.path)
        if url.path == "/health":
            self._send(200, {"ok": True})
            return
        if url.path != "/playlist":
            self._send(404, {"error": "not_found"})
            return

        query = parse_qs(url.query)
        playlist_id = (query.get("id") or [""])[0]
        kind = (query.get("kind") or ["playlist"])[0]
        if not ID_RE.match(playlist_id) or kind not in ("playlist", "album"):
            self._send(400, {"error": "bad_link"})
            return

        if not _slots.acquire(timeout=10):
            self._send(503, {"error": "busy"})
            return
        try:
            data = read_album(playlist_id) if kind == "album" else read_playlist(playlist_id)
        except ReaderError as err:
            self._send(err.status, {"error": err.code})
            return
        except Exception as err:  # pragma: no cover - último recurso
            print(f"error inesperado leyendo {playlist_id}: {err!r}", file=sys.stderr, flush=True)
            self._send(502, {"error": "upstream"})
            return
        finally:
            _slots.release()

        if not data["tracks"]:
            self._send(404, {"error": "empty"})
            return
        self._send(200, data)

    def log_message(self, fmt: str, *args) -> None:
        print(f"{self.address_string()} {fmt % args}", file=sys.stderr, flush=True)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    server.daemon_threads = True
    print(f"lector escuchando en http://{HOST}:{PORT}", file=sys.stderr, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
