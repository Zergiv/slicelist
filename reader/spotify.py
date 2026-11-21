"""Lee playlists y álbumes públicos de Spotify sin cuenta.

Metadatos del embed público; la lista larga de una playlist sale del
pathfinder de Spotify (paginado). Si eso falla, API anónima o embed.
Portadas: pathfinder/API, o embed de pista / iTunes.
"""

from __future__ import annotations

import json
import os
import re
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import requests

from errors import ReaderError

MAX_TRACKS = int(os.environ.get("READER_MAX_TRACKS", "200"))
TIMEOUT_SECONDS = 20
COVER_WORKERS = 8
PAGE_SIZE = 100

# Persistido del web player; si Spotify lo rota, caemos a API/embed.
PATHFINDER_HASH = "21ea11a6ac75a5f3e01fd365d29c18e0a4a8b7dc09f89bbb5d73910190c6acaf"
PATHFINDER_URL = "https://api-partner.spotify.com/pathfinder/v1/query"

UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
)
NEXT_DATA = re.compile(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
    re.DOTALL,
)
SP_ID = re.compile(r"^[A-Za-z0-9]{22}$")

# Portadas ya vistas en este proceso (id de pista de Spotify -> url).
_cover_cache: dict[str, str] = {}


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept-Language": "en"})
    return s


def _embed(kind: str, spotify_id: str) -> dict[str, Any]:
    if not SP_ID.match(spotify_id):
        raise ReaderError("bad_link", 400)
    if kind == "spotify_track":
        path = "track"
    elif kind == "spotify_playlist":
        path = "playlist"
    else:
        path = "album"
    url = f"https://open.spotify.com/embed/{path}/{spotify_id}"
    try:
        res = _session().get(url, timeout=TIMEOUT_SECONDS)
    except requests.RequestException as err:
        raise ReaderError("busy", 503) from err
    if res.status_code in (404, 400, 403):
        raise ReaderError("not_found", 404)
    if res.status_code >= 500:
        raise ReaderError("busy", 503)
    if res.status_code != 200:
        raise ReaderError("upstream", 502)

    match = NEXT_DATA.search(res.text)
    if not match:
        raise ReaderError("upstream", 502)
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError as err:
        raise ReaderError("upstream", 502) from err

    try:
        entity = data["props"]["pageProps"]["state"]["data"]["entity"]
        token = data["props"]["pageProps"]["state"]["settings"]["session"]["accessToken"]
    except (KeyError, TypeError) as err:
        raise ReaderError("upstream", 502) from err

    return {"entity": entity, "token": token}


def _artists(subtitle: str | None) -> list[str]:
    if not subtitle:
        return []
    parts = re.split(r"\s*,\s*", subtitle.replace("\xa0", " ").strip())
    return [p for p in parts if p]


def _pick_image(images: list[Any] | None, *, width_key: str = "width") -> str | None:
    if not images:
        return None
    usable = [i for i in images if isinstance(i, dict) and i.get("url")]
    if not usable:
        return None
    ordered = sorted(usable, key=lambda i: i.get(width_key) or i.get("maxWidth") or 0)
    for item in ordered:
        size = item.get(width_key) or item.get("maxWidth") or 0
        if size >= 192:
            return item.get("url")
    return ordered[-1].get("url")


def _cover(entity: dict[str, Any]) -> str | None:
    art = entity.get("coverArt") if isinstance(entity.get("coverArt"), dict) else None
    return _pick_image((art or {}).get("sources") or [])


def _from_embed_tracks(track_list: list[dict[str, Any]]) -> list[dict]:
    tracks: list[dict] = []
    for raw in track_list:
        title = raw.get("title")
        uri = raw.get("uri") or ""
        if not title or not uri.startswith("spotify:track:"):
            continue
        track_id = uri.rsplit(":", 1)[-1]
        duration_ms = raw.get("duration")
        tracks.append(
            {
                "videoId": f"sp:{track_id}",
                "title": title,
                "artists": _artists(raw.get("subtitle")),
                "album": None,
                "durationSeconds": int(duration_ms / 1000) if isinstance(duration_ms, (int, float)) else None,
                "thumb": None,
                "videoType": "SPOTIFY",
            }
        )
        if len(tracks) >= MAX_TRACKS:
            break
    return tracks


def _pathfinder_tracks(token: str, playlist_id: str) -> list[dict] | None:
    """Lista paginada vía pathfinder del web player. None si falla."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "app-platform": "WebPlayer",
        "User-Agent": UA,
    }
    session = _session()
    out: list[dict] = []
    offset = 0
    total: int | None = None

    while len(out) < MAX_TRACKS:
        limit = min(PAGE_SIZE, MAX_TRACKS - len(out))
        params = {
            "operationName": "fetchPlaylistContents",
            "variables": json.dumps(
                {
                    "uri": f"spotify:playlist:{playlist_id}",
                    "offset": offset,
                    "limit": limit,
                },
                separators=(",", ":"),
            ),
            "extensions": json.dumps(
                {"persistedQuery": {"version": 1, "sha256Hash": PATHFINDER_HASH}},
                separators=(",", ":"),
            ),
        }
        try:
            res = session.get(PATHFINDER_URL, headers=headers, params=params, timeout=TIMEOUT_SECONDS)
        except requests.RequestException:
            return None if not out else out
        if res.status_code != 200:
            return None if not out else out
        try:
            body = res.json()
        except ValueError:
            return None if not out else out

        try:
            content = body["data"]["playlistV2"]["content"]
        except (KeyError, TypeError):
            return None if not out else out

        if total is None:
            raw_total = content.get("totalCount")
            total = raw_total if isinstance(raw_total, int) else None

        items = content.get("items") if isinstance(content.get("items"), list) else []
        if not items:
            break

        added = 0
        for item in items:
            if not isinstance(item, dict):
                continue
            wrapper = item.get("itemV2") if isinstance(item.get("itemV2"), dict) else {}
            raw = wrapper.get("data") if isinstance(wrapper.get("data"), dict) else {}
            if raw.get("__typename") != "Track" or not raw.get("name"):
                continue
            uri = raw.get("uri") or ""
            if not isinstance(uri, str) or not uri.startswith("spotify:track:"):
                continue
            track_id = uri.rsplit(":", 1)[-1]
            artists_block = raw.get("artists") if isinstance(raw.get("artists"), dict) else {}
            artists = []
            for a in artists_block.get("items") or []:
                if not isinstance(a, dict):
                    continue
                profile = a.get("profile") if isinstance(a.get("profile"), dict) else {}
                name = profile.get("name")
                if name:
                    artists.append(name)
            album = None
            thumb = None
            alb = raw.get("albumOfTrack") if isinstance(raw.get("albumOfTrack"), dict) else None
            if alb:
                album = alb.get("name") if isinstance(alb.get("name"), str) else None
                art = alb.get("coverArt") if isinstance(alb.get("coverArt"), dict) else {}
                thumb = _pick_image(art.get("sources") or [], width_key="width")
            duration_ms = None
            td = raw.get("trackDuration") if isinstance(raw.get("trackDuration"), dict) else None
            if td and isinstance(td.get("totalMilliseconds"), int):
                duration_ms = td["totalMilliseconds"]

            out.append(
                {
                    "videoId": f"sp:{track_id}",
                    "title": raw["name"],
                    "artists": artists,
                    "album": album,
                    "durationSeconds": int(duration_ms / 1000) if duration_ms is not None else None,
                    "thumb": thumb,
                    "videoType": "SPOTIFY",
                }
            )
            added += 1
            if len(out) >= MAX_TRACKS:
                break

        offset += len(items)
        if total is not None and offset >= total:
            break
        if added == 0:
            break

    return out or None


def _api_tracks(token: str, kind: str, spotify_id: str) -> list[dict] | None:
    """Lista con portada de álbum por canción. None si Spotify frena."""
    headers = {"Authorization": f"Bearer {token}", "User-Agent": UA}
    if kind == "spotify_album":
        base = f"https://api.spotify.com/v1/albums/{spotify_id}/tracks"
        fields = "total,next,items(id,name,artists(name),duration_ms)"
    else:
        base = f"https://api.spotify.com/v1/playlists/{spotify_id}/tracks"
        fields = "total,next,items(track(id,name,artists(name),album(name,images),duration_ms))"

    out: list[dict] = []
    url: str | None = f"{base}?limit=100&fields={fields}"
    session = _session()
    pages = 0
    while url and len(out) < MAX_TRACKS and pages < 10:
        pages += 1
        try:
            res = session.get(url, headers=headers, timeout=TIMEOUT_SECONDS)
        except requests.RequestException:
            return None
        if res.status_code in (401, 403, 429):
            return None
        if res.status_code != 200:
            return None
        try:
            body = res.json()
        except ValueError:
            return None

        for item in body.get("items") or []:
            raw = item if kind == "spotify_album" else item.get("track")
            if not isinstance(raw, dict) or not raw.get("id") or not raw.get("name"):
                continue
            artists = [a["name"] for a in (raw.get("artists") or []) if isinstance(a, dict) and a.get("name")]
            album = None
            thumb = None
            if kind == "spotify_playlist":
                alb = raw.get("album") if isinstance(raw.get("album"), dict) else None
                if alb:
                    album = alb.get("name")
                    thumb = _pick_image(alb.get("images") or [])
            duration_ms = raw.get("duration_ms")
            out.append(
                {
                    "videoId": f"sp:{raw['id']}",
                    "title": raw["name"],
                    "artists": artists,
                    "album": album,
                    "durationSeconds": int(duration_ms / 1000) if isinstance(duration_ms, int) else None,
                    "thumb": thumb,
                    "videoType": "SPOTIFY",
                }
            )
            if len(out) >= MAX_TRACKS:
                break

        next_url = body.get("next")
        url = next_url if isinstance(next_url, str) else None

    return out


def _cover_from_track_embed(track_id: str) -> str | None:
    cached = _cover_cache.get(track_id)
    if cached:
        return cached
    try:
        res = _session().get(
            f"https://open.spotify.com/embed/track/{track_id}",
            timeout=TIMEOUT_SECONDS,
        )
    except requests.RequestException:
        return None
    if res.status_code != 200:
        return None
    match = NEXT_DATA.search(res.text)
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
        entity = data["props"]["pageProps"]["state"]["data"]["entity"]
        images = (entity.get("visualIdentity") or {}).get("image") or []
    except (KeyError, TypeError, json.JSONDecodeError):
        return None
    url = _pick_image(images)
    if url:
        _cover_cache[track_id] = url
    return url


def _cover_from_itunes(title: str, artists: list[str]) -> str | None:
    term = f"{artists[0]} {title}" if artists else title
    if not term.strip():
        return None
    url = "https://itunes.apple.com/search?" + urllib.parse.urlencode(
        {"term": term, "entity": "song", "limit": 1}
    )
    try:
        res = _session().get(url, timeout=TIMEOUT_SECONDS)
    except requests.RequestException:
        return None
    if res.status_code != 200:
        return None
    try:
        results = res.json().get("results") or []
    except ValueError:
        return None
    if not results:
        return None
    art = results[0].get("artworkUrl100")
    if not isinstance(art, str) or not art:
        return None
    return art.replace("100x100bb", "300x300bb").replace("100x100", "300x300")


def _enrich_covers(tracks: list[dict]) -> None:
    """Rellena portadas: embed de la pista en paralelo, iTunes si falla."""
    pending = [t for t in tracks if not t.get("thumb") and str(t.get("videoId", "")).startswith("sp:")]
    if not pending:
        return

    def one(track: dict) -> tuple[dict, str | None]:
        track_id = track["videoId"][3:]
        url = _cover_from_track_embed(track_id)
        if not url:
            url = _cover_from_itunes(track.get("title") or "", track.get("artists") or [])
        return track, url

    with ThreadPoolExecutor(max_workers=COVER_WORKERS) as pool:
        futures = [pool.submit(one, t) for t in pending]
        for fut in as_completed(futures):
            try:
                track, url = fut.result()
            except Exception:
                continue
            if url:
                track["thumb"] = url


def read_spotify_track(spotify_id: str) -> dict:
    """Una sola pista pública (título, artistas, portada)."""
    payload = _embed("spotify_track", spotify_id)
    entity = payload["entity"]
    title = entity.get("title") or entity.get("name") or ""
    if not title:
        raise ReaderError("not_found", 404)
    artists = _artists(entity.get("subtitle") if isinstance(entity.get("subtitle"), str) else None)
    thumb = None
    images = (entity.get("visualIdentity") or {}).get("image") or []
    if isinstance(images, list):
        thumb = _pick_image(images)
    if not thumb:
        thumb = _cover(entity)
    duration_ms = entity.get("duration")
    return {
        "videoId": f"sp:{spotify_id}",
        "title": title,
        "artists": artists,
        "album": None,
        "durationSeconds": int(duration_ms / 1000) if isinstance(duration_ms, (int, float)) else None,
        "thumb": thumb,
        "videoType": "SPOTIFY",
    }


def read_spotify(kind: str, spotify_id: str) -> dict:
    payload = _embed(kind, spotify_id)
    entity = payload["entity"]
    cover = _cover(entity)
    token = payload["token"]

    tracks: list[dict] | None = None
    if kind == "spotify_playlist":
        tracks = _pathfinder_tracks(token, spotify_id)
    if not tracks:
        tracks = _api_tracks(token, kind, spotify_id)
    if not tracks:
        embed_tracks = entity.get("trackList") if isinstance(entity.get("trackList"), list) else []
        tracks = _from_embed_tracks(embed_tracks)

    # Portadas que falten (API a medias, o solo embed).
    if kind == "spotify_playlist" and any(not t.get("thumb") for t in tracks):
        _enrich_covers(tracks)

    authors = entity.get("authors") if isinstance(entity.get("authors"), list) else []
    author = None
    if authors and isinstance(authors[0], dict):
        author = authors[0].get("name")

    title = entity.get("title") or entity.get("name") or ""
    if kind == "spotify_album":
        for track in tracks:
            track["album"] = track["album"] or title
            if cover and not track["thumb"]:
                track["thumb"] = cover
            if author and not track["artists"]:
                track["artists"] = [author]
    else:
        for track in tracks:
            if cover and not track.get("thumb"):
                track["thumb"] = cover

    return {
        "id": spotify_id,
        "title": title,
        "author": author,
        "thumb": cover,
        "trackCount": len(tracks),
        "truncated": len(tracks) >= MAX_TRACKS,
        "tracks": tracks,
    }
