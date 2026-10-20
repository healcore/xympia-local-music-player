import type { Track } from "../global";

export default function TrackList({
  tracks,
  onPlay,
  emptyText,
  playingId,
}: {
  tracks: Track[];
  onPlay: (index: number) => void;
  emptyText?: string;
  playingId?: string | null;
}) {
  if (tracks.length === 0) {
    return <p className="empty">{emptyText ?? "Пока пусто"}</p>;
  }

  return (
    <ul className="track-list">
      {tracks.map((t, i) => (
        <li key={t.id} className={t.id === playingId ? "playing" : ""} onClick={() => onPlay(i)}>
          {t.coverUrl ? <img src={t.coverUrl} alt="" /> : <div className="cover-placeholder" />}
          <div className="meta">
            <div className="title">{t.title}</div>
            <div className="artist">{t.artist}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
