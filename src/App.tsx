import { useEffect, useState } from "react";
import type { Track } from "./global";
import { usePlayerStore } from "./store/player";
import { useSettingsStore } from "./store/settings";
import LoginGate from "./components/LoginGate";
import TrackList from "./components/TrackList";
import PlayerBar from "./components/PlayerBar";
import SoundcloudPanel from "./components/SoundcloudPanel";
import TopBar from "./components/TopBar";
import ProfileModal from "./components/ProfileModal";
import SearchResults from "./components/SearchResults";

type Tab = "liked" | "nativeWave" | "customWave" | "soundcloud";

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("liked");
  const [liked, setLiked] = useState<Track[]>([]);
  const [nativeWave, setNativeWave] = useState<Track[]>([]);
  const [customWave, setCustomWave] = useState<Track[]>([]);
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const currentTrack = usePlayerStore((s) => (s.currentIndex >= 0 ? s.queue[s.currentIndex] : null));
  const { load: loadSettings, loaded: settingsLoaded } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    window.musicHub.settings.getYandexToken().then((t) => setAuthorized(!!t));
  }, []);

  useEffect(() => {
    if (!authorized) return;
    window.musicHub.yandex.getLiked().then((r) => r.ok && r.data && setLiked(r.data.tracks));
    window.musicHub.yandex.getNativeWave().then((r) => r.ok && r.data && setNativeWave(r.data.tracks));
    window.musicHub.yandex.getCustomWave().then((r) => r.ok && r.data && setCustomWave(r.data.tracks));
  }, [authorized]);

  if (!settingsLoaded) return <div className="loading">Загрузка…</div>;
  if (!unlocked) return <LoginGate onUnlocked={() => setUnlocked(true)} />;
  if (authorized === null) return <div className="loading">Загрузка…</div>;

  const listsByTab: Record<Tab, Track[]> = {
    liked,
    nativeWave,
    customWave,
    soundcloud: [],
  };

  const allLocalTracks = dedupeTracks([...liked, ...nativeWave, ...customWave]);
  const searching = query.trim().length > 0;

  return (
    <div className="app">
      <TopBar query={query} onQueryChange={setQuery} onOpenProfile={() => setProfileOpen(true)} />

      {!searching && (
        <nav className="tabs">
          <button className={tab === "liked" ? "active" : ""} onClick={() => setTab("liked")}>
            Лайкнутые
          </button>
          <button className={tab === "nativeWave" ? "active" : ""} onClick={() => setTab("nativeWave")}>
            Моя волна
          </button>
          <button className={tab === "customWave" ? "active" : ""} onClick={() => setTab("customWave")}>
            Своя волна
          </button>
          <button className={tab === "soundcloud" ? "active" : ""} onClick={() => setTab("soundcloud")}>
            SoundCloud
          </button>
        </nav>
      )}

      <main>
        {searching ? (
          <SearchResults
            query={query}
            localTracks={allLocalTracks}
            playingId={currentTrack?.id}
            onPlayLocal={(tracks, i) => setQueue(tracks, i)}
            onPlayRemote={(tracks, i) => setQueue(tracks, i)}
          />
        ) : tab === "soundcloud" ? (
          <SoundcloudPanel />
        ) : !authorized ? (
          <div className="connect-hint">
            <p>Яндекс Музыка не подключена — зайди в профиль, чтобы увидеть лайки и волны.</p>
            <button onClick={() => setProfileOpen(true)}>Открыть профиль</button>
          </div>
        ) : (
          <TrackList
            tracks={listsByTab[tab]}
            playingId={currentTrack?.id}
            onPlay={(i) => setQueue(listsByTab[tab], i)}
            emptyText="Пока пусто — либо нет данных, либо ещё не загрузилось"
          />
        )}
      </main>

      <PlayerBar />

      {profileOpen && (
        <ProfileModal onClose={() => setProfileOpen(false)} onYandexChange={setAuthorized} />
      )}
    </div>
  );
}

function dedupeTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const out: Track[] = [];
  for (const t of tracks) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out;
}
