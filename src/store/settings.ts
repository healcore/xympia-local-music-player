import { create } from "zustand";
import type { Profile, Theme } from "../global";

interface SettingsState {
  theme: Theme;
  profile: Profile;
  loaded: boolean;
  load: () => Promise<void>;
  toggleTheme: () => Promise<void>;
  setUsername: (username: string) => Promise<{ ok: boolean; error?: string }>;
  pickAvatar: () => Promise<void>;
  pickBanner: () => Promise<void>;
}

const emptyProfile: Profile = {
  username: null,
  avatarDataUrl: null,
  bannerDataUrl: null,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: "dark",
  profile: emptyProfile,
  loaded: false,

  load: async () => {
    const [theme, profile] = await Promise.all([
      window.musicHub.settings.getTheme(),
      window.musicHub.profile.get(),
    ]);
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme, profile, loaded: true });
  },

  toggleTheme: async () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    set({ theme: next });
    await window.musicHub.settings.setTheme(next);
  },

  setUsername: async (username: string) => {
    const res = await window.musicHub.profile.setUsername(username);
    if (res.ok && res.profile) {
      set({ profile: res.profile });
      return { ok: true };
    }
    return { ok: false, error: res.error ?? "Не удалось сохранить username" };
  },

  pickAvatar: async () => {
    const res = await window.musicHub.profile.pickAvatar();
    if (res.ok && res.profile) set({ profile: res.profile });
  },

  pickBanner: async () => {
    const res = await window.musicHub.profile.pickBanner();
    if (res.ok && res.profile) set({ profile: res.profile });
  },
}));
