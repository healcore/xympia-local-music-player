import { useState } from "react";

interface SoundcloudTrack {
  id: number;
  title: string;
  artist: string;
  artworkUrl: string | null;
  permalinkUrl: string;
}

export default function SoundcloudPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SoundcloudTrack[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    const res = await window.musicHub.soundcloud.search(query.trim());
    setResults(res);
    setLoading(false);
  }

  return (
    <div className="soundcloud-panel">
      <p className="hint">
        Личные лайки SoundCloud сейчас недоступны — регистрация новых приложений у них
        практически закрыта. Здесь работает только публичный поиск; клик открывает трек
        в браузере.
      </p>
      <div className="search-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Поиск на SoundCloud…"
        />
        <button onClick={search} disabled={loading}>
          {loading ? "…" : "Найти"}
        </button>
      </div>
      <ul className="track-list">
        {results.map((t) => (
          <li key={t.id} onClick={() => window.musicHub.shell.openExternal(t.permalinkUrl)}>
            {t.artworkUrl ? <img src={t.artworkUrl} alt="" /> : <div className="cover-placeholder" />}
            <div className="meta">
              <div className="title">{t.title}</div>
              <div className="artist">{t.artist}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
