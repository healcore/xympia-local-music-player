/**
 * ВАЖНО: официальная регистрация новых SoundCloud client_id сейчас практически
 * закрыта. Здесь используется публичный client_id, который отдаёт их же веб-плеер
 * (стандартный, но неофициальный и нестабильный способ — id может протухнуть).
 *
 * Как обновить client_id, если поиск перестал работать:
 *   1. Открой soundcloud.com в браузере, DevTools -> Network
 *   2. Найди любой запрос к api-v2.soundcloud.com
 *   3. Скопируй параметр client_id из query-строки и вставь ниже.
 *
 * Личные лайки (/me/likes) требуют OAuth-авторизации приложения — она сейчас
 * недоступна без зарегистрированного приложения, поэтому пока реализован
 * только публичный поиск треков. Это первое, что стоит доработать, если
 * SoundCloud снова начнёт выдавать client_id/секреты для новых приложений.
 */

const PUBLIC_CLIENT_ID = "PASTE_CURRENT_PUBLIC_CLIENT_ID_HERE";
const API_BASE = "https://api-v2.soundcloud.com";

export interface SoundcloudTrack {
  id: number;
  title: string;
  artist: string;
  artworkUrl: string | null;
  permalinkUrl: string;
  streamable: boolean;
}

export async function searchSoundcloudTracks(query: string): Promise<SoundcloudTrack[]> {
  if (PUBLIC_CLIENT_ID.startsWith("PASTE_")) {
    return [];
  }

  const url = `${API_BASE}/search/tracks?q=${encodeURIComponent(query)}&client_id=${PUBLIC_CLIENT_ID}&limit=20`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const json = await res.json();
  return (json.collection ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    artist: t.user?.username ?? "Unknown",
    artworkUrl: t.artwork_url,
    permalinkUrl: t.permalink_url,
    streamable: !!t.streamable,
  }));
}
