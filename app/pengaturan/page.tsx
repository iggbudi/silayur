"use client";

import { FormEvent, useMemo, useState } from "react";

type SectionKey =
  | "modules"
  | "tickets"
  | "hours"
  | "facilities"
  | "revenue"
  | "users";

type ConfigItem = {
  id: number;
  name: string;
  detail: string;
  active: boolean;
  badge?: string;
};

const sections: Array<{
  key: SectionKey;
  label: string;
  eyebrow: string;
  description: string;
  icon: string;
  addLabel: string;
}> = [
  {
    key: "modules",
    label: "Modul sistem",
    eyebrow: "Fitur aplikasi",
    description: "Pilih fungsi yang ingin digunakan dalam operasional.",
    icon: "▦",
    addLabel: "",
  },
  {
    key: "tickets",
    label: "Tiket & tarif",
    eyebrow: "Kunjungan",
    description: "Atur jenis tiket, paket, dan tarif yang berlaku.",
    icon: "◇",
    addLabel: "Tambah tiket",
  },
  {
    key: "hours",
    label: "Jam operasional",
    eyebrow: "Kalender",
    description: "Buat jadwal normal, akhir pekan, atau hari khusus.",
    icon: "◷",
    addLabel: "Tambah jadwal",
  },
  {
    key: "facilities",
    label: "Fasilitas & wahana",
    eyebrow: "Area taman",
    description: "Daftarkan fasilitas satu per satu dan atur statusnya.",
    icon: "⌂",
    addLabel: "Tambah fasilitas",
  },
  {
    key: "revenue",
    label: "Sumber pendapatan",
    eyebrow: "Unit usaha",
    description: "Aktifkan hanya sumber pemasukan yang digunakan.",
    icon: "Rp",
    addLabel: "Tambah sumber",
  },
  {
    key: "users",
    label: "Pengguna & role",
    eyebrow: "Akses sistem",
    description: "Kelola pengguna dan perannya secara bertahap.",
    icon: "◎",
    addLabel: "Tambah pengguna",
  },
];

const initialItems: Record<SectionKey, ConfigItem[]> = {
  modules: [
    { id: 1, name: "Dashboard", detail: "Ringkasan informasi utama", active: true, badge: "Wajib" },
    { id: 2, name: "Pengunjung", detail: "Kunjungan dan ticketing", active: true },
    { id: 3, name: "Keuangan", detail: "Pendapatan dan kas harian", active: true },
    { id: 4, name: "Operasional", detail: "Checklist buka dan tutup", active: true },
    { id: 5, name: "Fasilitas", detail: "Wahana, inspeksi, dan kebersihan", active: true },
    { id: 6, name: "Komplain", detail: "Keluhan dan tindak lanjut", active: true },
  ],
  tickets: [
    { id: 11, name: "Tiket masuk umum", detail: "Rp15.000 • Data contoh", active: true },
    { id: 12, name: "Tiket akhir pekan", detail: "Rp20.000 • Data contoh", active: false },
  ],
  hours: [
    { id: 21, name: "Jadwal reguler", detail: "Senin–Minggu • 08.00–16.00", active: true },
    { id: 22, name: "Hari libur khusus", detail: "Belum dikonfigurasi", active: false },
  ],
  facilities: [
    { id: 31, name: "Kolam Renang", detail: "Area rekreasi air", active: true },
    { id: 32, name: "Playground", detail: "Area bermain anak", active: true },
    { id: 33, name: "Area Parkir", detail: "Fasilitas kendaraan", active: true },
    { id: 34, name: "Camping Ground", detail: "Kandidat dari riset internet", active: false },
  ],
  revenue: [
    { id: 41, name: "Tiket & kunjungan", detail: "Pemasukan loket", active: true },
    { id: 42, name: "Parkir", detail: "Motor dan mobil", active: true },
    { id: 43, name: "Tenant", detail: "Setoran atau bagi hasil", active: false },
    { id: 44, name: "Outbound", detail: "Paket kegiatan kelompok", active: false },
  ],
  users: [
    { id: 51, name: "Admin Resepsionis", detail: "Administrator • Aktif", active: true },
    { id: 52, name: "Manajer Operasional", detail: "Manajer • Belum diundang", active: false },
  ],
};

function LocalToggle({
  active,
  label,
  disabled,
  onChange,
}: {
  active: boolean;
  label: string;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      className={`switch ${active ? "switch-on" : ""}`}
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`${active ? "Nonaktifkan" : "Aktifkan"} ${label}`}
      disabled={disabled}
      onClick={onChange}
    >
      <span />
    </button>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>("modules");
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDetail, setNewDetail] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  const section = sections.find((item) => item.key === activeSection)!;
  const currentItems = items[activeSection];
  const activeTotal = currentItems.filter((item) => item.active).length;

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return currentItems;
    return currentItems.filter(
      (item) =>
        item.name.toLowerCase().includes(normalized) ||
        item.detail.toLowerCase().includes(normalized),
    );
  }, [currentItems, query]);

  function chooseSection(key: SectionKey) {
    setActiveSection(key);
    setQuery("");
    setAdding(false);
    setSavedNotice(false);
  }

  function toggleItem(id: number) {
    setItems((current) => ({
      ...current,
      [activeSection]: current[activeSection].map((item) =>
        item.id === id ? { ...item, active: !item.active } : item,
      ),
    }));
    setSavedNotice(true);
  }

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim()) return;

    const nextItem: ConfigItem = {
      id: Date.now(),
      name: newName.trim(),
      detail: newDetail.trim() || "Belum ada keterangan",
      active: true,
    };

    setItems((current) => ({
      ...current,
      [activeSection]: [...current[activeSection], nextItem],
    }));
    setNewName("");
    setNewDetail("");
    setAdding(false);
    setSavedNotice(true);
  }

  return (
    <main className="app-shell settings-shell">
      <aside className="sidebar settings-sidebar">
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
          <a className="nav-link" href="/">
            <span className="nav-icon" aria-hidden="true">
              ⌂
            </span>
            <span>Dashboard</span>
          </a>
          <a className="nav-link nav-active" href="/pengaturan">
            <span className="nav-icon" aria-hidden="true">
              ⚙
            </span>
            <span>Pengaturan</span>
          </a>
        </nav>

        <div className="settings-side-note">
          <span>Mode prototype</span>
          <strong>Perubahan bersifat sementara</strong>
          <p>Data kembali ke kondisi awal setelah halaman dimuat ulang.</p>
        </div>

        <div className="sidebar-footer">
          <div className="avatar">AR</div>
          <div>
            <strong>Admin Resepsionis</strong>
            <span>manage_configuration</span>
          </div>
        </div>
      </aside>

      <section className="workspace settings-workspace">
        <header className="settings-header">
          <div>
            <a href="/" className="back-link">
              ← Kembali ke dashboard
            </a>
            <div className="settings-title-line">
              <div>
                <h1>Pengaturan Operasional</h1>
                <p>Mulai sederhana, aktifkan bagian lain saat dibutuhkan.</p>
              </div>
              <span className="local-pill">
                <i />
                Mode lokal
              </span>
            </div>
          </div>
        </header>

        <section className="setup-overview">
          <div className="setup-copy">
            <span className="section-kicker">Checkpoint 2</span>
            <h2>Susun sistem sesuai cara kerja Silayur Park</h2>
            <p>
              Tidak semua bagian harus diisi sekarang. Operator dapat mengaktifkan
              atau menambahkan konfigurasi satu per satu tanpa mengubah kode.
            </p>
          </div>
          <div className="setup-score">
            <div className="setup-score-ring">
              <strong>6</strong>
              <span>bagian</span>
            </div>
            <p>
              <strong>Siap diverifikasi</strong>
              <span>Belum tersimpan ke database</span>
            </p>
          </div>
        </section>

        <section className="settings-layout">
          <nav className="settings-section-nav" aria-label="Bagian pengaturan">
            <div className="settings-nav-heading">
              <span>Konfigurasi</span>
              <small>6 bagian</small>
            </div>
            {sections.map((item) => (
              <button
                className={activeSection === item.key ? "section-nav-active" : ""}
                type="button"
                key={item.key}
                onClick={() => chooseSection(item.key)}
              >
                <span className="section-nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.eyebrow}</small>
                </span>
                <b>›</b>
              </button>
            ))}
          </nav>

          <section className="settings-content">
            <div className="settings-content-header">
              <div>
                <span className="section-kicker">{section.eyebrow}</span>
                <h2>{section.label}</h2>
                <p>{section.description}</p>
              </div>
              <div className="settings-content-actions">
                <span>
                  <strong>{activeTotal}</strong> aktif
                </span>
                {section.addLabel ? (
                  <button
                    className="primary-action"
                    type="button"
                    onClick={() => {
                      setAdding((value) => !value);
                      setSavedNotice(false);
                    }}
                  >
                    ＋ {section.addLabel}
                  </button>
                ) : null}
              </div>
            </div>

            {adding ? (
              <form className="quick-add-form" onSubmit={addItem}>
                <div>
                  <label htmlFor="config-name">Nama</label>
                  <input
                    id="config-name"
                    value={newName}
                    placeholder={`Nama ${section.label.toLowerCase()}`}
                    autoFocus
                    onChange={(event) => setNewName(event.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="config-detail">Keterangan</label>
                  <input
                    id="config-detail"
                    value={newDetail}
                    placeholder="Keterangan singkat"
                    onChange={(event) => setNewDetail(event.target.value)}
                  />
                </div>
                <button type="submit">Tambahkan</button>
                <button
                  className="cancel-action"
                  type="button"
                  onClick={() => setAdding(false)}
                >
                  Batal
                </button>
              </form>
            ) : null}

            <div className="settings-toolbar">
              <label>
                <span aria-hidden="true">⌕</span>
                <input
                  value={query}
                  placeholder={`Cari ${section.label.toLowerCase()}...`}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <span className={savedNotice ? "saved-notice saved-notice-show" : "saved-notice"}>
                ✓ Perubahan lokal diterapkan
              </span>
            </div>

            <div className="config-list">
              {filteredItems.map((item) => {
                const locked = activeSection === "modules" && item.name === "Dashboard";
                return (
                  <article className="config-row" key={item.id}>
                    <span className="config-row-icon" aria-hidden="true">
                      {section.icon}
                    </span>
                    <div className="config-row-copy">
                      <div>
                        <strong>{item.name}</strong>
                        {item.badge ? <span className="locked-badge">{item.badge}</span> : null}
                      </div>
                      <p>{item.detail}</p>
                    </div>
                    <span className={`config-status ${item.active ? "config-active" : ""}`}>
                      {item.active ? "Aktif" : "Nonaktif"}
                    </span>
                    <LocalToggle
                      active={item.active}
                      label={item.name}
                      disabled={locked}
                      onChange={() => toggleItem(item.id)}
                    />
                  </article>
                );
              })}

              {filteredItems.length === 0 ? (
                <div className="config-empty">
                  <span>⌕</span>
                  <strong>Tidak ada hasil</strong>
                  <p>Coba kata kunci lain atau tambahkan data baru.</p>
                </div>
              ) : null}
            </div>

            <div className="settings-help">
              <span>i</span>
              <p>
                <strong>Belum ada penyimpanan.</strong> Tambah dan aktivasi pada
                halaman ini hanya untuk memvalidasi alur operator.
              </p>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
