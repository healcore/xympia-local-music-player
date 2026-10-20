import { useSettingsStore } from "../store/settings";

export default function TopBar({
  query,
  onQueryChange,
  onOpenProfile,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onOpenProfile: () => void;
}) {
  const { theme, toggleTheme, profile } = useSettingsStore();
  const initial = profile.username ? profile.username[0].toUpperCase() : "?";

  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo-dot">🎵</span>
        <span>Xympia</span>
      </div>

      <div className="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Искать трек или исполнителя…"
        />
        {query && (
          <button className="clear-btn" onClick={() => onQueryChange("")} aria-label="Очистить">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="topbar-actions">
        <button className="icon-btn" onClick={toggleTheme} title="Сменить тему" aria-label="Сменить тему">
          {theme === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4.5" />
              <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.9 14.6A8.6 8.6 0 1 1 9.4 3.1a7 7 0 0 0 11.5 11.5Z" />
            </svg>
          )}
        </button>

        <button className="avatar-btn" onClick={onOpenProfile} title="Профиль" aria-label="Профиль">
          {profile.avatarDataUrl ? (
            <img src={profile.avatarDataUrl} alt="" />
          ) : (
            <span className="avatar-fallback">{initial}</span>
          )}
        </button>
      </div>
    </header>
  );
}
