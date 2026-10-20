import { useEffect, useState } from "react";
import type { SoundcloudTrack, Track } from "../global";
import TrackList from "./TrackList";

export default function SearchResults({
  query,
  localTracks,
  playingId,
  onPlayLocal,
  onPlayRemote,
}: {
  query: string;
  localTracks: Track[];
  playingId?: string | null;
  onPlayLocal: (tracks: Track[], index: number) => void;
  onPlayRemote: (tracks: Track[], index: number) => void;
}) {
  const [catalog, setCatalog] = useState<Track[]>([]);
  const [soundcloud, setSoundcloud] = useState<SoundcloudTrack[]>([]);
  const [loading, setLoading] = useState(false);

  const q = query.trim().toLowerCase();
  const localMatches = q
    ? localTracks.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
    : [];

  useEffect(() => {
    if (!q) {
      setCatalog([]);
      setSoundcloud([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const [catalogRes, scRes] = await Promise.all([
        window.musicHub.yandex.search(query.trim()),
        window.musicHub.soundcloud.search(query.trim()),
      ]);
      if (cancelled) return;
      setCatalog(catalogRes.ok && catalogRes.data ? catalogRes.data.tracks : []);
      setSoundcloud(scRes ?? []);
      setLoading(false);
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  if (!q) return null;

  const nothingFound = !loading && localMatches.length === 0 && catalog.length === 0 && soundcloud.length === 0;

  return (
    <div className="search-results">
      {localMatches.length > 0 && (
        <>
          <div className="search-section-title">Из ваших списков</div>
          <TrackList tracks={localMatches} playingId={playingId} onPlay={(i) => onPlayLocal(localMatches, i)} />
        </>
      )}

      {catalog.length > 0 && (
        <>
          <div className="search-section-title">Каталог Яндекс Музыки</div>
          <TrackList tracks={catalog} playingId={playingId} onPlay={(i) => onPlayRemote(catalog, i)} />
        </>
      )}

      {soundcloud.length > 0 && (
        <>
          <div className="search-section-title">SoundCloud</div>
          <ul className="track-list">
            {soundcloud.map((t) => (
              <li key={t.id} onClick={() => window.musicHub.shell.openExternal(t.permalinkUrl)}>
                {t.artworkUrl ? <img src={t.artworkUrl} alt="" /> : <div className="cover-placeholder" />}
                <div className="meta">
                  <div className="title">{t.title}</div>
                  <div className="artist">{t.artist}</div>
                </div>
                <span className="source-badge">SC</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {loading && <p className="loading">Ищу…</p>}
      {nothingFound && <p className="empty">Ничего не нашлось по запросу «{query.trim()}»</p>}
    </div>
  );
}
