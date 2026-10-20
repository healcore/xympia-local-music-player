export interface Track {
  id: string;
  title: string;
  artist: string;
  durationMs?: number;
  coverUrl?: string | null;
  genre?: string | null;
}

export interface SoundcloudTrack {
  id: number;
  title: string;
  artist: string;
  artworkUrl: string | null;
  permalinkUrl: string;
}

export type Theme = "dark" | "light";

export interface Profile {
  username: string | null;
  avatarDataUrl: string | null;
  bannerDataUrl: string | null;
}

interface SidecarResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

interface ProfileResponse {
  ok: boolean;
  profile?: Profile;
  error?: string;
}

interface AuthStatus {
  hasAccount: boolean;
  login: string | null;
}

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface MusicHubApi {
  auth: {
    status(): Promise<AuthStatus>;
    register(login: string, password: string): Promise<AuthResult>;
    login(login: string, password: string): Promise<AuthResult>;
  };
  settings: {
    getYandexToken(): Promise<string | null>;
    setYandexToken(token: string): Promise<SidecarResponse<{ ok: boolean; account: string | null }>>;
    clearYandexToken(): Promise<AuthResult>;
    getSoundcloudToken(): Promise<string | null>;
    setSoundcloudToken(token: string): Promise<AuthResult>;
    clearSoundcloudToken(): Promise<AuthResult>;
    getTheme(): Promise<Theme>;
    setTheme(theme: Theme): Promise<void>;
  };
  profile: {
    get(): Promise<Profile>;
    setUsername(username: string): Promise<ProfileResponse>;
    pickAvatar(): Promise<ProfileResponse>;
    pickBanner(): Promise<ProfileResponse>;
  };
  yandex: {
    getLiked(): Promise<SidecarResponse<{ tracks: Track[] }>>;
    getNativeWave(): Promise<SidecarResponse<{ tracks: Track[] }>>;
    getCustomWave(): Promise<SidecarResponse<{ tracks: Track[] }>>;
    getStreamUrl(trackId: string): Promise<SidecarResponse<{ url: string; bitrateKbps: number }>>;
    like(trackId: string): Promise<SidecarResponse<{ ok: boolean }>>;
    search(query: string): Promise<SidecarResponse<{ tracks: Track[] }>>;
  };
  soundcloud: {
    search(query: string): Promise<SoundcloudTrack[]>;
  };
  vk: {
    status(): Promise<{ available: boolean; reason: string }>;
  };
  shell: {
    openExternal(url: string): Promise<void>;
  };
}

declare global {
  interface Window {
    musicHub: MusicHubApi;
  }
}
