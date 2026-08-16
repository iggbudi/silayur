"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "../hooks/use-session";
import { useMobileSidebar } from "../hooks/use-mobile-sidebar";
import { useParkName } from "../hooks/use-park-name";
import { Brand } from "../components/brand";
import { SidebarNavigation } from "../components/sidebar-navigation";
import { SidebarFooter } from "../components/sidebar-footer";
import { SessionGate } from "../components/session-gate";
import { todayIsoDate } from "../../shared/date";
import {
  fetchDayExpenses,
  fetchDayRevenue,
  fetchDaySales,
  reportSummary,
  type ReportDailyRow,
  type ReportRange,
  type ReportSessionRow,
} from "../features/reports";
import type { Sale } from "../features/ticket-sales";
import type { Expense, RevenueEntry } from "../features/finance";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("id-ID");

type DayDetail = {
  sales: Sale[];
  revenue: RevenueEntry[];
  expenses: Expense[];
};

function monthStart(): string {
  const today = todayIsoDate();
  return `${today.slice(0, 8)}01`;
}

function formatDate(dateIso: string): string {
  const [year, month, day] = dateIso.split("-");
  return `${day}/${month}/${year}`;
}

function formatDayType(dayType: string): string {
  return dayType === "weekend" ? "Akhir pekan" : "Hari kerja";
}

function formatSession(session: ReportSessionRow): string {
  return session.status === "closed"
    ? "Ditutup"
    : "Berjalan";
}

export default function LaporanPage() {
  const { session, ready: authReady, logout } = useSession();
  const parkName = useParkName();
  const {
    open: mobileMenuOpen,
    close: closeMobileMenu,
    toggle: toggleMobileMenu,
  } = useMobileSidebar();

  const [from, setFrom] = useState<string>(() => monthStart());
  const [to, setTo] = useState<string>(() => todayIsoDate());
  const [appliedFrom, setAppliedFrom] = useState<string>(() => monthStart());
  const [appliedTo, setAppliedTo] = useState<string>(() => todayIsoDate());
  const [report, setReport] = useState<ReportRange | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [saleStatusFilter, setSaleStatusFilter] = useState<
    "all" | "completed" | "void_pending" | "voided"
  >("all");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");

  const loadReport = useCallback(async (fromArg: string, toArg: string) => {
    const data = await reportSummary(fromArg, toArg);
    setReport(data);
    setSelectedDate(null);
    setDayDetail(null);
  }, []);

  useEffect(() => {
    if (!authReady || !session) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadReport(appliedFrom, appliedTo);
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
  }, [authReady, session, appliedFrom, appliedTo, loadReport]);

  function handleApplyRange() {
    setError("");
    if (!from || !to) {
      setError("Pilih rentang tanggal terlebih dahulu.");
      return;
    }
    if (from > to) {
      setError("Tanggal awal tidak boleh lebih baru dari tanggal akhir.");
      return;
    }
    setAppliedFrom(from);
    setAppliedTo(to);
    setLoading(true);
  }

  function handlePreset(kind: "today" | "week" | "month") {
    const today = todayIsoDate();
    if (kind === "today") {
      setFrom(today);
      setTo(today);
    } else if (kind === "week") {
      const end = new Date(`${today}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() - 6);
      setFrom(end.toISOString().slice(0, 10));
      setTo(today);
    } else {
      setFrom(monthStart());
      setTo(today);
    }
    setAppliedFrom(kind === "week" ? (() => {
      const end = new Date(`${today}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() - 6);
      return end.toISOString().slice(0, 10);
    })() : kind === "today" ? today : monthStart());
    setAppliedTo(today);
    setLoading(true);
  }

  async function handleSelectDay(date: string) {
    setSelectedDate(date);
    setDayDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const [sales, revenue, expenses] = await Promise.all([
        fetchDaySales(date),
        fetchDayRevenue(date),
        fetchDayExpenses(date),
      ]);
      setDayDetail({ sales: sales.sales, revenue, expenses });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Gagal memuat rincian hari.";
      if (
        message.includes("izin") ||
        message.includes("Akses ditolak") ||
        message.includes("403")
      ) {
        setDetailError(
          "Anda tidak memiliki izin melihat rincian hari ini. Rekap tetap tersedia.",
        );
      } else {
        setDetailError(message);
      }
    } finally {
      setDetailLoading(false);
    }
  }

  if (!authReady) return <SessionGate title="Memuat laporan…" />;
  if (!session) {
    return <SessionGate title="Sesi berakhir" message="Silakan masuk kembali." />;
  }
  const access = session.access;
  const canViewReports = access.reports === "view" || access.reports === "manage";
  const canViewVisitors = access.visitors === "view" || access.visitors === "manage";
  const canViewFinance = access.finance === "view" || access.finance === "manage";

  if (!canViewReports) {
    return (
      <main className="login-shell">
        <div className="login-card">
          <Brand compact />
          <h1>Akses ditolak</h1>
          <p>Anda tidak memiliki izin melihat laporan.</p>
        </div>
      </main>
    );
  }

  const kpis = report
    ? [
        { label: "Pengunjung", value: numberFormat.format(report.sales.visitors) },
        { label: "Transaksi tiket", value: numberFormat.format(report.sales.count) },
        { label: "Pendapatan tiket", value: currency.format(report.sales.revenue) },
        { label: "Pemasukan non-tiket", value: currency.format(report.revenue.amount) },
        { label: "Pengeluaran disetujui", value: currency.format(report.expenses.approvedAmount) },
        { label: "Selisih kas (net)", value: currency.format(
          report.sales.revenue + report.revenue.amount - report.expenses.approvedAmount,
        ) },
      ]
    : [];

  return (
    <main className="app-shell">
      <button
        type="button"
        className="mobile-menu-btn"
        aria-label="Buka menu navigasi"
        onClick={toggleMobileMenu}
      >
        ☰
      </button>
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <Brand />
        <SidebarNavigation
          access={access}
          modules={session.modules}
          active="laporan"
          onNavigate={closeMobileMenu}
        />
        <SidebarFooter
          name={session.user.name}
          roleLabel={session.role?.label ?? session.user.role}
          onLogout={() => {
            void logout();
          }}
        />
      </aside>

      <section className="workspace report-workspace">
        {/* Header cetak — hanya tampil saat print/PDF */}
        <div className="report-print-header">
          <h1>{parkName} — Laporan Operasional</h1>
          <p>
            Rentang: {formatDate(appliedFrom)} — {formatDate(appliedTo)} ·{" "}
            Dicetak {new Date().toLocaleString("id-ID")}
          </p>
        </div>

        <header className="topbar">
          <div className="title-line">
            <h1>Laporan</h1>
            <span className="section-kicker">Rekap operasional</span>
          </div>
          {report ? (
            <button
              type="button"
              className="finance-btn finance-btn-primary report-print-btn"
              onClick={() => window.print()}
            >
              Cetak / PDF
            </button>
          ) : null}
        </header>

        {error ? (
          <p className="sale-form-error" role="alert">
            {error}
          </p>
        ) : null}

        {/* 1. Rentang tanggal */}
        <section className="panel">
          <div className="panel-heading">
            <h2>Rentang tanggal</h2>
          </div>
          <div className="report-range-form">
            <label>
              <span>Dari</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              <span>Sampai</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="finance-btn finance-btn-primary"
              onClick={handleApplyRange}
            >
              Terapkan
            </button>
          </div>
          <div className="report-presets">
            <button type="button" className="report-preset" onClick={() => handlePreset("today")}>
              Hari ini
            </button>
            <button type="button" className="report-preset" onClick={() => handlePreset("week")}>
              7 hari terakhir
            </button>
            <button type="button" className="report-preset" onClick={() => handlePreset("month")}>
              Bulan ini
            </button>
          </div>
        </section>

        {/* 2. Kartu KPI */}
        {report ? (
          <section className="report-kpis" aria-label="Ringkasan laporan">
            {kpis.map((kpi) => (
              <div className="report-kpi-card" key={kpi.label}>
                <span className="report-kpi-label">{kpi.label}</span>
                <strong className="report-kpi-value">{kpi.value}</strong>
              </div>
            ))}
          </section>
        ) : null}

        {/* 3. Sesi kas */}
        {report && report.sessions.length > 0 ? (
          <section className="panel">
            <div className="panel-heading">
              <h2>Sesi kas</h2>
              <span className="section-kicker">
                {report.sessions.length} sesi ·{" "}
                {report.cashTotals.openCount > 0
                  ? `${report.cashTotals.openCount} masih berjalan`
                  : "semua ditutup"}
              </span>
            </div>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Dibuka</th>
                    <th>Petugas</th>
                    <th>Status</th>
                    <th>Kas sistem</th>
                    <th>Setoran</th>
                    <th>Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sessions.map((session) => (
                    <tr key={session.id}>
                      <td>{formatDate(session.openedAt.slice(0, 10))}</td>
                      <td>{session.openedByName ?? session.openedBy}</td>
                      <td>
                        <span className={`report-status report-status-${session.status}`}>
                          {formatSession(session)}
                        </span>
                      </td>
                      <td>
                        {session.systemCash === null
                          ? "—"
                          : currency.format(session.systemCash)}
                      </td>
                      <td>
                        {session.declaredCash === null
                          ? "—"
                          : currency.format(session.declaredCash)}
                      </td>
                      <td>
                        {session.difference === null
                          ? "—"
                          : currency.format(session.difference)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.cashTotals.openCount === 0 ? (
              <div className="report-cash-totals">
                Total setoran{" "}
                <strong>{currency.format(report.cashTotals.declaredCash)}</strong>{" "}
                vs kas sistem{" "}
                <strong>{currency.format(report.cashTotals.systemCash)}</strong>{" "}
                · selisih{" "}
                <strong>{currency.format(report.cashTotals.difference)}</strong>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* 4. Rincian per hari */}
        {report ? (
          <section className="panel">
            <div className="panel-heading">
              <h2>Rincian per hari</h2>
              <span className="section-kicker">Klik baris untuk melihat detail</span>
            </div>
            {report.daily.length === 0 ? (
              <p className="finance-empty">Belum ada data pada rentang ini.</p>
            ) : (
              <div className="report-table-wrap">
                <table className="report-table report-daily-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Jenis hari</th>
                      <th>Transaksi</th>
                      <th>Pengunjung</th>
                      <th>Tiket</th>
                      <th>Non-tiket</th>
                      <th>Pengeluaran</th>
                      <th>Net kas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.daily.map((day: ReportDailyRow) => (
                      <tr
                        key={day.date}
                        className={
                          selectedDate === day.date ? "report-row-selected" : ""
                        }
                        onClick={() => void handleSelectDay(day.date)}
                      >
                        <td>{formatDate(day.date)}</td>
                        <td>{formatDayType(day.dayType)}</td>
                        <td>{numberFormat.format(day.salesCount)}</td>
                        <td>{numberFormat.format(day.visitors)}</td>
                        <td>{currency.format(day.ticketRevenue)}</td>
                        <td>{currency.format(day.otherRevenue)}</td>
                        <td>{currency.format(day.approvedExpenses)}</td>
                        <td>
                          <strong>{currency.format(day.netCash)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. Detail hari terpilih */}
            {selectedDate ? (
              <div className="report-day-detail">
                <div className="panel-heading">
                  <h3>Detail {formatDate(selectedDate)}</h3>
                  {detailLoading ? <p className="finance-empty">Memuat…</p> : null}
                  {detailError ? (
                    <p className="sale-form-error" role="alert">
                      {detailError}
                    </p>
                  ) : null}
                </div>

                {dayDetail ? (
                  <div className="report-detail-grid">
                    {canViewVisitors ? (
                      <div className="report-detail-col">
                        <div className="report-detail-head">
                          <h4>Penjualan tiket</h4>
                          <label className="report-status-filter">
                            <select
                              value={saleStatusFilter}
                              onChange={(e) =>
                                setSaleStatusFilter(
                                  e.target.value as
                                    | "all"
                                    | "completed"
                                    | "void_pending"
                                    | "voided",
                                )
                              }
                            >
                              <option value="all">Semua status</option>
                              <option value="completed">Selesai</option>
                              <option value="void_pending">Menunggu void</option>
                              <option value="voided">Dibatalkan</option>
                            </select>
                          </label>
                        </div>
                        {dayDetail.sales.filter(
                          (sale) =>
                            saleStatusFilter === "all" ||
                            sale.status === saleStatusFilter,
                        ).length === 0 ? (
                          <p className="finance-empty">Tidak ada transaksi.</p>
                        ) : (
                          <ul className="report-detail-list">
                            {dayDetail.sales
                              .filter(
                                (sale) =>
                                  saleStatusFilter === "all" ||
                                  sale.status === saleStatusFilter,
                              )
                              .map((sale) => (
                                <li key={sale.id}>
                                  <span>
                                    {sale.receiptNumber} ·{" "}
                                    {sale.items.reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )}{" "}
                                    tiket
                                    {sale.status === "voided" ? (
                                      <em className="report-expense-status">
                                        {" "}
                                        dibatalkan
                                      </em>
                                    ) : null}
                                  </span>
                                  <strong>
                                    {currency.format(sale.totalAmount)}
                                  </strong>
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                    {canViewFinance ? (
                      <>
                        <div className="report-detail-col">
                          <h4>Pemasukan non-tiket</h4>
                          {dayDetail.revenue.length === 0 ? (
                            <p className="finance-empty">Tidak ada pemasukan.</p>
                          ) : (
                            <ul className="report-detail-list">
                              {dayDetail.revenue.map((entry) => (
                                <li key={entry.id}>
                                  <span>{entry.sourceName}</span>
                                  <strong>{currency.format(entry.amount)}</strong>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="report-detail-col">
                          <h4>Pengeluaran</h4>
                          {dayDetail.expenses.length === 0 ? (
                            <p className="finance-empty">Tidak ada pengeluaran.</p>
                          ) : (
                            <ul className="report-detail-list">
                              {dayDetail.expenses.map((expense) => (
                                <li key={expense.id}>
                                  <span>
                                    {expense.description}{" "}
                                    <em className="report-expense-status">
                                      {expense.status}
                                    </em>
                                  </span>
                                  <strong>
                                    {currency.format(expense.amount)}
                                  </strong>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {loading ? <p className="finance-empty">Memuat…</p> : null}
      </section>
    </main>
  );
}
