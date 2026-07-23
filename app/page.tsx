"use client";

import { useMemo, useState } from "react";

type ModuleKey =
  | "visitors"
  | "finance"
  | "operations"
  | "facilities"
  | "complaints";

type ModuleState = Record<ModuleKey, boolean>;

const initialModules: ModuleState = {
  visitors: true,
  finance: true,
  operations: true,
  facilities: true,
  complaints: true,
};

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

const navigation = [
  { label: "Dashboard", icon: "⌂", key: null },
  { label: "Operasional", icon: "✓", key: "operations" as ModuleKey },
  { label: "Pengunjung", icon: "◎", key: "visitors" as ModuleKey },
  { label: "Keuangan", icon: "Rp", key: "finance" as ModuleKey },
  { label: "Komplain", icon: "!", key: "complaints" as ModuleKey },
  { label: "Laporan", icon: "↗", key: null },
];

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

function MetricCard({
  eyebrow,
  value,
  suffix,
  note,
  icon,
  tone,
  badge,
}: {
  eyebrow: string;
  value: string;
  suffix?: string;
  note: string;
  icon: string;
  tone: string;
  badge?: string;
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-heading">
        <span className="metric-icon" aria-hidden="true">
          {icon}
        </span>
        {badge ? <span className="metric-badge">{badge}</span> : null}
      </div>
      <p>{eyebrow}</p>
      <div className="metric-value">
        <strong>{value}</strong>
        {suffix ? <span>{suffix}</span> : null}
      </div>
      <small>{note}</small>
    </article>
  );
}

function Toggle({
  active,
  label,
  onChange,
}: {
  active: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      className={`switch ${active ? "switch-on" : ""}`}
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`${active ? "Nonaktifkan" : "Aktifkan"} modul ${label}`}
      onClick={onChange}
    >
      <span />
    </button>
  );
}

export default function DashboardPage() {
  const [modules, setModules] = useState<ModuleState>(initialModules);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeCount = Object.values(modules).filter(Boolean).length;

  const metrics = useMemo(() => {
    const items = [];

    if (modules.visitors) {
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

    if (modules.finance) {
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
    } else if (modules.facilities) {
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

    if (modules.operations) {
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

    if (modules.facilities) {
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

    if (modules.complaints) {
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
    } else if (modules.operations) {
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
  }, [modules]);

  function toggleModule(key: ModuleKey) {
    setModules((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span className="sun-dot" />
            <span className="hill hill-one" />
            <span className="hill hill-two" />
          </div>
          <div>
            <strong>SILAYUR</strong>
            <span>Park Management</span>
          </div>
        </div>

        <nav aria-label="Navigasi utama">
          {navigation.map((item, index) => {
            const enabled = item.key === null || modules[item.key];
            return (
              <button
                className={`${index === 0 ? "nav-active" : ""} ${
                  !enabled ? "nav-disabled" : ""
                }`}
                type="button"
                key={item.label}
                disabled={!enabled}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {!enabled ? <small>nonaktif</small> : null}
              </button>
            );
          })}
          <a className="nav-link" href="/pengaturan">
            <span className="nav-icon" aria-hidden="true">
              ⚙
            </span>
            <span>Pengaturan</span>
          </a>
        </nav>

        <div className="sidebar-card">
          <span className="sidebar-card-icon">☀</span>
          <strong>31°C</strong>
          <p>Cerah berawan</p>
          <small>Ngaliyan, Semarang</small>
        </div>

        <div className="sidebar-footer">
          <div className="avatar">AR</div>
          <div>
            <strong>Admin Resepsionis</strong>
            <span>Operator</span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="title-group">
            <button
              className="menu-button"
              type="button"
              aria-label="Buka menu"
              onClick={() => setMobileMenuOpen((value) => !value)}
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
            <button
              className={`settings-button ${settingsOpen ? "settings-active" : ""}`}
              type="button"
              onClick={() => setSettingsOpen((value) => !value)}
            >
              <span aria-hidden="true">⚙</span>
              Atur modul
            </button>
            <button className="notification-button" type="button" aria-label="Notifikasi">
              ♢
              <span>3</span>
            </button>
          </div>
        </header>

        {settingsOpen ? (
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
              <span>Prototype ini belum menyimpan perubahan.</span>
              <button type="button" onClick={() => setModules(initialModules)}>
                Aktifkan semua
              </button>
            </div>
          </section>
        ) : null}

        <section className="metric-grid" aria-label="Ringkasan utama">
          {metrics}
          {metrics.length === 0 ? (
            <div className="empty-dashboard">
              <span>＋</span>
              <strong>Belum ada modul yang aktif</strong>
              <p>Gunakan tombol “Atur modul” untuk menyusun dashboard.</p>
              <button type="button" onClick={() => setSettingsOpen(true)}>
                Buka konfigurasi
              </button>
            </div>
          ) : null}
        </section>

        <section className="content-grid">
          {modules.operations || modules.facilities ? (
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

          {modules.finance ? (
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

          {modules.facilities ? (
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

          {modules.complaints ? (
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

        <footer className="prototype-note">
          <span>i</span>
          <p>
            <strong>Prototype Checkpoint 1.</strong> Seluruh angka adalah data
            simulasi untuk memvalidasi struktur dan tampilan dashboard.
          </p>
        </footer>
      </section>

      {mobileMenuOpen ? (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Tutup menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}
    </main>
  );
}
