import { useEffect, useRef } from "react";
import { usePlayerStore } from "../store/player";

export default function PlayerBar() {
  const { queue, currentIndex, isPlaying, setPlaying, next, prev } = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const track = currentIndex >= 0 ? queue[currentIndex] : null;

  useEffect(() => {
    if (!track) return;

    let revoked = false;
    (async () => {
      const res = await window.musicHub.yandex.getStreamUrl(track.id);
      if (revoked || !audioRef.current || !res.ok || !res.data) return;
      audioRef.current.src = res.data.url;
      await audioRef.current.play().catch(() => {});
    })();

    return () => {
      revoked = true;
    };
  }, [track?.id]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying]);

  if (!track) return null;

  return (
    <div className="player-bar">
      {track.coverUrl ? <img src={track.coverUrl} alt="" /> : <div className="cover-placeholder" />}
      <div className="meta">
        <div className="title">{track.title}</div>
        <div className="artist">{track.artist}</div>
      </div>
      <div className="controls">
        <button onClick={prev} aria-label="Предыдущий трек">⏮</button>
        <button className="play-btn" onClick={() => setPlaying(!isPlaying)} aria-label={isPlaying ? "Пауза" : "Играть"}>
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button onClick={next} aria-label="Следующий трек">⏭</button>
      </div>
      <audio ref={audioRef} onEnded={next} />
    </div>
  );
}
