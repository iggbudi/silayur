"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_MODULE_CONFIG,
  loadModuleConfig,
  type ModuleKey,
  type ModuleState,
  saveModuleConfig,
} from "../lib/module-config";
import {
  createRolePermissionRow,
  DEFAULT_ROLE_DEFINITIONS,
  DEFAULT_ROLE_PERMISSIONS,
  loadRolePermissions,
  PERMISSION_MODULES,
  saveRolePermissions,
  type AccessLevel,
  type PermissionModuleKey,
  type RoleDefinition,
  type RoleKey,
} from "../lib/role-permissions";
import { loadRoles, saveRoles } from "../lib/role-config";
import {
  DEFAULT_USERS,
  loadUsers,
  saveUsers,
  type LocalUser,
} from "../lib/user-config";

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
  moduleKey?: ModuleKey;
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
    {
      id: 2,
      name: "Pengunjung",
      detail: "Kunjungan dan ticketing",
      active: true,
      moduleKey: "visitors",
    },
    {
      id: 3,
      name: "Keuangan",
      detail: "Pendapatan dan kas harian",
      active: true,
      moduleKey: "finance",
    },
    {
      id: 4,
      name: "Operasional",
      detail: "Checklist buka dan tutup",
      active: true,
      moduleKey: "operations",
    },
    {
      id: 5,
      name: "Fasilitas",
      detail: "Wahana, inspeksi, dan kebersihan",
      active: true,
      moduleKey: "facilities",
    },
    {
      id: 6,
      name: "Komplain",
      detail: "Keluhan dan tindak lanjut",
      active: true,
      moduleKey: "complaints",
    },
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
  users: [],
};

const accessOptions: Array<{ value: AccessLevel; label: string }> = [
  { value: "none", label: "Tidak ada" },
  { value: "view", label: "Lihat" },
  { value: "manage", label: "Kelola" },
];

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

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
  const [moduleConfig, setModuleConfig] = useState<ModuleState>(
    DEFAULT_MODULE_CONFIG,
  );
  const [selectedRole, setSelectedRole] = useState<RoleKey>("manager");
  const [roles, setRoles] = useState<RoleDefinition[]>(
    DEFAULT_ROLE_DEFINITIONS,
  );
  const [rolePermissions, setRolePermissions] = useState(
    DEFAULT_ROLE_PERMISSIONS,
  );
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [editingRoleKey, setEditingRoleKey] = useState<RoleKey | null>(null);
  const [roleLabel, setRoleLabel] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleFormError, setRoleFormError] = useState("");
  const [users, setUsers] = useState<LocalUser[]>(DEFAULT_USERS);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userUsername, setUserUsername] = useState("");
  const [userRole, setUserRole] = useState<RoleKey>("viewer");
  const [userFormError, setUserFormError] = useState("");

  const section = sections.find((item) => item.key === activeSection)!;
  const currentItems = items[activeSection];
  const activeTotal =
    activeSection === "users"
      ? users.filter((user) => user.active).length
      : currentItems.filter((item) => item.active).length;
  const selectedRoleDefinition = roles.find(
    (role) => role.key === selectedRole,
  ) ?? roles[0];

  /* Local storage is intentionally applied after hydration. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const storedConfig = loadModuleConfig();
    const storedRoles = loadRoles();
    setModuleConfig(storedConfig);
    setRoles(storedRoles);
    setRolePermissions(
      loadRolePermissions(storedRoles.map((role) => role.key)),
    );
    setUsers(loadUsers());
    setItems((current) => ({
      ...current,
      modules: current.modules.map((item) =>
        item.moduleKey
          ? { ...item, active: storedConfig[item.moduleKey] }
          : item,
      ),
    }));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return currentItems;
    return currentItems.filter(
      (item) =>
        item.name.toLowerCase().includes(normalized) ||
        item.detail.toLowerCase().includes(normalized),
    );
  }, [currentItems, query]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) => {
      const role = roles.find((item) => item.key === user.role);
      return (
        user.name.toLowerCase().includes(normalized) ||
        user.username.toLowerCase().includes(normalized) ||
        role?.label.toLowerCase().includes(normalized)
      );
    });
  }, [query, roles, users]);

  function resetUserForm() {
    setEditingUserId(null);
    setUserName("");
    setUserUsername("");
    setUserRole(
      roles.find((role) => role.key === "viewer" && role.active)?.key ??
        roles.find((role) => role.active)?.key ??
        "super_admin",
    );
    setUserFormError("");
  }

  function chooseSection(key: SectionKey) {
    setActiveSection(key);
    setQuery("");
    setAdding(false);
    setSavedNotice(false);
    resetUserForm();
  }

  function toggleItem(id: number) {
    const selectedItem = items[activeSection].find((item) => item.id === id);
    if (!selectedItem) return;

    setItems((current) => ({
      ...current,
      [activeSection]: current[activeSection].map((item) =>
        item.id === id ? { ...item, active: !item.active } : item,
      ),
    }));

    if (activeSection === "modules" && selectedItem.moduleKey) {
      const nextConfig = {
        ...moduleConfig,
        [selectedItem.moduleKey]: !selectedItem.active,
      };
      saveModuleConfig(nextConfig);
      setModuleConfig(nextConfig);
    }

    setSavedNotice(true);
  }

  function changeRoleAccess(
    moduleKey: PermissionModuleKey,
    access: AccessLevel,
  ) {
    if (selectedRole === "super_admin") return;

    setRolePermissions((current) => {
      const next = {
        ...current,
        [selectedRole]: {
          ...(current[selectedRole] ?? createRolePermissionRow()),
          [moduleKey]: access,
        },
      };
      saveRolePermissions(next);
      return next;
    });
    setSavedNotice(true);
  }

  function resetRoleForm() {
    setRoleFormOpen(false);
    setEditingRoleKey(null);
    setRoleLabel("");
    setRoleDescription("");
    setRoleFormError("");
  }

  function addRole() {
    setEditingRoleKey(null);
    setRoleLabel("");
    setRoleDescription("");
    setRoleFormError("");
    setRoleFormOpen(true);
    setSavedNotice(false);
  }

  function editRole(role: RoleDefinition) {
    if (role.key === "super_admin") return;
    setEditingRoleKey(role.key);
    setRoleLabel(role.label);
    setRoleDescription(role.description);
    setRoleFormError("");
    setRoleFormOpen(true);
    setSavedNotice(false);
  }

  function submitRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = roleLabel.trim();
    const description = roleDescription.trim();
    if (!label) {
      setRoleFormError("Nama role wajib diisi.");
      return;
    }
    const duplicate = roles.some(
      (role) =>
        role.label.toLowerCase() === label.toLowerCase() &&
        role.key !== editingRoleKey,
    );
    if (duplicate) {
      setRoleFormError("Nama role sudah digunakan.");
      return;
    }

    if (editingRoleKey) {
      const nextRoles = roles.map((role) =>
        role.key === editingRoleKey
          ? {
              ...role,
              label,
              description: description || "Belum ada keterangan.",
            }
          : role,
      );
      setRoles(nextRoles);
      saveRoles(nextRoles);
    } else {
      const newRole: RoleDefinition = {
        key: `role-${Date.now()}`,
        label,
        description: description || "Belum ada keterangan.",
        active: true,
        system: false,
      };
      const nextRoles = [...roles, newRole];
      const nextPermissions = {
        ...rolePermissions,
        [newRole.key]: createRolePermissionRow(),
      };
      setRoles(nextRoles);
      setRolePermissions(nextPermissions);
      setSelectedRole(newRole.key);
      saveRoles(nextRoles);
      saveRolePermissions(nextPermissions);
    }

    resetRoleForm();
    setSavedNotice(true);
  }

  function toggleRole(roleKey: RoleKey) {
    if (roleKey === "super_admin") return;
    const nextRoles = roles.map((role) =>
      role.key === roleKey ? { ...role, active: !role.active } : role,
    );
    setRoles(nextRoles);
    saveRoles(nextRoles);
    setSavedNotice(true);
  }

  function deleteRole(roleKey: RoleKey) {
    const role = roles.find((item) => item.key === roleKey);
    if (!role || role.system) return;
    if (users.some((user) => user.role === roleKey)) {
      setRoleFormError("Role masih dipakai pengguna dan tidak dapat dihapus.");
      return;
    }

    const nextRoles = roles.filter((item) => item.key !== roleKey);
    const nextPermissions = { ...rolePermissions };
    delete nextPermissions[roleKey];
    setRoles(nextRoles);
    setRolePermissions(nextPermissions);
    saveRoles(nextRoles);
    saveRolePermissions(nextPermissions);
    if (selectedRole === roleKey) {
      setSelectedRole(
        nextRoles.find((item) => item.active)?.key ?? "super_admin",
      );
    }
    setRoleFormError("");
    setSavedNotice(true);
  }

  function editUser(user: LocalUser) {
    setEditingUserId(user.id);
    setUserName(user.name);
    setUserUsername(user.username);
    setUserRole(user.role);
    setUserFormError("");
    setAdding(true);
    setSavedNotice(false);
  }

  function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = userName.trim();
    const username = userUsername.trim().toLowerCase();
    if (!name || !username) {
      setUserFormError("Nama dan username wajib diisi.");
      return;
    }
    if (!/^[a-z0-9._@-]+$/.test(username)) {
      setUserFormError(
        "Username hanya boleh memakai huruf kecil, angka, titik, @, _ atau -.",
      );
      return;
    }
    const duplicate = users.some(
      (user) => user.username === username && user.id !== editingUserId,
    );
    if (duplicate) {
      setUserFormError("Username sudah dipakai pengguna lain.");
      return;
    }
    const editedUser = users.find((user) => user.id === editingUserId);
    const activeSuperAdmins = users.filter(
      (user) => user.active && user.role === "super_admin",
    ).length;
    if (
      editedUser?.active &&
      editedUser.role === "super_admin" &&
      userRole !== "super_admin" &&
      activeSuperAdmins === 1
    ) {
      setUserFormError("Minimal satu Super Admin harus tetap aktif.");
      return;
    }

    const nextUsers = editingUserId
      ? users.map((user) =>
          user.id === editingUserId
            ? { ...user, name, username, role: userRole }
            : user,
        )
      : [
          ...users,
          {
            id: `user-${Date.now()}`,
            name,
            username,
            role: userRole,
            active: true,
          },
        ];

    setUsers(nextUsers);
    saveUsers(nextUsers);
    resetUserForm();
    setAdding(false);
    setSavedNotice(true);
  }

  function toggleUser(userId: string) {
    const selectedUser = users.find((user) => user.id === userId);
    if (!selectedUser) return;

    const activeSuperAdmins = users.filter(
      (user) => user.active && user.role === "super_admin",
    ).length;
    if (
      selectedUser.active &&
      selectedUser.role === "super_admin" &&
      activeSuperAdmins === 1
    ) {
      setUserFormError("Minimal satu Super Admin harus tetap aktif.");
      return;
    }

    const nextUsers = users.map((user) =>
      user.id === userId ? { ...user, active: !user.active } : user,
    );
    setUsers(nextUsers);
    saveUsers(nextUsers);
    setUserFormError("");
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
          <Link className="nav-link" href="/">
            <span className="nav-icon" aria-hidden="true">
              ⌂
            </span>
            <span>Dashboard</span>
          </Link>
          <a className="nav-link nav-active" href="/pengaturan">
            <span className="nav-icon" aria-hidden="true">
              ⚙
            </span>
            <span>Pengaturan</span>
          </a>
        </nav>

        <div className="settings-side-note">
          <span>Mode prototype</span>
          <strong>Modul, pengguna, dan role tersimpan</strong>
          <p>Konfigurasi lain masih kembali ke awal setelah halaman dimuat ulang.</p>
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
            <Link href="/" className="back-link">
              ← Kembali ke dashboard
            </Link>
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
            <span className="section-kicker">Checkpoint 5A</span>
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
                      const willOpen = !adding;
                      if (activeSection === "users") resetUserForm();
                      setAdding(willOpen);
                      setSavedNotice(false);
                    }}
                  >
                    ＋ {section.addLabel}
                  </button>
                ) : null}
              </div>
            </div>

            {adding && activeSection === "users" ? (
              <form className="user-form" onSubmit={submitUser}>
                <div className="user-form-heading">
                  <div>
                    <strong>
                      {editingUserId ? "Edit pengguna" : "Tambah pengguna"}
                    </strong>
                    <p>Satu pengguna memiliki satu role utama.</p>
                  </div>
                  <span>Data lokal</span>
                </div>
                <div className="user-form-grid">
                  <label>
                    <span>Nama lengkap</span>
                    <input
                      value={userName}
                      placeholder="Contoh: Siti Rahma"
                      autoFocus
                      onChange={(event) => {
                        setUserName(event.target.value);
                        setUserFormError("");
                      }}
                    />
                  </label>
                  <label>
                    <span>Username</span>
                    <input
                      value={userUsername}
                      placeholder="contoh: siti.rahma"
                      onChange={(event) => {
                        setUserUsername(event.target.value);
                        setUserFormError("");
                      }}
                    />
                  </label>
                  <label>
                    <span>Role</span>
                    <select
                      value={userRole}
                      onChange={(event) =>
                        setUserRole(event.target.value as RoleKey)
                      }
                    >
                      {roles
                        .filter(
                          (role) =>
                            role.active ||
                            (editingUserId !== null && role.key === userRole),
                        )
                        .map((role) => (
                        <option value={role.key} key={role.key}>
                          {role.label}
                        </option>
                        ))}
                    </select>
                  </label>
                </div>
                {userFormError ? (
                  <p className="user-form-error" role="alert">
                    {userFormError}
                  </p>
                ) : null}
                <div className="user-form-actions">
                  <button type="submit">
                    {editingUserId ? "Simpan perubahan" : "Tambahkan pengguna"}
                  </button>
                  <button
                    className="cancel-action"
                    type="button"
                    onClick={() => {
                      resetUserForm();
                      setAdding(false);
                    }}
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : adding ? (
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
                ✓{" "}
                {activeSection === "modules" || activeSection === "users"
                  ? "Tersimpan di perangkat"
                  : "Perubahan lokal diterapkan"}
              </span>
            </div>

            <div
              className={`config-list ${
                activeSection === "users" ? "config-list-hidden" : ""
              }`}
            >
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

            {activeSection === "users" ? (
              <div className="user-list">
                {filteredUsers.map((user) => {
                  const role = roles.find(
                    (item) => item.key === user.role,
                  ) ?? {
                    key: user.role,
                    label: "Role tidak tersedia",
                    description: "",
                    active: false,
                    system: false,
                  };
                  const grantedModules = PERMISSION_MODULES.filter(
                    (module) => {
                      const access =
                        rolePermissions[user.role]?.[module.key];
                      return access === "view" || access === "manage";
                    },
                  );

                  return (
                    <article
                      className={`user-card ${
                        user.active ? "" : "user-card-inactive"
                      }`}
                      key={user.id}
                    >
                      <div className="user-card-main">
                        <span className="user-avatar" aria-hidden="true">
                          {getInitials(user.name)}
                        </span>
                        <div className="user-identity">
                          <div>
                            <strong>{user.name}</strong>
                            <span
                              className={`user-status ${
                                user.active ? "user-status-active" : ""
                              }`}
                            >
                              {user.active ? "Aktif" : "Nonaktif"}
                            </span>
                          </div>
                          <p>@{user.username}</p>
                          <span className="user-role-badge">{role.label}</span>
                        </div>
                        <div className="user-card-actions">
                          <button type="button" onClick={() => editUser(user)}>
                            Edit
                          </button>
                          <LocalToggle
                            active={user.active}
                            label={user.name}
                            onChange={() => toggleUser(user.id)}
                          />
                        </div>
                      </div>

                      <div className="user-access-preview">
                        <span>Akses turunan</span>
                        <div>
                          {grantedModules.map((module) => {
                            const access =
                              rolePermissions[user.role]?.[module.key] ??
                              "none";
                            const globallyInactive =
                              module.globalModuleKey &&
                              !moduleConfig[module.globalModuleKey];
                            return (
                              <span
                                className={`user-access-chip access-${access} ${
                                  globallyInactive ? "access-inactive" : ""
                                }`}
                                title={
                                  globallyInactive
                                    ? "Modul sedang dinonaktifkan secara global"
                                    : undefined
                                }
                                key={module.key}
                              >
                                {module.label}
                                <small>
                                  {globallyInactive
                                    ? "Nonaktif"
                                    : access === "manage"
                                      ? "Kelola"
                                      : "Lihat"}
                                </small>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </article>
                  );
                })}

                {filteredUsers.length === 0 ? (
                  <div className="config-empty">
                    <span>⌕</span>
                    <strong>Tidak ada pengguna</strong>
                    <p>Coba kata kunci lain atau tambahkan pengguna baru.</p>
                  </div>
                ) : null}

                {!adding && userFormError ? (
                  <p className="user-form-error user-list-error" role="alert">
                    {userFormError}
                  </p>
                ) : null}
              </div>
            ) : null}

            {activeSection === "users" ? (
              <section className="role-access-panel" aria-labelledby="role-access-title">
                <div className="role-master-header">
                  <div>
                    <span className="section-kicker">Master data</span>
                    <h3>Master Role</h3>
                    <p>
                      Role aktif dapat dipilih saat menambah atau mengedit
                      pengguna.
                    </p>
                  </div>
                  <button type="button" onClick={addRole}>
                    ＋ Tambah role
                  </button>
                </div>

                {roleFormOpen ? (
                  <form className="role-master-form" onSubmit={submitRole}>
                    <div>
                      <label htmlFor="role-name">Nama role</label>
                      <input
                        id="role-name"
                        value={roleLabel}
                        placeholder="Contoh: Koordinator Loket"
                        autoFocus
                        onChange={(event) => {
                          setRoleLabel(event.target.value);
                          setRoleFormError("");
                        }}
                      />
                    </div>
                    <div>
                      <label htmlFor="role-description">Keterangan</label>
                      <input
                        id="role-description"
                        value={roleDescription}
                        placeholder="Tanggung jawab utama role"
                        onChange={(event) => {
                          setRoleDescription(event.target.value);
                          setRoleFormError("");
                        }}
                      />
                    </div>
                    <button type="submit">
                      {editingRoleKey ? "Simpan role" : "Tambahkan role"}
                    </button>
                    <button
                      className="cancel-action"
                      type="button"
                      onClick={resetRoleForm}
                    >
                      Batal
                    </button>
                    {roleFormError ? (
                      <p className="user-form-error" role="alert">
                        {roleFormError}
                      </p>
                    ) : null}
                  </form>
                ) : null}

                <div className="role-master-list">
                  {roles.map((role) => {
                    const assignedUsers = users.filter(
                      (user) => user.role === role.key,
                    ).length;
                    const locked = role.key === "super_admin";
                    return (
                      <article
                        className={`role-master-row ${
                          selectedRole === role.key
                            ? "role-master-selected"
                            : ""
                        } ${role.active ? "" : "role-master-inactive"}`}
                        key={role.key}
                      >
                        <button
                          className="role-master-select"
                          type="button"
                          onClick={() => {
                            setSelectedRole(role.key);
                            setRoleFormError("");
                            setSavedNotice(false);
                          }}
                        >
                          <span>
                            <strong>{role.label}</strong>
                            {role.system ? <small>Role sistem</small> : null}
                          </span>
                          <p>{role.description}</p>
                        </button>
                        <div className="role-master-meta">
                          <span
                            className={
                              role.active
                                ? "role-status-active"
                                : "role-status-inactive"
                            }
                          >
                            {role.active ? "Aktif" : "Nonaktif"}
                          </span>
                          <small>{assignedUsers} pengguna</small>
                        </div>
                        <div className="role-master-actions">
                          {locked ? (
                            <span>Dilindungi</span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => editRole(role)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleRole(role.key)}
                              >
                                {role.active ? "Nonaktifkan" : "Aktifkan"}
                              </button>
                              {!role.system ? (
                                <button
                                  className="role-delete-action"
                                  type="button"
                                  disabled={assignedUsers > 0}
                                  title={
                                    assignedUsers > 0
                                      ? "Role masih dipakai pengguna"
                                      : "Hapus role"
                                  }
                                  onClick={() => deleteRole(role.key)}
                                >
                                  Hapus
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                {!roleFormOpen && roleFormError ? (
                  <p className="user-form-error role-master-error" role="alert">
                    {roleFormError}
                  </p>
                ) : null}

                <div className="role-access-header">
                  <div>
                    <span className="section-kicker">Hak akses</span>
                    <h3 id="role-access-title">Akses Role Terpilih</h3>
                    <p>
                      Atur apakah modul disembunyikan, hanya dapat dilihat, atau
                      dapat dikelola oleh role terpilih.
                    </p>
                  </div>
                  <label className="role-picker">
                    <span>Pilih role</span>
                    <select
                      value={selectedRole}
                      onChange={(event) => {
                        setSelectedRole(event.target.value as RoleKey);
                        setSavedNotice(false);
                      }}
                    >
                      {roles.map((role) => (
                        <option value={role.key} key={role.key}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="selected-role-summary">
                  <div>
                    <strong>{selectedRoleDefinition.label}</strong>
                    <p>{selectedRoleDefinition.description}</p>
                  </div>
                  {selectedRole === "super_admin" ? (
                    <span className="permission-lock-badge">Akses penuh terkunci</span>
                  ) : (
                    <span className="permission-local-badge">Tersimpan lokal</span>
                  )}
                </div>

                <div className="permission-list">
                  {PERMISSION_MODULES.map((module) => {
                    const globallyInactive =
                      module.globalModuleKey &&
                      !moduleConfig[module.globalModuleKey];
                    const currentAccess =
                      rolePermissions[selectedRole]?.[module.key] ?? "none";

                    return (
                      <article className="permission-row" key={module.key}>
                        <div className="permission-copy">
                          <div>
                            <strong>{module.label}</strong>
                            {globallyInactive ? (
                              <span className="module-off-badge">
                                Modul nonaktif
                              </span>
                            ) : null}
                          </div>
                          <p>{module.description}</p>
                        </div>
                        <div
                          className="permission-levels"
                          aria-label={`Akses ${module.label} untuk ${selectedRoleDefinition.label}`}
                        >
                          {accessOptions.map((option) => (
                            <button
                              className={`permission-level permission-${option.value} ${
                                currentAccess === option.value
                                  ? "permission-selected"
                                  : ""
                              }`}
                              type="button"
                              key={option.value}
                              disabled={selectedRole === "super_admin"}
                              aria-pressed={currentAccess === option.value}
                              onClick={() =>
                                changeRoleAccess(module.key, option.value)
                              }
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <div className="settings-help">
              <span>i</span>
              <p>
                {activeSection === "modules" ? (
                  <>
                    <strong>Status modul sudah persisten.</strong> Refresh halaman
                    atau kembali ke dashboard untuk melihat konfigurasi yang sama.
                  </>
                ) : activeSection === "users" ? (
                  <>
                    <strong>Pengguna, Master Role, dan hak akses tersimpan di perangkat.</strong>{" "}
                    Login dan pengamanan route belum diterapkan pada checkpoint ini.
                  </>
                ) : (
                  <>
                    <strong>Bagian ini belum disimpan.</strong> Tambah dan aktivasi
                    hanya untuk memvalidasi alur operator.
                  </>
                )}
              </p>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
