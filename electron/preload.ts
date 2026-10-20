import { contextBridge, ipcRenderer } from "electron";

const api = {
  auth: {
    status: () => ipcRenderer.invoke("auth:status"),
    register: (login: string, password: string) => ipcRenderer.invoke("auth:register", { login, password }),
    login: (login: string, password: string) => ipcRenderer.invoke("auth:login", { login, password }),
  },
  settings: {
    getYandexToken: () => ipcRenderer.invoke("settings:getYandexToken"),
    setYandexToken: (token: string) => ipcRenderer.invoke("settings:setYandexToken", token),
    clearYandexToken: () => ipcRenderer.invoke("settings:clearYandexToken"),
    getSoundcloudToken: () => ipcRenderer.invoke("settings:getSoundcloudToken"),
    setSoundcloudToken: (token: string) => ipcRenderer.invoke("settings:setSoundcloudToken", token),
    clearSoundcloudToken: () => ipcRenderer.invoke("settings:clearSoundcloudToken"),
    getTheme: () => ipcRenderer.invoke("settings:getTheme"),
    setTheme: (theme: "dark" | "light") => ipcRenderer.invoke("settings:setTheme", theme),
  },
  profile: {
    get: () => ipcRenderer.invoke("profile:get"),
    setUsername: (username: string) => ipcRenderer.invoke("profile:setUsername", username),
    pickAvatar: () => ipcRenderer.invoke("profile:pickAvatar"),
    pickBanner: () => ipcRenderer.invoke("profile:pickBanner"),
  },
  yandex: {
    getLiked: () => ipcRenderer.invoke("yandex:getLiked"),
    getNativeWave: () => ipcRenderer.invoke("yandex:getNativeWave"),
    getCustomWave: () => ipcRenderer.invoke("yandex:getCustomWave"),
    getStreamUrl: (trackId: string) => ipcRenderer.invoke("yandex:getStreamUrl", trackId),
    like: (trackId: string) => ipcRenderer.invoke("yandex:like", trackId),
    search: (query: string) => ipcRenderer.invoke("yandex:search", query),
  },
  soundcloud: {
    search: (query: string) => ipcRenderer.invoke("soundcloud:search", query),
  },
  vk: {
    status: () => ipcRenderer.invoke("vk:status"),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  },
};

contextBridge.exposeInMainWorld("musicHub", api);

export type MusicHubApi = typeof api;
