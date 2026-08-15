"use client";

import { useEffect, useState } from "react";
import { useSession } from "../hooks/use-session";
import { useMobileSidebar } from "../hooks/use-mobile-sidebar";
import { Brand } from "../components/brand";
import { SidebarNavigation } from "../components/sidebar-navigation";
import { SessionGate } from "../components/session-gate";
import { fetchRemoteConfig } from "../lib/config-api";
import { todayIsoDate } from "../../shared/date";
import { canApproveVoid } from "../../shared/access";
import type { TicketProduct } from "../../shared/config";
import {
  SaleForm,
  SaleHistory,
  TodaySummary,
  approveVoid,
  listTodaySales,
  requestVoid,
  type Sale,
} from "../features/ticket-sales";

type VoidModal =
  | { kind: "request"; saleId: string }
  | { kind: "approve"; saleId: string }
  | null;

export default function PenjualanPage() {
  const { session, ready: authReady } = useSession();
  const { open: mobileMenuOpen, close: closeMobileMenu, toggle: toggleMobileMenu } = useMobileSidebar();
  const [products, setProducts] = useState<TicketProduct[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<{ date: string; count: number; revenue: number }>({
    date: todayIsoDate(),
    count: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [voidModal, setVoidModal] = useState<VoidModal>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidPassword, setVoidPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
  const canApprove = canApproveVoid(session.user.role);

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

  async function refreshSales() {
    const list = await listTodaySales();
    setSales(list.sales);
    setSummary({ date: list.date, count: list.count, revenue: list.revenue });
    setError("");
  }

  function openVoidModal(saleId: string, kind: "request" | "approve") {
    setError("");
    setVoidReason("");
    setVoidPassword("");
    setVoidModal({ kind, saleId });
  }

  async function handleRequestVoid() {
    if (!voidModal || voidModal.kind !== "request") return;
    const reason = voidReason.trim();
    if (reason.length < 3) {
      setError("Alasan pembatalan wajib diisi (minimal 3 karakter).");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await requestVoid(voidModal.saleId, reason);
      if (canApprove) {
        const password = voidPassword;
        if (!password) {
          setError("Konfirmasi password wajib diisi.");
          setSubmitting(false);
          return;
        }
        await approveVoid(voidModal.saleId, password);
      }
      setVoidModal(null);
      await refreshSales();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal membatalkan transaksi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!voidModal || voidModal.kind !== "approve") return;
    const password = voidPassword;
    if (!password) {
      setError("Konfirmasi password wajib diisi.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await approveVoid(voidModal.saleId, password);
      setVoidModal(null);
      await refreshSales();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal menyetujui pembatalan.",
      );
    } finally {
      setSubmitting(false);
    }
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
          active="penjualan"
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
          <SaleForm
            products={products}
            onCreated={(sale) => {
              setSales((prev) => [sale, ...prev]);
              // Update summary secara inkremental jika transaksi completed
              // dan terjadi pada tanggal summary yang sedang ditampilkan.
              if (sale.status === "completed") {
                const saleLocalDate = sale.soldAt.slice(0, 10);
                setSummary((prev) =>
                  prev.date === saleLocalDate
                    ? {
                        ...prev,
                        count: prev.count + 1,
                        revenue: prev.revenue + sale.totalAmount,
                      }
                    : prev,
                );
              }
            }}
          />
        )}

        <section className="panel">
          <div className="panel-heading">
            <h2>Riwayat hari ini</h2>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void refreshSales()
                  .catch((caught) =>
                    setError(
                      caught instanceof Error ? caught.message : "Gagal refresh.",
                    ),
                  )
                  .finally(() => setLoading(false));
              }}
            >
              ↻ Refresh
            </button>
          </div>
          <SaleHistory
            sales={sales}
            canApprove={canApprove}
            onRequestVoid={(saleId) => openVoidModal(saleId, "request")}
            onApprove={(saleId) => openVoidModal(saleId, "approve")}
          />
        </section>
      </section>

      {/* Modal permintaan pembatalan */}
      {voidModal?.kind === "request" ? (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setVoidModal(null);
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="void-request-title"
          >
            <h2 id="void-request-title">Batalkan transaksi</h2>
            <p className="modal-subtitle">
              Masukkan alasan pembatalan{canApprove ? " dan konfirmasi password Anda" : ""}.
              Pembatalan akan mengurangi total penjualan hari ini.
            </p>
            <label className="modal-field">
              <span>Alasan pembatalan (minimal 3 karakter)</span>
              <input
                type="text"
                autoFocus
                placeholder="Mis. salah input jumlah"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
              />
            </label>
            {canApprove ? (
              <label className="modal-field">
                <span>Konfirmasi password Anda</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={voidPassword}
                  onChange={(e) => setVoidPassword(e.target.value)}
                />
              </label>
            ) : null}
            {error ? (
              <p className="sale-form-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="modal-actions">
              <button
                type="button"
                className="finance-btn finance-btn-ghost"
                disabled={submitting}
                onClick={() => {
                  setVoidModal(null);
                  setError("");
                }}
              >
                Batal
              </button>
              <button
                type="button"
                className="finance-btn finance-btn-primary"
                disabled={submitting}
                onClick={() => void handleRequestVoid()}
              >
                {submitting ? "Memproses…" : "Batalkan transaksi"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal persetujuan pembatalan */}
      {voidModal?.kind === "approve" ? (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setVoidModal(null);
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="void-approve-title"
          >
            <h2 id="void-approve-title">Setujui pembatalan</h2>
            <p className="modal-subtitle">
              Konfirmasi password Anda untuk menyetujui pembatalan transaksi.
            </p>
            <label className="modal-field">
              <span>Password Anda</span>
              <input
                type="password"
                autoFocus
                placeholder="••••••••"
                value={voidPassword}
                onChange={(e) => setVoidPassword(e.target.value)}
              />
            </label>
            {error ? (
              <p className="sale-form-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="modal-actions">
              <button
                type="button"
                className="finance-btn finance-btn-ghost"
                disabled={submitting}
                onClick={() => {
                  setVoidModal(null);
                  setError("");
                }}
              >
                Batal
              </button>
              <button
                type="button"
                className="finance-btn finance-btn-primary"
                disabled={submitting}
                onClick={() => void handleApprove()}
              >
                {submitting ? "Memproses…" : "Setujui pembatalan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
