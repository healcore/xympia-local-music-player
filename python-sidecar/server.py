"""
Локальный HTTP-сервер, который оборачивает неофициальную библиотеку
`yandex-music` (https://pypi.org/project/yandex-music/) и отдаёт данные
Electron-приложению через простой JSON API. Слушает только 127.0.0.1 —
наружу этот сервер не смотрит.

Как получить токен (нужен один раз, дальше он сохраняется в приложении):
  см. README.md, раздел "Авторизация в Яндекс Музыке".

Запуск отдельно (для отладки):
  pip install -r requirements.txt
  python server.py --port 8799
"""

import argparse
import random
from collections import Counter
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from yandex_music import Client

app = FastAPI()
state: dict = {"client": None}


class TokenPayload(BaseModel):
    token: str


def get_client() -> Client:
    if state["client"] is None:
        raise HTTPException(status_code=401, detail="Не авторизован: сначала вызови /auth/token")
    return state["client"]


def track_to_dict(track) -> dict:
    artists = ", ".join(a.name for a in (track.artists or []))
    cover = track.cover_uri.replace("%%", "300x300") if track.cover_uri else None
    return {
        "id": f"{track.id}",
        "title": track.title,
        "artist": artists,
        "durationMs": track.duration_ms,
        "coverUrl": f"https://{cover}" if cover else None,
        "genre": getattr(track, "genre", None) or (track.albums[0].genre if track.albums else None),
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/token")
def auth_token(payload: TokenPayload):
    try:
        client = Client(payload.token).init()
    except Exception as exc:  # noqa: BLE001 - отдаём причину наружу как есть
        raise HTTPException(status_code=401, detail=f"Не удалось авторизоваться: {exc}") from exc
    state["client"] = client
    return {"ok": True, "account": client.me.account.login if client.me and client.me.account else None}


@app.get("/library/liked")
def library_liked():
    client = get_client()
    likes = client.users_likes_tracks()
    tracks = [like.fetch_track() for like in likes]
    return {"tracks": [track_to_dict(t) for t in tracks if t]}


@app.post("/library/like/{track_id}")
def library_like(track_id: str):
    client = get_client()
    client.users_likes_tracks_add(track_id)
    return {"ok": True}


@app.get("/wave/native")
def wave_native():
    """Родная 'Моя волна' Яндекса — станция user:onyourwave."""
    client = get_client()
    seq = client.rotor_station_tracks(station="user:onyourwave")
    tracks = [item.track for item in seq.sequence]
    return {"tracks": [track_to_dict(t) for t in tracks]}


@app.get("/wave/custom")
def wave_custom(limit: int = 30):
    """
    Собственная волна: смотрим на артистов/жанры из лайков, ищем у тех же
    артистов другие треки, которых пользователь ещё не лайкал, перемешиваем
    с весом по частоте артиста в лайках. Простой контент-based подход,
    не зависящий от алгоритма Яндекса.
    """
    client = get_client()
    likes = client.users_likes_tracks()
    liked_tracks = [like.fetch_track() for like in likes if like]
    liked_ids = {t.id for t in liked_tracks if t}

    artist_counter: Counter[str] = Counter()
    for t in liked_tracks:
        for a in t.artists or []:
            artist_counter[str(a.id)] += 1

    candidates = []
    for artist_id, weight in artist_counter.most_common(15):
        try:
            artist_tracks = client.artists_tracks(artist_id, page_size=10).tracks
        except Exception:  # noqa: BLE001 - пропускаем артиста, если запрос не удался
            continue
        for t in artist_tracks:
            if t.id in liked_ids:
                continue
            candidates.append((weight, t))

    random.shuffle(candidates)
    candidates.sort(key=lambda pair: pair[0], reverse=True)
    top = [t for _, t in candidates[: limit * 2]]
    random.shuffle(top)

    return {"tracks": [track_to_dict(t) for t in top[:limit]]}


@app.get("/search/tracks")
def search_tracks(q: str, limit: int = 30):
    """Поиск треков по каталогу Яндекс Музыки (по названию/исполнителю)."""
    if not q.strip():
        return {"tracks": []}
    client = get_client()
    result = client.search(q, type_="track")
    tracks = []
    if result and result.tracks:
        tracks = result.tracks.results[:limit]
    return {"tracks": [track_to_dict(t) for t in tracks if t]}


@app.get("/track/{track_id}/stream")
def track_stream(track_id: str):
    client = get_client()
    info = client.tracks_download_info(track_id, get_direct_links=True)
    if not info:
        raise HTTPException(status_code=404, detail="Ссылка на трек не найдена")
    best = max(info, key=lambda i: i.bitrate_in_kbps or 0)
    return {"url": best.direct_link, "bitrateKbps": best.bitrate_in_kbps}


if __name__ == "__main__":
    import uvicorn

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8799)
    args = parser.parse_args()

    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="info")
