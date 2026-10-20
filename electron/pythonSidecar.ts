import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";

const SIDECAR_PORT = 8799;
const SIDECAR_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

let proc: ChildProcessWithoutNullStreams | null = null;

/**
 * Запускает python-sidecar/server.py как отдельный процесс.
 * Требует, чтобы python и зависимости из python-sidecar/requirements.txt
 * были установлены (см. README, раздел "Установка").
 */
export async function startPythonSidecar(): Promise<void> {
  const serverPath = path.join(__dirname, "..", "python-sidecar", "server.py");
  const pythonBin = process.platform === "win32" ? "python" : "python3";

  proc = spawn(pythonBin, [serverPath, "--port", String(SIDECAR_PORT)], {
    stdio: "pipe",
  });

  proc.stdout.on("data", (d) => console.log(`[sidecar] ${d}`.trim()));
  proc.stderr.on("data", (d) => console.error(`[sidecar:err] ${d}`.trim()));
  proc.on("exit", (code) => console.log(`[sidecar] exited with code ${code}`));

  await waitForHealth();
}

export function stopPythonSidecar(): void {
  proc?.kill();
  proc = null;
}

async function waitForHealth(retries = 30): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${SIDECAR_URL}/health`);
      if (res.ok) return;
    } catch {
      // сайдкар ещё не поднялся — подождём
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  console.error("[sidecar] не отозвался на /health — проверь, что python и зависимости установлены");
}

type FetchOpts = { method?: string; body?: unknown };

export async function sidecarFetch(pathName: string, opts: FetchOpts = {}) {
  try {
    const res = await fetch(`${SIDECAR_URL}${pathName}`, {
      method: opts.method ?? "GET",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: String(err) };
  }
}
