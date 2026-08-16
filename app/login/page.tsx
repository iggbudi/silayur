"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchSession, loginRemote } from "../lib/config-api";
import { Brand } from "../components/brand";

const HERO_POINTS = [
  {
    icon: "🎟️",
    title: "Tiket & pos penjualan",
    text: "Catat transaksi gerbang, area, dan membership dari satu layar.",
  },
  {
    icon: "📊",
    title: "Ringkasan operasional",
    text: "Pendapatan, kunjungan, dan okupansi taman terbarui tiap sesi.",
  },
  {
    icon: "🛡️",
    title: "Akses berbasis role",
    text: "Menu dibatasi sesuai permission, sesi diverifikasi di server.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loggedOut = searchParams.get("loggedOut") === "1";
  const [ready, setReady] = useState(loggedOut);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (loggedOut) return;

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
  }, [loggedOut, router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginRemote(username, password);
      // The authenticated response already primes the client session cache.
      // Refreshing immediately after replace can race vinext navigation and
      // leave the browser on /login until a manual reload.
      router.replace("/");
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
        <section className="login-panel">
          <div className="login-card login-loading">
            <span className="login-spinner" aria-hidden="true" />
            <span className="section-kicker">Sesi SILAYUR</span>
            <h1>Memeriksa sesi aman…</h1>
            <p>Menyiapkan akses SILAYUR.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-shell">
      <section className="login-hero">
        <div className="login-hero-inner">
          <Brand compact />

          <div className="login-hero-copy">
            <span className="login-hero-kicker">Silayur Park · Semarang</span>
            <h2>Kendalikan operasional taman dari satu dasbor.</h2>
            <p>
              Tiket, penjualan, jadwal tim, dan laporan keuangan tersatu dalam
              sistem SILAYUR — khusus untuk akun operasional.
            </p>
          </div>

          <ul className="login-hero-points">
            {HERO_POINTS.map((point) => (
              <li key={point.title}>
                <span className="login-hero-icon" aria-hidden="true">
                  {point.icon}
                </span>
                <div>
                  <strong>{point.title}</strong>
                  <p>{point.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="login-hero-foot">
          Sesi disimpan aman di server dengan cookie <code>HttpOnly</code>.
        </p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-card-brand">
            <Brand compact />
          </div>

          <div className="login-copy">
            <span className="section-kicker">Akses operasional</span>
            <h1>Masuk ke sistem</h1>
            <p>
              Gunakan akun operasional Anda. Hak akses ditentukan oleh role
              yang diberikan Super Admin.
            </p>
          </div>

          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}

          <form className="login-form" onSubmit={handleLogin}>
            <label className="login-field">
              <span>Username</span>
              <span className="login-control">
                <input
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="contoh: admin.resepsionis"
                  required
                />
              </span>
            </label>
            <label className="login-field">
              <span>Password</span>
              <span className="login-control login-control-toggle">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={10}
                  required
                />
                <button
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  aria-pressed={showPassword}
                  className="login-eye"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? "sembunyikan" : "lihat"}
                </button>
              </span>
            </label>
            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? "Memeriksa…" : "Masuk ke dasbor"}
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
      </section>
    </main>
  );
}
