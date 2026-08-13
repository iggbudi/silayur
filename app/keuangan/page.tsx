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
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyetujui.");
    }
  }

  async function handleOpenShift() {
    setError("");
    try {
      await openCashSession();
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal membuka shift.");
    }
  }

  async function handleCloseShift() {
    const declared = window.prompt("Jumlah setoran kas (Rupiah):");
    if (declared === null) return;
    setError("");
    try {
      await closeCashSession(Number(declared));
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menutup shift.");
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

      <section className="workspace">
        <header className="topbar">
          <div className="title-line">
            <h1>Keuangan</h1>
            <span className="section-kicker">Pemasukan, pengeluaran & kas</span>
          </div>
        </header>

        {error ? (
          <p className="sale-form-error" role="alert">
            {error}
          </p>
        ) : null}

        {summary ? (
          <div className="today-summary">
            <div>
              <span>Total pendapatan</span>
              <strong>{currency.format(summary.totalRevenue)}</strong>
            </div>
            <div>
              <span>Tiket</span>
              <strong>{currency.format(summary.ticketRevenue)}</strong>
            </div>
            <div>
              <span>Non-tiket</span>
              <strong>{currency.format(summary.otherRevenue)}</strong>
            </div>
          </div>
        ) : null}

        <section className="panel">
          <div className="panel-heading">
            <h2>Shift kas</h2>
          </div>
          {shift ? (
            <div>
              <p>
                Shift aktif dibuka pada{" "}
                {new Date(shift.openedAt).toLocaleTimeString("id-ID")}.
              </p>
              {canManageFinance ? (
                <button type="button" onClick={handleCloseShift}>
                  Tutup shift
                </button>
              ) : null}
            </div>
          ) : (
            <div>
              <p>Belum ada shift kas aktif.</p>
              {canManageFinance ? (
                <button type="button" onClick={handleOpenShift}>
                  Buka shift
                </button>
              ) : null}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Pemasukan non-tiket</h2>
          </div>
          {canManageFinance ? (
            <div className="finance-form">
              <select
                value={revSource}
                onChange={(e) => setRevSource(e.target.value)}
              >
                <option value="">Pilih sumber…</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Nominal (Rp)"
                value={revAmount}
                onChange={(e) => setRevAmount(e.target.value)}
              />
              <input
                type="text"
                placeholder="Catatan"
                value={revNote}
                onChange={(e) => setRevNote(e.target.value)}
              />
              <button type="button" onClick={handleAddRevenue}>
                Catat
              </button>
            </div>
          ) : null}
          <ul className="sale-history">
            {revenues.map((r) => (
              <li key={r.id} className="sale-history-row">
                <div>
                  <strong>{r.sourceName}</strong>
                  <small>{r.recordedByName ?? r.recordedBy}</small>
                </div>
                <div>
                  <strong>{currency.format(r.amount)}</strong>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Pengeluaran</h2>
          </div>
          {canManageFinance ? (
            <div className="finance-form">
              <input
                type="text"
                placeholder="Keterangan"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder="Nominal (Rp)"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
              />
              <input
                type="text"
                placeholder="Catatan"
                value={expNote}
                onChange={(e) => setExpNote(e.target.value)}
              />
              <button type="button" onClick={handleAddExpense}>
                Catat
              </button>
            </div>
          ) : null}
          <ul className="sale-history">
            {expenses.map((e) => (
              <li key={e.id} className="sale-history-row">
                <div>
                  <strong>{e.description}</strong>
                  <small>{e.recordedByName ?? e.recordedBy}</small>
                </div>
                <div>
                  <span className={`sale-status sale-status-${e.status}`}>
                    {e.status === "pending"
                      ? "Pending"
                      : e.status === "approved"
                        ? "Disetujui"
                        : "Void"}
                  </span>
                  <strong>{currency.format(e.amount)}</strong>
                  {e.status === "pending" && canManageFinance ? (
                    <button type="button" onClick={() => handleApprove(e.id)}>
                      Setujui
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {loading ? <p>Memuat…</p> : null}
      </section>
    </main>
  );
}
