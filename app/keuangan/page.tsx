"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "../hooks/use-session";
import { useMobileSidebar } from "../hooks/use-mobile-sidebar";
import { Brand } from "../components/brand";
import { SidebarNavigation } from "../components/sidebar-navigation";
import { SessionGate } from "../components/session-gate";
import { fetchRemoteConfig } from "../lib/config-api";
import { todayIsoDate } from "../../shared/date";
import type { ConfigItem } from "../../shared/config";
import {
  approveExpense,
  cashSession,
  closeCashSession,
  createExpense,
  createRevenueEntry,
  financeSummary,
  listExpenses,
  listRevenue,
  openCashSession,
  voidExpense,
  voidRevenueEntry,
  type CashSession,
  type Expense,
  type FinanceSummary,
  type RevenueEntry,
} from "../features/finance";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function KeuanganPage() {
  const { session, ready: authReady } = useSession();
  const {
    open: mobileMenuOpen,
    close: closeMobileMenu,
    toggle: toggleMobileMenu,
  } = useMobileSidebar();
  const [sources, setSources] = useState<ConfigItem[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [revenues, setRevenues] = useState<RevenueEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shift, setShift] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [declaredCash, setDeclaredCash] = useState("");
  const [revSource, setRevSource] = useState("");
  const [revAmount, setRevAmount] = useState("");
  const [revNote, setRevNote] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expNote, setExpNote] = useState("");

  const loadData = useCallback(async () => {
    const date = todayIsoDate();
    const [sum, revs, exps, cs, config] = await Promise.all([
      financeSummary(),
      listRevenue(date),
      listExpenses(date),
      cashSession(),
      fetchRemoteConfig(),
    ]);
    setSummary(sum);
    setRevenues(revs);
    setExpenses(exps);
    setShift(cs);
    setSources(config.configItems.revenue.filter((item) => item.active));
  }, []);

  useEffect(() => {
    if (!authReady || !session) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadData();
        if (!cancelled) setError("");
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "Gagal memuat data.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, session, loadData]);

  if (!authReady) return <SessionGate title="Memuat keuangan…" />;
  if (!session) {
    return <SessionGate title="Sesi berakhir" message="Silakan masuk kembali." />;
  }
  const access = session.access;
  const canViewFinance = access.finance === "view" || access.finance === "manage";
  const canManageFinance = access.finance === "manage";

  if (!canViewFinance) {
    return (
      <main className="login-shell">
        <div className="login-card">
          <Brand compact />
          <h1>Akses ditolak</h1>
          <p>Anda tidak memiliki izin melihat keuangan.</p>
        </div>
      </main>
    );
  }

  async function handleAddRevenue() {
    setError("");
    try {
      await createRevenueEntry({
        sourceKey: revSource,
        sourceName:
          sources.find((s) => s.id === revSource)?.name ?? revSource,
        amount: Number(revAmount),
        note: revNote,
      });
      setRevAmount("");
      setRevNote("");
      setNotice("Pemasukan berhasil dicatat.");
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal mencatat pemasukan.",
      );
    }
  }

  async function handleAddExpense() {
    setError("");
    try {
      await createExpense({
        description: expDesc,
        amount: Number(expAmount),
        note: expNote,
      });
      setExpDesc("");
      setExpAmount("");
      setExpNote("");
      setNotice("Pengeluaran berhasil dicatat (menunggu persetujuan).");
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal mencatat pengeluaran.",
      );
    }
  }

  async function handleApprove(id: string) {
    setError("");
    try {
      await approveExpense(id);
      setNotice("Pengeluaran disetujui.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyetujui.");
    }
  }

  async function handleVoidRevenue(id: string) {
    setError("");
    try {
      await voidRevenueEntry(id);
      setNotice("Pemasukan dibatalkan dan tidak dihitung.");
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal membatalkan pemasukan.",
      );
    }
  }

  async function handleVoidExpense(id: string) {
    setError("");
    try {
      await voidExpense(id);
      setNotice("Pengeluaran dibatalkan dan tidak dihitung.");
      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal membatalkan pengeluaran.",
      );
    }
  }

  async function handleOpenShift() {
    setError("");
    try {
      await openCashSession();
      setNotice("Sesi kas dimulai.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memulai sesi kas.");
    }
  }

  async function handleCloseShift() {
    setError("");
    setNotice("");
    const declared = Number(declaredCash);
    if (!Number.isFinite(declared) || declared < 0) {
      setError("Masukkan jumlah setoran kas yang valid.");
      return;
    }
    try {
      await closeCashSession(declared);
      setCloseModalOpen(false);
      setDeclaredCash("");
      setNotice("Kas harian disetor. Selisih kas tercatat.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal setor kas.");
    }
  }

  const shiftStatusLabel = shift
    ? `Sesi kas berjalan sejak ${new Date(shift.openedAt).toLocaleTimeString("id-ID")}`
    : "Belum ada sesi kas untuk hari ini";

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
          active="keuangan"
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

      <section className="workspace finance-workspace">
        <header className="topbar">
          <div className="title-line">
            <h1>Keuangan</h1>
            <span className="section-kicker">Pemasukan, pengeluaran &amp; kas</span>
          </div>
        </header>

        {notice ? (
          <p className="finance-notice" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="sale-form-error" role="alert">
            {error}
          </p>
        ) : null}

        {/* 1. Status kas harian — aksi utama */}
        <section className={`panel shift-panel shift-${shift ? "open" : "closed"}`}>
          <div className="shift-panel-body">
            <div className="shift-status-icon" aria-hidden="true">
              {shift ? "●" : "○"}
            </div>
            <div>
              <div className="shift-label">Kas harian</div>
              <div className="shift-status-text">{shiftStatusLabel}</div>
              <div className="shift-hint">
                {shift
                  ? "Catat pemasukan &amp; pengeluaran selama sesi berjalan, lalu setor saat selesai."
                  : "Mulai sesi untuk mencatat uang masuk dan keluar. Saat selesai, sistem menghitung selisih kas secara otomatis."}
              </div>
            </div>
          </div>
          {canManageFinance ? (
            <div className="shift-actions">
              {shift ? (
                <button
                  type="button"
                  className="finance-btn finance-btn-primary"
                  onClick={() => setCloseModalOpen(true)}
                >
                  Setor kas
                </button>
              ) : (
                <button
                  type="button"
                  className="finance-btn finance-btn-primary"
                  onClick={handleOpenShift}
                >
                  Mulai sesi kas
                </button>
              )}
            </div>
          ) : null}
        </section>

        {/* 2. Ringkasan pendapatan hari ini */}
        {summary ? (
          <section className="finance-summary" aria-label="Ringkasan pendapatan hari ini">
            <div className="finance-summary-main">
              <span>Total pendapatan hari ini</span>
              <strong>{currency.format(summary.totalRevenue)}</strong>
            </div>
            <div className="finance-summary-breakdown">
              <div>
                <span>Dari tiket</span>
                <strong>{currency.format(summary.ticketRevenue)}</strong>
              </div>
              <div>
                <span>Di luar tiket</span>
                <strong>{currency.format(summary.otherRevenue)}</strong>
              </div>
            </div>
          </section>
        ) : null}

        {/* 3. Pemasukan non-tiket */}
        <section className="panel">
          <div className="panel-heading">
            <h2>Pemasukan non-tiket</h2>
          </div>
          {canManageFinance ? (
            <form
              className="finance-form"
              onSubmit={(e) => {
                e.preventDefault();
                void handleAddRevenue();
              }}
            >
              <label>
                <span>Sumber</span>
                <select
                  value={revSource}
                  onChange={(e) => setRevSource(e.target.value)}
                  required
                >
                  <option value="">Pilih sumber…</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Nominal (Rp)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="0"
                  value={revAmount}
                  onChange={(e) => setRevAmount(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Catatan (opsional)</span>
                <input
                  type="text"
                  placeholder="Mis. sewa lapak A"
                  value={revNote}
                  onChange={(e) => setRevNote(e.target.value)}
                />
              </label>
              <button type="submit" className="finance-btn finance-btn-primary">
                Catat pemasukan
              </button>
            </form>
          ) : null}
          <div className="finance-list">
            {revenues.length === 0 ? (
              <p className="finance-empty">Belum ada pemasukan non-tiket hari ini.</p>
            ) : (
              <ul>
                {revenues.map((r) => (
                  <li
                    key={r.id}
                    className={`finance-row ${r.status === "voided" ? "finance-row-voided" : ""}`}
                  >
                    <div>
                      <strong>{r.sourceName}</strong>
                      <small>{r.recordedByName ?? r.recordedBy}</small>
                      {r.status === "voided" ? (
                        <small className="sale-void-reason">Dibatalkan</small>
                      ) : null}
                    </div>
                    <div className="finance-amount finance-amount-in">
                      +{currency.format(r.amount)}
                    </div>
                    {r.status === "active" && canManageFinance ? (
                      <button
                        type="button"
                        className="finance-btn finance-btn-danger"
                        onClick={() => handleVoidRevenue(r.id)}
                      >
                        Batalkan
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 4. Pengeluaran */}
        <section className="panel">
          <div className="panel-heading">
            <h2>Pengeluaran</h2>
          </div>
          {canManageFinance ? (
            <form
              className="finance-form"
              onSubmit={(e) => {
                e.preventDefault();
                void handleAddExpense();
              }}
            >
              <label>
                <span>Keterangan</span>
                <input
                  type="text"
                  placeholder="Mis. beli ATK"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Nominal (Rp)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="0"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Catatan (opsional)</span>
                <input
                  type="text"
                  placeholder="Mis. pembelian mingguan"
                  value={expNote}
                  onChange={(e) => setExpNote(e.target.value)}
                />
              </label>
              <button type="submit" className="finance-btn finance-btn-primary">
                Catat pengeluaran
              </button>
            </form>
          ) : null}
          <div className="finance-list">
            {expenses.length === 0 ? (
              <p className="finance-empty">Belum ada pengeluaran hari ini.</p>
            ) : (
              <ul>
                {expenses.map((e) => (
                  <li key={e.id} className="finance-row">
                    <div>
                      <strong>{e.description}</strong>
                      <small>{e.recordedByName ?? e.recordedBy}</small>
                    </div>
                    <div className="finance-amount finance-amount-out">
                      −{currency.format(e.amount)}
                    </div>
                    <span className={`sale-status sale-status-${e.status}`}>
                      {e.status === "pending"
                        ? "Menunggu"
                        : e.status === "approved"
                          ? "Disetujui"
                          : "Void"}
                    </span>
                    {e.status === "pending" && canManageFinance ? (
                      <button
                        type="button"
                        className="finance-btn finance-btn-ghost"
                        onClick={() => handleApprove(e.id)}
                      >
                        Setujui
                      </button>
                    ) : null}
                    {e.status !== "voided" && canManageFinance ? (
                      <button
                        type="button"
                        className="finance-btn finance-btn-danger"
                        onClick={() => handleVoidExpense(e.id)}
                      >
                        Batalkan
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {loading ? <p>Memuat…</p> : null}

        {/* Modal setor kas */}
        {closeModalOpen ? (
          <div
            className="modal-overlay"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setCloseModalOpen(false);
            }}
          >
            <div
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="close-shift-title"
            >
              <h2 id="close-shift-title">Setor kas harian</h2>
              <p className="modal-subtitle">
                Masukkan jumlah uang yang disetor dari kas. Sistem akan menghitung
                selisih terhadap catatan transaksi.
              </p>
              {summary ? (
                <div className="modal-summary">
                  <span>Total pendapatan tercatat</span>
                  <strong>{currency.format(summary.totalRevenue)}</strong>
                </div>
              ) : null}
              <label className="modal-field">
                <span>Jumlah setoran kas (Rp)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  autoFocus
                  placeholder="0"
                  value={declaredCash}
                  onChange={(e) => setDeclaredCash(e.target.value)}
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
                  onClick={() => {
                    setCloseModalOpen(false);
                    setError("");
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="finance-btn finance-btn-primary"
                  onClick={() => void handleCloseShift()}
                >
                  Setor kas
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
