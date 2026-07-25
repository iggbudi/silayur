"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchSession, loginRemote } from "../lib/config-api";
import { Brand } from "../components/brand";

export default function LoginPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSession()
      .then(() => {
        if (!cancelled) router.replace("/");
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginRemote(username, password);
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Gagal masuk. Periksa username dan password.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <main className="login-shell">
        <div className="login-card login-loading">
          <span className="section-kicker">Checkpoint 9</span>
          <h1>Memeriksa sesi aman…</h1>
          <p>Menyiapkan akses SILAYUR.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="login-shell">
      <div className="login-card">
        <Brand compact />

        <div className="login-copy">
          <span className="section-kicker">Checkpoint 9</span>
          <h1>Masuk ke sistem</h1>
          <p>
            Gunakan akun operasional Anda. Sesi disimpan aman di server dan
            akses ditentukan oleh role.
          </p>
        </div>

        {error ? (
          <p className="login-error" role="alert">
            {error}
          </p>
        ) : null}

        <form className="user-form login-form" onSubmit={handleLogin}>
          <label>
            <span>Username</span>
            <input
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="contoh: admin.resepsionis"
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={10}
              required
            />
          </label>
          <button
            className="add-button login-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Memeriksa…" : "Masuk"}
          </button>
        </form>

        <footer className="login-note">
          <span aria-hidden="true">i</span>
          <p>
            Hubungi Super Admin bila akun belum memiliki password atau akses
            Anda perlu diperbarui.
          </p>
        </footer>
      </div>
    </main>
  );
}
