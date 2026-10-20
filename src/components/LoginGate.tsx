import { useEffect, useState } from "react";

type Mode = "checking" | "register" | "login";

export default function LoginGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [mode, setMode] = useState<Mode>("checking");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.musicHub.auth.status().then((s) => {
      setMode(s.hasAccount ? "login" : "register");
      if (s.hasAccount && s.login) setLogin(s.login);
    });
  }, []);

  async function submit() {
    setError(null);

    if (mode === "register" && password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    const res =
      mode === "register"
        ? await window.musicHub.auth.register(login.trim(), password)
        : await window.musicHub.auth.login(login.trim(), password);
    setLoading(false);

    if (res.ok) {
      onUnlocked();
    } else {
      setError(res.error ?? "Что-то пошло не так");
    }
  }

  if (mode === "checking") return <div className="loading">Загрузка…</div>;

  const canSubmit =
    login.trim().length > 0 && password.length > 0 && (mode === "login" || confirm.length > 0);

  return (
    <div className="auth-gate">
      <div className="logo-dot">🎵</div>
      <h2>{mode === "register" ? "Создать аккаунт Xympia" : "Вход в Xympia"}</h2>
      <p>
        {mode === "register"
          ? "Придумай логин и пароль для доступа к приложению — они хранятся только на этом устройстве и не отправляются никуда."
          : "Введи логин и пароль, чтобы открыть приложение."}
      </p>
      <input
        type="text"
        placeholder="Логин"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        autoFocus
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && mode === "login" && canSubmit && submit()}
      />
      {mode === "register" && (
        <input
          type="password"
          placeholder="Повтори пароль"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && submit()}
        />
      )}
      <button disabled={!canSubmit || loading} onClick={submit}>
        {loading ? "…" : mode === "register" ? "Создать аккаунт" : "Войти"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
