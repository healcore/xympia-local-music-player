import { useEffect, useState } from "react";
import { useSettingsStore } from "../store/settings";

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

export default function ProfileModal({
  onClose,
  onYandexChange,
}: {
  onClose: () => void;
  onYandexChange?: (connected: boolean) => void;
}) {
  const { profile, theme, toggleTheme, setUsername, pickAvatar, pickBanner } = useSettingsStore();
  const [editing, setEditing] = useState(!profile.username);
  const [draft, setDraft] = useState(profile.username ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const [yandexConnected, setYandexConnected] = useState<boolean | null>(null);
  const [yandexFormOpen, setYandexFormOpen] = useState(false);
  const [yandexTokenDraft, setYandexTokenDraft] = useState("");
  const [yandexConnecting, setYandexConnecting] = useState(false);
  const [yandexError, setYandexError] = useState<string | null>(null);

  const [soundcloudConnected, setSoundcloudConnected] = useState<boolean | null>(null);
  const [soundcloudFormOpen, setSoundcloudFormOpen] = useState(false);
  const [soundcloudTokenDraft, setSoundcloudTokenDraft] = useState("");
  const [soundcloudSaving, setSoundcloudSaving] = useState(false);
  const [soundcloudError, setSoundcloudError] = useState<string | null>(null);

  useEffect(() => {
    window.musicHub.settings.getYandexToken().then((t) => setYandexConnected(!!t));
    window.musicHub.settings.getSoundcloudToken().then((t) => setSoundcloudConnected(!!t));
  }, []);

  async function connectYandex() {
    setYandexConnecting(true);
    setYandexError(null);
    const res = await window.musicHub.settings.setYandexToken(yandexTokenDraft.trim());
    setYandexConnecting(false);
    if (res.ok) {
      setYandexConnected(true);
      setYandexFormOpen(false);
      setYandexTokenDraft("");
      onYandexChange?.(true);
    } else {
      const detail = res.data && (res.data as { detail?: string }).detail;
      setYandexError(detail ?? "Не удалось подключить аккаунт — проверь токен");
    }
  }

  async function disconnectYandex() {
    await window.musicHub.settings.clearYandexToken();
    setYandexConnected(false);
    onYandexChange?.(false);
  }

  async function connectSoundcloud() {
    setSoundcloudSaving(true);
    setSoundcloudError(null);
    const res = await window.musicHub.settings.setSoundcloudToken(soundcloudTokenDraft.trim());
    setSoundcloudSaving(false);
    if (res.ok) {
      setSoundcloudConnected(true);
      setSoundcloudFormOpen(false);
      setSoundcloudTokenDraft("");
    } else {
      setSoundcloudError(res.error ?? "Не удалось сохранить токен");
    }
  }

  async function disconnectSoundcloud() {
    await window.musicHub.settings.clearSoundcloudToken();
    setSoundcloudConnected(false);
  }

  const valid = USERNAME_RE.test(draft.trim());

  async function save() {
    if (!valid) {
      setError("5–32 символов, латиница/цифры/_, начинается с буквы");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await setUsername(draft.trim());
    setSaving(false);
    if (res.ok) {
      setSuccess(true);
      setEditing(false);
      setTimeout(() => setSuccess(false), 2000);
    } else {
      setError(res.error ?? "Не удалось сохранить");
    }
  }

  function startChange() {
    if (profile.username) {
      const ok = window.confirm(
        `Username задуман как постоянный, как в Telegram: @${profile.username} узнают тебя везде в приложении. Всё равно сменить?`
      );
      if (!ok) return;
    }
    setDraft(profile.username ?? "");
    setEditing(true);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div
          className="profile-banner"
          style={profile.bannerDataUrl ? { backgroundImage: `url(${profile.bannerDataUrl})` } : undefined}
        >
          <button className="icon-btn profile-close-btn" onClick={onClose} aria-label="Закрыть">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <button className="icon-btn banner-upload-btn" onClick={pickBanner} title="Загрузить баннер">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 16l4.5-6 4 5 3-3.5L20 16" />
              <rect x="3" y="4" width="18" height="16" rx="2" />
            </svg>
          </button>
        </div>

        <div className="profile-avatar-wrap">
          {profile.avatarDataUrl ? (
            <img src={profile.avatarDataUrl} alt="" />
          ) : (
            <div className="avatar-fallback-lg">
              {profile.username ? profile.username[0].toUpperCase() : "?"}
            </div>
          )}
          <button className="icon-btn avatar-upload-btn" onClick={pickAvatar} title="Загрузить аватарку">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M4 16l4.5-6 4 5 3-3.5L20 16" />
              <rect x="3" y="4" width="18" height="16" rx="2" />
            </svg>
          </button>
        </div>

        <div className="profile-body">
          <div className="field-label">Аккаунты</div>

          <div className="account-row">
            <div className="account-info">
              <span className="account-name">Яндекс Музыка</span>
              <span className={`account-status ${yandexConnected ? "connected" : ""}`}>
                {yandexConnected === null ? "…" : yandexConnected ? "Подключено" : "Не подключено"}
              </span>
            </div>
            {yandexConnected ? (
              <button className="account-btn danger" onClick={disconnectYandex}>
                Отключить
              </button>
            ) : (
              <button className="account-btn" onClick={() => setYandexFormOpen((v) => !v)}>
                Подключить
              </button>
            )}
          </div>
          {yandexFormOpen && !yandexConnected && (
            <div className="account-form">
              <p className="field-hint">
                Вставь OAuth-токен своего аккаунта (см. README, раздел «Вход в приложение» → «Яндекс
                Музыка»).
              </p>
              <input
                type="password"
                placeholder="Токен"
                value={yandexTokenDraft}
                onChange={(e) => setYandexTokenDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && yandexTokenDraft && connectYandex()}
              />
              <button disabled={!yandexTokenDraft || yandexConnecting} onClick={connectYandex}>
                {yandexConnecting ? "Проверяю…" : "Сохранить"}
              </button>
              {yandexError && <p className="field-hint error">{yandexError}</p>}
            </div>
          )}

          <div className="account-row">
            <div className="account-info">
              <span className="account-name">SoundCloud</span>
              <span className={`account-status ${soundcloudConnected ? "connected" : ""}`}>
                {soundcloudConnected === null ? "…" : soundcloudConnected ? "Подключено" : "Не подключено"}
              </span>
            </div>
            {soundcloudConnected ? (
              <button className="account-btn danger" onClick={disconnectSoundcloud}>
                Отключить
              </button>
            ) : (
              <button className="account-btn" onClick={() => setSoundcloudFormOpen((v) => !v)}>
                Подключить
              </button>
            )}
          </div>
          {soundcloudFormOpen && !soundcloudConnected && (
            <div className="account-form">
              <p className="field-hint">
                Публичный поиск работает и без этого. Токен нужен только для личных лайков — сохрани
                его, если у тебя есть зарегистрированное приложение с OAuth-доступом к SoundCloud.
              </p>
              <input
                type="password"
                placeholder="OAuth-токен"
                value={soundcloudTokenDraft}
                onChange={(e) => setSoundcloudTokenDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && soundcloudTokenDraft && connectSoundcloud()}
              />
              <button disabled={!soundcloudTokenDraft || soundcloudSaving} onClick={connectSoundcloud}>
                {soundcloudSaving ? "Сохраняю…" : "Сохранить"}
              </button>
              {soundcloudError && <p className="field-hint error">{soundcloudError}</p>}
            </div>
          )}

          <div className="field-label">Username</div>

          {!editing && profile.username ? (
            <div className="username-locked">
              <span className="handle">@{profile.username}</span>
              <button className="change-link" onClick={startChange}>
                Изменить
              </button>
            </div>
          ) : (
            <>
              <div className="username-edit-row">
                <div className="at-input">
                  <span>@</span>
                  <input
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value.replace(/\s/g, ""));
                      setError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && save()}
                    placeholder="username"
                    autoFocus
                    maxLength={32}
                  />
                </div>
                <button disabled={!valid || saving} onClick={save}>
                  {saving ? "…" : profile.username ? "Сохранить" : "Занять"}
                </button>
              </div>
              <p className={`field-hint ${error ? "error" : ""}`}>
                {error ?? "Постоянный идентификатор внутри приложения — выбирай вдумчиво, как в Telegram."}
              </p>
            </>
          )}

          {success && <p className="field-hint success">Username сохранён ✓</p>}

          <div className="field-label">Оформление</div>
          <div className="theme-row">
            <span className="label">{theme === "dark" ? "🌙 Тёмная тема" : "☀️ Светлая тема"}</span>
            <button
              className={`theme-switch ${theme === "light" ? "on" : ""}`}
              onClick={toggleTheme}
              aria-label="Переключить тему"
            >
              <span className="knob" />
            </button>
          </div>

          <p className="profile-note">
            Аватарка и баннер хранятся локально на этом устройстве и никуда не отправляются.
          </p>
        </div>
      </div>
    </div>
  );
}
