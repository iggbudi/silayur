"use client";

import { useEffect, useState } from "react";
import { useSession } from "../hooks/use-session";
import { useMobileSidebar } from "../hooks/use-mobile-sidebar";
import { Brand } from "../components/brand";
import { SidebarNavigation } from "../components/sidebar-navigation";
import { SessionGate } from "../components/session-gate";
import { fetchRemoteConfig } from "../lib/config-api";
import type { TicketProduct } from "../../shared/config";
import {
  SaleForm,
  SaleHistory,
  TodaySummary,
  listTodaySales,
  type Sale,
} from "../features/ticket-sales";

export default function PenjualanPage() {
  const { session, ready: authReady } = useSession();
  const { open: mobileMenuOpen, close: closeMobileMenu, toggle: toggleMobileMenu } = useMobileSidebar();
  const [products, setProducts] = useState<TicketProduct[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<{ date: string; count: number; revenue: number }>({
    date: new Date().toISOString().slice(0, 10),
    count: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authReady || !session) return;
    let cancelled = false;
    void (async () => {
      try {
        const [config, list] = await Promise.all([
          fetchRemoteConfig(),
          listTodaySales(),
        ]);
        if (cancelled) return;
        setProducts(config.ticketProducts);
        setSales(list.sales);
        setSummary({ date: list.date, count: list.count, revenue: list.revenue });
        setError("");
      } catch (caught) {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : "Gagal memuat data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, session]);

  if (!authReady) {
    return <SessionGate title="Memuat penjualan…" />;
  }
  if (!session) {
    return <SessionGate title="Sesi berakhir" message="Silakan masuk kembali." />;
  }
  const access = session.access;
  const canViewVisitors = access.visitors === "view" || access.visitors === "manage";

  if (!canViewVisitors) {
    return (
      <main className="login-shell">
        <div className="login-card">
          <Brand compact />
          <h1>Akses ditolak</h1>
          <p>Anda tidak memiliki izin melihat penjualan tiket.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <button
        className="menu-button"
        type="button"
        aria-label="Buka menu"
        onClick={toggleMobileMenu}
      >
        ☰
      </button>
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <Brand />
        <SidebarNavigation
          access={access}
          modules={session.modules}
          active="dashboard"
          onNavigate={closeMobileMenu}
        />
        <div className="sidebar-footer">
          <div className="avatar">{session.user.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{session.user.name}</strong>
            <small>{session.role?.label ?? session.user.role}</small>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="title-line">
            <h1>Penjualan Tiket</h1>
            <span className="section-kicker">Transaksi hari ini</span>
          </div>
        </header>

        <TodaySummary date={summary.date} count={summary.count} revenue={summary.revenue} />

        {error ? (
          <p className="sale-form-error" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p>Memuat master tiket…</p>
        ) : (
          <SaleForm products={products} onCreated={(sale) => setSales((prev) => [sale, ...prev])} />
        )}

        <section className="panel">
          <div className="panel-heading">
            <h2>Riwayat hari ini</h2>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void (async () => {
                  try {
                    const list = await listTodaySales();
                    setSales(list.sales);
                    setSummary({ date: list.date, count: list.count, revenue: list.revenue });
                    setError("");
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Gagal refresh.");
                  } finally {
                    setLoading(false);
                  }
                })();
              }}
            >
              ↻ Refresh
            </button>
          </div>
          <SaleHistory sales={sales} />
        </section>
      </section>
    </main>
  );
}
