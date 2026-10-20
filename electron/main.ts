import { app, BrowserWindow, ipcMain, shell, dialog, nativeImage } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import Store from "electron-store";
import { startPythonSidecar, stopPythonSidecar, sidecarFetch } from "./pythonSidecar";
import { searchSoundcloudTracks } from "./services/soundcloud";
import { vkStubStatus } from "./services/vk";

type Theme = "dark" | "light";

interface Profile {
  username: string | null;
  avatarDataUrl: string | null;
  bannerDataUrl: string | null;
}

interface Account {
  login: string;
  salt: string;
  hash: string;
}

interface StoreShape {
  yandexToken?: string;
  soundcloudToken?: string;
  theme?: Theme;
  profile?: Profile;
  account?: Account;
}

const store = new Store<StoreShape>({
  defaults: {
    theme: "dark",
    profile: { username: null, avatarDataUrl: null, bannerDataUrl: null },
  },
});

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6MB, чтобы не раздувать electron-store

/* ---------- Локальный вход (логин/пароль приложения) ---------- */

const MIN_LOGIN_LEN = 3;
const MIN_PASSWORD_LEN = 6;

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function passwordMatches(candidate: string, account: Account): boolean {
  const candidateHash = Buffer.from(hashPassword(candidate, account.salt), "hex");
  const storedHash = Buffer.from(account.hash, "hex");
  if (candidateHash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(candidateHash, storedHash);
}

function readImageAsDataUrl(filePath: string): { ok: true; dataUrl: string } | { ok: false; error: string } {
  const stat = fs.statSync(filePath);
  if (stat.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Файл слишком большой (максимум 6 МБ)" };
  }
  const ext = path.extname(filePath).toLowerCase().replace(".", "");
  const mime =
    ext === "jpg" ? "image/jpeg" : ext === "svg" ? "image/svg+xml" : `image/${ext || "png"}`;
  const buf = fs.readFileSync(filePath);
  return { ok: true, dataUrl: `data:${mime};base64,${buf.toString("base64")}` };
}

let mainWindow: BrowserWindow | null = null;
const VITE_DEV_URL = "http://localhost:5173";

function createWindow() {
  const iconPath = path.join(__dirname, "..", "build", "icon.png");
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0e0e12",
    icon: fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL(VITE_DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(async () => {
  await startPythonSidecar();

  const savedToken = store.get("yandexToken");
  if (savedToken) {
    await sidecarFetch("/auth/token", { method: "POST", body: { token: savedToken } });
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopPythonSidecar();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => stopPythonSidecar());

/* ---------- IPC: локальный вход в приложение (логин/пароль) ---------- */

ipcMain.handle("auth:status", () => {
  const account = store.get("account");
  return { hasAccount: !!account, login: account?.login ?? null };
});

ipcMain.handle("auth:register", (_e, payload: { login: string; password: string }) => {
  if (store.get("account")) {
    return { ok: false, error: "Аккаунт уже создан — используй вход" };
  }
  const login = (payload?.login ?? "").trim();
  const password = payload?.password ?? "";
  if (login.length < MIN_LOGIN_LEN) {
    return { ok: false, error: `Логин должен быть не короче ${MIN_LOGIN_LEN} символов` };
  }
  if (password.length < MIN_PASSWORD_LEN) {
    return { ok: false, error: `Пароль должен быть не короче ${MIN_PASSWORD_LEN} символов` };
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  store.set("account", { login, salt, hash });
  return { ok: true };
});

ipcMain.handle("auth:login", (_e, payload: { login: string; password: string }) => {
  const account = store.get("account");
  if (!account) return { ok: false, error: "Аккаунт ещё не создан" };
  const login = (payload?.login ?? "").trim();
  const password = payload?.password ?? "";
  if (login !== account.login || !passwordMatches(password, account)) {
    return { ok: false, error: "Неверный логин или пароль" };
  }
  return { ok: true };
});

/* ---------- IPC: настройки/токены сервисов (Яндекс Музыка, SoundCloud) ---------- */

ipcMain.handle("settings:getYandexToken", () => store.get("yandexToken") ?? null);

ipcMain.handle("settings:setYandexToken", async (_e, token: string) => {
  const res = await sidecarFetch("/auth/token", { method: "POST", body: { token } });
  if (res.ok) store.set("yandexToken", token);
  return res;
});

ipcMain.handle("settings:clearYandexToken", () => {
  store.delete("yandexToken");
  return { ok: true };
});

ipcMain.handle("settings:getSoundcloudToken", () => store.get("soundcloudToken") ?? null);

ipcMain.handle("settings:setSoundcloudToken", (_e, token: string) => {
  const trimmed = (token ?? "").trim();
  if (!trimmed) return { ok: false, error: "Токен не может быть пустым" };
  store.set("soundcloudToken", trimmed);
  return { ok: true };
});

ipcMain.handle("settings:clearSoundcloudToken", () => {
  store.delete("soundcloudToken");
  return { ok: true };
});

/* ---------- IPC: Яндекс Музыка (через python-сайдкар) ---------- */

ipcMain.handle("yandex:getLiked", () => sidecarFetch("/library/liked"));
ipcMain.handle("yandex:getNativeWave", () => sidecarFetch("/wave/native"));
ipcMain.handle("yandex:getCustomWave", () => sidecarFetch("/wave/custom"));
ipcMain.handle("yandex:getStreamUrl", (_e, trackId: string) =>
  sidecarFetch(`/track/${encodeURIComponent(trackId)}/stream`)
);
ipcMain.handle("yandex:like", (_e, trackId: string) =>
  sidecarFetch(`/library/like/${encodeURIComponent(trackId)}`, { method: "POST" })
);

ipcMain.handle("yandex:search", (_e, query: string) =>
  sidecarFetch(`/search/tracks?q=${encodeURIComponent(query)}`)
);

/* ---------- IPC: SoundCloud (напрямую из Node) ---------- */

ipcMain.handle("soundcloud:search", (_e, query: string) => searchSoundcloudTracks(query));

/* ---------- IPC: тема оформления ---------- */

ipcMain.handle("settings:getTheme", () => store.get("theme") ?? "dark");

ipcMain.handle("settings:setTheme", (_e, theme: Theme) => {
  store.set("theme", theme);
});

/* ---------- IPC: профиль (username, аватар, баннер) ---------- */

ipcMain.handle("profile:get", () => store.get("profile"));

ipcMain.handle("profile:setUsername", (_e, rawUsername: string) => {
  const username = (rawUsername ?? "").trim();
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error:
        "Username должен начинаться с буквы, содержать 5–32 символов: латинские буквы, цифры, _",
    };
  }
  const profile = { ...(store.get("profile") as Profile), username };
  store.set("profile", profile);
  return { ok: true, profile };
});

async function pickImage(kind: "avatarDataUrl" | "bannerDataUrl") {
  if (!mainWindow) return { ok: false, error: "Окно недоступно" };
  const res = await dialog.showOpenDialog(mainWindow, {
    title: kind === "avatarDataUrl" ? "Выбери аватарку" : "Выбери баннер",
    properties: ["openFile"],
    filters: [{ name: "Изображения", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
  });
  if (res.canceled || res.filePaths.length === 0) {
    return { ok: false, error: "cancelled" };
  }
  const read = readImageAsDataUrl(res.filePaths[0]);
  if (!read.ok) return { ok: false, error: read.error };

  const profile = { ...(store.get("profile") as Profile), [kind]: read.dataUrl };
  store.set("profile", profile);
  return { ok: true, profile };
}

ipcMain.handle("profile:pickAvatar", () => pickImage("avatarDataUrl"));
ipcMain.handle("profile:pickBanner", () => pickImage("bannerDataUrl"));

/* ---------- IPC: VK (заглушка) ---------- */

ipcMain.handle("vk:status", () => vkStubStatus());

/* ---------- IPC: открыть ссылку в системном браузере ---------- */

ipcMain.handle("shell:openExternal", (_e, url: string) => shell.openExternal(url));
