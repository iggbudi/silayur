"use client";

import { useMemo, useState } from "react";
import { canManage, canView } from "./lib/access";
import { putRemoteConfig } from "./lib/config-api";
import { useSession } from "./hooks/use-session";
import { useMobileSidebar } from "./hooks/use-mobile-sidebar";
import { Brand } from "./components/brand";
import { SidebarNavigation } from "./components/sidebar-navigation";
import { SessionGate } from "./components/session-gate";
import { MetricCard } from "./components/dashboard-widgets";
import { Toggle } from "./components/toggle";
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

const facilityRows = [
  { name: "Kolam Renang", status: "Baik", tone: "good" },
  { name: "Playground", status: "Baik", tone: "good" },
  { name: "Area Parkir", status: "Perlu perhatian", tone: "warn" },
  { name: "Toilet Utama", status: "Baik", tone: "good" },
];

const complaintRows = [
  { time: "10.15", title: "Kebersihan toilet wanita", status: "Diproses" },
  { time: "11.20", title: "Antrean kolam cukup lama", status: "Ditugaskan" },
  { time: "13.05", title: "Pilihan makanan kurang", status: "Baru" },
];

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

  const currentUser = session?.user ?? null;
  const access = session?.access ?? NO_ACCESS;
  const modules =
    moduleOverride ?? session?.modules ?? DEFAULT_MODULE_CONFIG;

  const canViewDashboard = canView(access.dashboard);
  const canManageSettings = canManage(access.settings);
  const roleLabel = session?.role?.label ?? currentUser?.role ?? "—";

  const activeCount = Object.values(modules).filter(Boolean).length;

  const metrics = useMemo(() => {
    if (!canViewDashboard) return [];

    const items = [];
    const showVisitors = modules.visitors && canView(access.visitors);
    const showFinance = modules.finance && canView(access.finance);
    const showOperations = modules.operations && canView(access.operations);
    const showFacilities = modules.facilities && canView(access.facilities);
    const showComplaints = modules.complaints && canView(access.complaints);

    if (showVisitors) {
      items.push(
        <MetricCard
          key="visitors"
          eyebrow="Pengunjung hari ini"
          value="245"
          suffix="orang"
          note="↑ 23,7% dari kemarin"
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
          value="Rp7,85 jt"
          note="↑ 26% dari kemarin"
          icon="Rp"
          tone="blue"
        />,
      );
    } else if (showFacilities) {
      items.push(
        <MetricCard
          key="facility-fallback"
          eyebrow="Fasilitas aktif"
          value="8"
          suffix="dari 9"
          note="Satu perlu pemeriksaan"
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
          value="Buka"
          note="Checklist 8 dari 10 selesai"
          icon="✓"
          tone="orange"
          badge="80%"
        />,
      );
    }

    if (showFacilities) {
      items.push(
        <MetricCard
          key="attention"
          eyebrow="Perlu perhatian"
          value="3"
          suffix="item"
          note="1 prioritas tinggi"
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
          value="2"
          suffix="kasus"
          note="1 baru, 1 sedang diproses"
          icon="…"
          tone="red"
        />,
      );
    } else if (showOperations) {
      items.push(
        <MetricCard
          key="issue-fallback"
          eyebrow="Kendala terbuka"
          value="2"
          suffix="tugas"
          note="Menunggu tindak lanjut"
          icon="!"
          tone="red"
        />,
      );
    }

    return items;
  }, [access, canViewDashboard, modules]);

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
          <span className="sidebar-card-icon">☀</span>
          <strong>31°C</strong>
          <p>Cerah berawan</p>
          <small>Ngaliyan, Semarang</small>
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
                  Data simulasi
                </span>
              </div>
              <p>Ringkasan kondisi Silayur Park hari ini</p>
            </div>
          </div>

          <div className="top-actions">
            <button className="date-button" type="button">
              <span aria-hidden="true">□</span>
              Kamis, 23 Juli 2026
            </button>
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
            <button className="notification-button" type="button" aria-label="Notifikasi">
              ♢
              <span>3</span>
            </button>
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
          <section className="module-panel" aria-label="Simulasi aktivasi modul">
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
            {(modules.operations && canView(access.operations)) ||
            (modules.facilities && canView(access.facilities)) ? (
              <article className="panel status-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">Kondisi hari ini</span>
                    <h2>Status operasional</h2>
                  </div>
                  <button type="button">Lihat detail</button>
                </div>

                <div className="status-content">
                  <div className="donut-wrap">
                    <div className="donut donut-status">
                      <div>
                        <strong>8</strong>
                        <span>terpantau</span>
                      </div>
                    </div>
                    <div className="legend">
                      <span>
                        <i className="legend-green" /> Beroperasi <strong>7</strong>
                      </span>
                      <span>
                        <i className="legend-orange" /> Perlu cek <strong>1</strong>
                      </span>
                      <span>
                        <i className="legend-red" /> Ditutup <strong>0</strong>
                      </span>
                    </div>
                  </div>

                  <div className="checklist-progress">
                    <div className="progress-heading">
                      <div>
                        <span>Checklist pembukaan</span>
                        <strong>8 dari 10 selesai</strong>
                      </div>
                      <b>80%</b>
                    </div>
                    <div className="progress-track">
                      <span />
                    </div>
                    <div className="pending-items">
                      <p>
                        <i>!</i>
                        Lampu area parkir belum diperiksa
                      </p>
                      <p>
                        <i>!</i>
                        Foto kebersihan food court belum ada
                      </p>
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
                  <button type="button">Hari ini⌄</button>
                </div>

                <div className="revenue-content">
                  <div className="donut donut-revenue">
                    <div>
                      <strong>7,85</strong>
                      <span>juta</span>
                    </div>
                  </div>
                  <div className="revenue-list">
                    <div>
                      <span>
                        <i className="revenue-green" /> Tiket & kunjungan
                      </span>
                      <strong>Rp5,60 jt</strong>
                    </div>
                    <div>
                      <span>
                        <i className="revenue-blue" /> Parkir
                      </span>
                      <strong>Rp1,20 jt</strong>
                    </div>
                    <div>
                      <span>
                        <i className="revenue-purple" /> Tenant
                      </span>
                      <strong>Rp850 rb</strong>
                    </div>
                    <div>
                      <span>
                        <i className="revenue-orange" /> Lainnya
                      </span>
                      <strong>Rp200 rb</strong>
                    </div>
                  </div>
                </div>
              </article>
            ) : null}

            {modules.facilities && canView(access.facilities) ? (
              <article className="panel facility-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">Pemantauan</span>
                    <h2>Kesiapan fasilitas</h2>
                  </div>
                  <span className="updated-label">Diperbarui 10 menit lalu</span>
                </div>

                <div className="facility-list">
                  {facilityRows.map((facility) => (
                    <div key={facility.name}>
                      <span className="facility-symbol" aria-hidden="true">
                        ◇
                      </span>
                      <strong>{facility.name}</strong>
                      <span className={`status-pill status-${facility.tone}`}>
                        {facility.status}
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
                  <button type="button">Semua komplain</button>
                </div>

                <div className="complaint-list">
                  {complaintRows.map((complaint) => (
                    <div key={`${complaint.time}-${complaint.title}`}>
                      <time>{complaint.time}</time>
                      <span>{complaint.title}</span>
                      <strong>{complaint.status}</strong>
                    </div>
                  ))}
                </div>
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
