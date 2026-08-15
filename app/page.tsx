"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { canManage, canView } from "./lib/access";
import { putRemoteConfig } from "./lib/config-api";
import { useSession } from "./hooks/use-session";
import { useMobileSidebar } from "./hooks/use-mobile-sidebar";
import { Brand } from "./components/brand";
import { SidebarNavigation } from "./components/sidebar-navigation";
import { SessionGate } from "./components/session-gate";
import { MetricCard } from "./components/dashboard-widgets";
import { Toggle } from "./components/toggle";
import { fetchRemoteConfig } from "./lib/config-api";
import { listTodaySales, type Sale } from "./features/ticket-sales";
import { financeSummary, listRevenue } from "./features/finance";
import type { RevenueEntry } from "./features/finance";
import { recentComplaints, type Complaint } from "./features/complaints";
import { facilitySummary, type FacilityStatusSummary } from "./features/facilities";
import { operationsStatus, type OperationsStatus } from "./features/operations";
import type { ConfigItem } from "../shared/config";
import { todayIsoDate } from "../shared/date";
import {
  DEFAULT_MODULE_CONFIG,
  type ModuleKey,
  type ModuleState,
} from "./lib/module-config";

const moduleOptions: Array<{
  key: ModuleKey;
  title: string;
  description: string;
}> = [
  { key: "visitors", title: "Pengunjung", description: "Kunjungan dan tiket" },
  { key: "finance", title: "Keuangan", description: "Pendapatan dan kas" },
  { key: "operations", title: "Operasional", description: "Checklist harian" },
  { key: "facilities", title: "Fasilitas", description: "Wahana dan kebersihan" },
  { key: "complaints", title: "Komplain", description: "Keluhan dan tindak lanjut" },
];

const NO_ACCESS = {
  dashboard: "none",
  operations: "none",
  visitors: "none",
  finance: "none",
  facilities: "none",
  complaints: "none",
  reports: "none",
  settings: "none",
} as const;

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("id-ID");

/** Warna donut per bucket komposisi pendapatan (cycle bila lebih banyak). */
const REVENUE_COLORS = ["green", "blue", "purple", "orange", "red"] as const;
const REVENUE_CSS: Record<string, string> = {
  green: "var(--green)",
  blue: "var(--blue)",
  purple: "var(--purple)",
  orange: "var(--orange)",
  red: "var(--red)",
};

type RevenueBucket = { label: string; amount: number };

/**
 * Susun breakdown pendapatan hari ini per sumber:
 * - Tiket: group subtotal per nama produk dari line items penjualan.
 * - Non-tiket: group amount per nama sumber dari pemasukan.
 * Urutan: sumber aktif dari konfigurasi (sortOrder), lalu sumber lain yang
 * muncul di transaksi, lalu tiket. Bucket bernilai nol dibuang.
 */
function buildRevenueBreakdown(
  sales: Sale[],
  revenues: RevenueEntry[],
  revenueConfig: ConfigItem[],
): RevenueBucket[] {
  const ticketMap = new Map<string, number>();
  for (const sale of sales) {
    for (const item of sale.items) {
      ticketMap.set(
        item.productName,
        (ticketMap.get(item.productName) ?? 0) + item.subtotal,
      );
    }
  }

  const revenueMap = new Map<string, number>();
  for (const entry of revenues) {
    revenueMap.set(
      entry.sourceName,
      (revenueMap.get(entry.sourceName) ?? 0) + entry.amount,
    );
  }

  const ordered: RevenueBucket[] = [];
  const seen = new Set<string>();
  for (const item of revenueConfig) {
    if (!item.active) continue;
    seen.add(item.name);
    ordered.push({ label: item.name, amount: revenueMap.get(item.name) ?? 0 });
  }
  for (const [label, amount] of revenueMap) {
    if (seen.has(label)) continue;
    seen.add(label);
    ordered.push({ label, amount });
  }
  for (const [label, amount] of ticketMap) {
    ordered.push({ label, amount });
  }

  return ordered.filter((bucket) => bucket.amount > 0);
}

/** Tanggal hari ini dalam format WIB ("Jumat, 14 Agustus 2026"). */
function formatTodayWib(): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

/** `background: conic-gradient(...)` untuk donut komposisi pendapatan. */
function revenueDonutStyle(buckets: RevenueBucket[]): string {
  const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);
  if (total <= 0) return "var(--line)";
  let cursor = 0;
  const segments = buckets.map((bucket, index) => {
    const start = cursor;
    cursor += (bucket.amount / total) * 100;
    const color =
      REVENUE_CSS[REVENUE_COLORS[index % REVENUE_COLORS.length]];
    return `${color} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${segments.join(", ")})`;
}

const complaintStatusLabel: Record<Complaint["status"], string> = {
  open: "Baru",
  assigned: "Ditugaskan",
  processing: "Diproses",
  resolved: "Selesai",
  reopened: "Dibuka lagi",
};

const facilityStatusLabel: Record<string, string> = {
  operational: "Beroperasi",
  needs_attention: "Perlu cek",
  closed: "Ditutup",
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function DashboardPage() {
  const { session, ready: authReady, logout } = useSession();
  const [moduleOverride, setModuleOverride] = useState<ModuleState | null>(
    null,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    open: mobileMenuOpen,
    close: closeMobileMenu,
    toggle: toggleMobileMenu,
  } = useMobileSidebar();
  const [saveError, setSaveError] = useState("");
  const [summary, setSummary] = useState<{
    visitors: number;
    revenue: number;
  } | null>(null);
  const [finance, setFinance] = useState<{ totalRevenue: number } | null>(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState<
    RevenueBucket[] | null
  >(null);
  const [recentComplaintList, setRecentComplaintList] = useState<
    Complaint[] | null
  >(null);
  const [openComplaints, setOpenComplaints] = useState<number | null>(null);
  const [facility, setFacility] = useState<FacilityStatusSummary | null>(null);
  const [operations, setOperations] = useState<OperationsStatus | null>(null);

  const currentUser = session?.user ?? null;
  const access = session?.access ?? NO_ACCESS;
  const modules =
    moduleOverride ?? session?.modules ?? DEFAULT_MODULE_CONFIG;

  const canViewDashboard = canView(access.dashboard);
  const canManageSettings = canManage(access.settings);
  const roleLabel = session?.role?.label ?? currentUser?.role ?? "—";

  const activeCount = Object.values(modules).filter(Boolean).length;

  const showVisitors = modules.visitors && canView(access.visitors);
  const showFinance = modules.finance && canView(access.finance);
  const showComplaints = modules.complaints && canView(access.complaints);
  const showFacilities = modules.facilities && canView(access.facilities);
  const showOperations = modules.operations && canView(access.operations);

  useEffect(() => {
    if (!authReady || !session || !showVisitors) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await listTodaySales();
        if (cancelled) return;
        setSummary({ visitors: list.visitors, revenue: list.revenue });
      } catch {
        if (!cancelled) setSummary(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, session, showVisitors]);

  useEffect(() => {
    if (!authReady || !session || !showFinance) return;
    let cancelled = false;
    void (async () => {
      try {
        const date = todayIsoDate();
        const [summary, sales, revenues, config] = await Promise.all([
          financeSummary(),
          listTodaySales(),
          listRevenue(date),
          fetchRemoteConfig(),
        ]);
        if (cancelled) return;
        setFinance({ totalRevenue: summary.totalRevenue });
        setRevenueBreakdown(
          buildRevenueBreakdown(
            sales.sales,
            revenues,
            config.configItems.revenue,
          ),
        );
      } catch {
        if (!cancelled) {
          setFinance(null);
          setRevenueBreakdown(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, session, showFinance]);

  useEffect(() => {
    if (!authReady || !session || !showComplaints) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await recentComplaints();
        if (cancelled) return;
        setRecentComplaintList(result.complaints);
        setOpenComplaints(result.openCount);
      } catch {
        if (!cancelled) {
          setRecentComplaintList(null);
          setOpenComplaints(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, session, showComplaints]);

  useEffect(() => {
    if (!authReady || !session || !showFacilities) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await facilitySummary();
        if (cancelled) return;
        setFacility(data);
      } catch {
        if (!cancelled) setFacility(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, session, showFacilities]);

  useEffect(() => {
    if (!authReady || !session || !showOperations) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await operationsStatus();
        if (cancelled) return;
        setOperations(data);
      } catch {
        if (!cancelled) setOperations(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, session, showOperations]);

  const metrics = useMemo(() => {
    if (!canViewDashboard) return [];

    const items = [];

    if (showVisitors) {
      items.push(
        <MetricCard
          key="visitors"
          eyebrow="Pengunjung hari ini"
          value={summary ? numberFormat.format(summary.visitors) : "—"}
          suffix="orang"
          note="Tiket masuk terjual hari ini"
          icon="◎"
          tone="green"
        />,
      );
    }

    if (showFinance) {
      items.push(
        <MetricCard
          key="finance"
          eyebrow="Pendapatan hari ini"
          value={finance ? currency.format(finance.totalRevenue) : "—"}
          note="Total pendapatan hari ini (tiket + non-tiket)"
          icon="Rp"
          tone="blue"
        />,
      );
    } else if (showFacilities) {
      items.push(
        <MetricCard
          key="facility-fallback"
          eyebrow="Fasilitas aktif"
          value={
            facility ? numberFormat.format(facility.counts.operational) : "—"
          }
          suffix={
            facility
              ? `dari ${numberFormat.format(facility.facilities.length)}`
              : undefined
          }
          note={
            facility
              ? `${numberFormat.format(
                  facility.counts.needsAttention,
                )} perlu cek · ${numberFormat.format(facility.counts.closed)} ditutup`
              : "Modul fasilitas belum tersedia"
          }
          icon="◇"
          tone="blue"
        />,
      );
    }

    if (showOperations) {
      items.push(
        <MetricCard
          key="operations"
          eyebrow="Status operasional"
          value={
            operations
              ? `${numberFormat.format(operations.doneCount)}/${numberFormat.format(
                  operations.totalCount,
                )}`
              : "—"
          }
          note={
            operations
              ? "Checklist operasional selesai"
              : "Belum ada data checklist"
          }
          icon="✓"
          tone="orange"
        />,
      );
    }

    if (showFacilities) {
      items.push(
        <MetricCard
          key="attention"
          eyebrow="Perlu perhatian"
          value={
            facility
              ? numberFormat.format(
                  facility.counts.needsAttention + facility.counts.closed,
                )
              : "—"
          }
          suffix="item"
          note={
            facility
              ? "Fasilitas perlu pemeriksaan"
              : "Belum ada data pemantauan"
          }
          icon="!"
          tone="purple"
        />,
      );
    }

    if (showComplaints) {
      items.push(
        <MetricCard
          key="complaints"
          eyebrow="Komplain terbuka"
          value={
            openComplaints === null
              ? "—"
              : numberFormat.format(openComplaints)
          }
          suffix="kasus"
          note={
            openComplaints === null
              ? "Belum ada data komplain"
              : "Menunggu tindak lanjut"
          }
          icon="…"
          tone="red"
        />,
      );
    } else if (showOperations) {
      items.push(
        <MetricCard
          key="issue-fallback"
          eyebrow="Kendala terbuka"
          value="—"
          note="Menunggu data operasional"
          icon="!"
          tone="red"
        />,
      );
    }

    return items;
  }, [access, canViewDashboard, modules, summary, finance, showVisitors, showFinance, showComplaints, openComplaints, facility, showFacilities, operations, showOperations]);

  async function persistModules(next: ModuleState) {
    setSaveError("");
    const previous = modules;
    setModuleOverride(next);
    try {
      const saved = await putRemoteConfig({ modules: next });
      setModuleOverride(saved.modules);
    } catch (error) {
      setModuleOverride(previous);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan modul ke Turso.",
      );
    }
  }

  function toggleModule(key: ModuleKey) {
    if (!canManageSettings) return;
    const next = { ...modules, [key]: !modules[key] };
    void persistModules(next);
  }

  function activateAllModules() {
    if (!canManageSettings) return;
    void persistModules({ ...DEFAULT_MODULE_CONFIG });
  }

  function handleLogout() {
    void logout();
  }

  if (!authReady || !currentUser) {
    return <SessionGate />;
  }

  return (
    <main className="app-shell">
      <aside
        className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}
        id="dashboard-sidebar"
      >
        <Brand />
        <button
          className="sidebar-close-button"
          type="button"
          aria-label="Tutup menu"
          onClick={closeMobileMenu}
        >
          ×
        </button>

        <SidebarNavigation
          access={access}
          modules={modules}
          active="dashboard"
          onNavigate={closeMobileMenu}
        />

        <div className="sidebar-card">
          <span className="sidebar-card-icon">✓</span>
          <strong>Hari ini</strong>
          <p>Data operasional dari transaksi nyata</p>
          <small>Silayur Park</small>
        </div>

        <div className="sidebar-footer">
          <div className="avatar">{getInitials(currentUser.name)}</div>
          <div>
            <strong>{currentUser.name}</strong>
            <span>{roleLabel}</span>
          </div>
          <div className="sidebar-footer-actions">
            <button className="logout-button" type="button" onClick={handleLogout}>
              Keluar
            </button>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="title-group">
            <button
              className="menu-button"
              type="button"
              aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
              aria-controls="dashboard-sidebar"
              aria-expanded={mobileMenuOpen}
              onClick={toggleMobileMenu}
            >
              ☰
            </button>
            <div>
              <div className="title-line">
                <h1>Dashboard Operasional</h1>
                <span className="live-pill">
                  <i />
                  Data hari ini
                </span>
              </div>
              <p>Ringkasan kondisi Silayur Park hari ini</p>
            </div>
          </div>

          <div className="top-actions">
            <span className="date-button date-button-static">
              <span aria-hidden="true">□</span>
              {formatTodayWib()}
            </span>
            {canManageSettings ? (
              <button
                className={`settings-button ${settingsOpen ? "settings-active" : ""}`}
                type="button"
                onClick={() => setSettingsOpen((value) => !value)}
              >
                <span aria-hidden="true">⚙</span>
                Atur modul
              </button>
            ) : null}
          </div>
        </header>

        {!canViewDashboard ? (
          <section className="session-gate-card" style={{ margin: "8px 0 18px" }}>
            <h1>Akses dashboard ditolak</h1>
            <p>
              Role <strong>{roleLabel}</strong> tidak memiliki izin melihat
              dashboard. Hubungi Super Admin untuk menyesuaikan akses.
            </p>
          </section>
        ) : null}

        {settingsOpen && canManageSettings ? (
          <section className="module-panel" aria-label="Aktivasi modul">
            <div className="module-panel-heading">
              <div>
                <span className="section-kicker">Mode konfigurasi</span>
                <h2>Aktifkan sesuai kebutuhan operasional</h2>
                <p>
                  Menu dan kartu dashboard menyesuaikan otomatis. Data historis
                  tetap aman saat modul dinonaktifkan.
                </p>
              </div>
              <div className="module-count">
                <strong>{activeCount}</strong>
                <span>dari 5 aktif</span>
              </div>
            </div>

            <div className="module-options">
              {moduleOptions.map((module) => (
                <div className="module-option" key={module.key}>
                  <div>
                    <strong>{module.title}</strong>
                    <span>{module.description}</span>
                  </div>
                  <Toggle
                    active={modules[module.key]}
                    label={module.title}
                    onChange={() => toggleModule(module.key)}
                  />
                </div>
              ))}
            </div>

            <div className="module-panel-footer">
              <span>
                Konfigurasi modul tersimpan di Turso.
                {saveError ? ` ${saveError}` : ""}
              </span>
              <button type="button" onClick={activateAllModules}>
                Aktifkan semua
              </button>
            </div>
          </section>
        ) : null}

        {canViewDashboard ? (
          <section className="metric-grid" aria-label="Ringkasan utama">
            {metrics}
            {metrics.length === 0 ? (
              <div className="empty-dashboard">
                <span>＋</span>
                <strong>Belum ada modul yang aktif</strong>
                <p>
                  {canManageSettings
                    ? "Gunakan tombol “Atur modul” untuk menyusun dashboard."
                    : "Tidak ada kartu yang diizinkan untuk role Anda."}
                </p>
                {canManageSettings ? (
                  <button type="button" onClick={() => setSettingsOpen(true)}>
                    Buka konfigurasi
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {canViewDashboard ? (
          <section className="content-grid">
            {showFacilities ? (
              <article className="panel status-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">Kondisi hari ini</span>
                    <h2>Status operasional</h2>
                  </div>
                  <Link className="panel-link" href="/fasilitas">
                    Lihat detail
                  </Link>
                </div>

                <div className="status-content">
                  <div className="donut-wrap">
                    <div className="donut donut-status">
                      <div>
                        <strong>
                          {facility
                            ? facility.facilities.length
                            : "—"}
                        </strong>
                        <span>terpantau</span>
                      </div>
                    </div>
                    <div className="legend">
                      <span>
                        <i className="legend-green" /> Beroperasi{" "}
                        <strong>
                          {facility ? facility.counts.operational : "—"}
                        </strong>
                      </span>
                      <span>
                        <i className="legend-orange" /> Perlu cek{" "}
                        <strong>
                          {facility ? facility.counts.needsAttention : "—"}
                        </strong>
                      </span>
                      <span>
                        <i className="legend-red" /> Ditutup{" "}
                        <strong>
                          {facility ? facility.counts.closed : "—"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ) : null}

            {modules.finance && canView(access.finance) ? (
              <article className="panel revenue-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">Keuangan</span>
                    <h2>Komposisi pendapatan</h2>
                  </div>
                  <span className="updated-label">Hari ini</span>
                </div>

                {revenueBreakdown === null ||
                revenueBreakdown.length === 0 ? (
                  <div className="revenue-content">
                    <p className="finance-empty">
                      Belum ada data pendapatan hari ini.
                    </p>
                  </div>
                ) : (
                  <div className="revenue-content">
                    <div
                      className="donut donut-revenue"
                      style={{ background: revenueDonutStyle(revenueBreakdown) }}
                    >
                      <div>
                        <strong>
                          {currency
                            .format(
                              revenueBreakdown.reduce(
                                (sum, bucket) => sum + bucket.amount,
                                0,
                              ),
                            )
                            .replace(/,00$/, "")}
                        </strong>
                        <span>total hari ini</span>
                      </div>
                    </div>
                    <div className="revenue-list">
                      {revenueBreakdown.map((bucket, index) => (
                        <div key={`${bucket.label}-${index}`}>
                          <span>
                            <i
                              className={`revenue-${
                                REVENUE_COLORS[index % REVENUE_COLORS.length]
                              }`}
                            />
                            {bucket.label}
                          </span>
                          <strong>{currency.format(bucket.amount)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ) : null}

            {showFacilities ? (
              <article className="panel facility-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">Pemantauan</span>
                    <h2>Kesiapan fasilitas</h2>
                  </div>
                  <span className="updated-label">
                    {facility?.updatedAt
                      ? `Diperbarui ${new Date(
                          facility.updatedAt,
                        ).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : "Belum ada catatan"}
                  </span>
                </div>

                {facility && facility.facilities.length === 0 ? (
                  <p className="finance-empty">Belum ada fasilitas terdaftar.</p>
                ) : null}

                <div className="facility-list">
                  {facility?.facilities.map((facilityItem) => (
                    <div key={facilityItem.id}>
                      <span className="facility-symbol" aria-hidden="true">
                        ◇
                      </span>
                      <strong>{facilityItem.name}</strong>
                      <span
                        className={`status-pill status-${facilityItem.status === "needs_attention" ? "warn" : facilityItem.status === "closed" ? "bad" : "good"}`}
                      >
                        {facilityStatusLabel[facilityItem.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            {modules.complaints && canView(access.complaints) ? (
              <article className="panel complaints-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">Layanan pengunjung</span>
                    <h2>Komplain terbaru</h2>
                  </div>
                  <Link className="panel-link" href="/complaints">
                    Semua komplain
                  </Link>
                </div>

                {recentComplaintList === null ||
                recentComplaintList.length === 0 ? (
                  <p className="finance-empty">
                    Belum ada komplain terbaru.
                  </p>
                ) : (
                  <div className="complaint-list">
                    {recentComplaintList.map((complaint) => (
                      <div key={complaint.id}>
                        <time>
                          {new Date(complaint.reportedAt).toLocaleTimeString(
                            "id-ID",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </time>
                        <span>{complaint.title}</span>
                        <strong className={`complaint-status complaint-status-${complaint.status}`}>
                          {complaintStatusLabel[complaint.status]}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ) : null}
          </section>
        ) : null}

        <footer className="prototype-note">
          <span>i</span>
          <p>
            <strong>SILAYUR Checkpoint 9.</strong> Sesi aman sebagai{" "}
            {currentUser.name} ({roleLabel}). Sumber data:{" "}
            Turso dengan akses berbasis role.
          </p>
        </footer>
      </section>

      {mobileMenuOpen ? (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Tutup menu"
          onClick={closeMobileMenu}
        />
      ) : null}
    </main>
  );
}
