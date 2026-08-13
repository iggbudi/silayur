# Slice Manifest

> Dokumen ini menjelaskan struktur internal setiap slice. Untuk filosofi,
> lihat [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md).

## Konvensi

- Setiap slice punya `index.ts` sebagai **public API** (satu-satunya pintu impor dari luar).
- File internal slice **tidak boleh** diimpor langsung dari luar slice.
- Lihat file `index.ts` masing-masing slice untuk daftar export.

---

## 1. `auth/` — Autentikasi & Session

**Tanggung jawab**: Login, logout, session, password, RBAC enforcement pada endpoint.

| File | Tipe | Deskripsi |
|---|---|---|
| `index.ts` | — | Public API (re-exports) |
| (no internal) | — | Semua anggota slice ada di luar `app/slices/` |

**Anggota slice** (file external yang di-re-export):
- `db/auth-repo.ts` — server-side: `authenticateWithPassword`, `createAuthSession`, `requireRequestUser`, dll.
- `shared/password.mjs` — crypto: `hashPassword`, `verifyPassword`, `createSessionToken`, dll.
- `app/login/page.tsx` — login UI
- `app/api/auth/` — API routes: login, logout
- `app/hooks/use-session.ts` — client-side session hook
- `app/components/session-gate.tsx` — loading/redirect component

**Boundary**: File di luar slice **harus** import via `@/slices/auth`, **bukan** dari `db/auth-repo` atau `shared/password.mjs`.

---

## 2. `rbac/` — Role-Based Access Control

**Tanggung jawab**: Role, permission, akses modul, sidebar navigation.

| File | Tipe | Deskripsi |
|---|---|---|
| `index.ts` | — | Public API |

**Anggota slice**:
- `shared/access.ts` — primitives: `getAccessLevel`, `canView`, `canManage`
- `app/lib/role-permissions.ts` — `DEFAULT_ROLE_DEFINITIONS`, `PERMISSION_MODULES`
- `app/components/sidebar-navigation.tsx` — permission-aware nav

---

## 3. `settings/` — Pengaturan Sistem

**Tanggung jawab**: Konfigurasi sistem, user management, role master.

| File | Tipe | Deskripsi |
|---|---|---|
| `index.ts` | — | Public API |

**Anggota slice**:
- `db/config-repo.ts` — CRUD modules, roles, permissions, users, config items
- `app/pengaturan/page.tsx` — settings UI
- `app/api/config/route.ts` — config API
- `app/components/settings-user-form.tsx` — form user
- `app/lib/settings-items.ts`, `user-config.ts`, `module-config.ts` — helpers

---

## 4. `ticket-master/` — Master Tiket

**Tanggung jawab**: Master tiket (produk Dewasa/Anak) dan tarif efektif.

| File | Tipe | Deskripsi |
|---|---|---|
| `index.ts` | — | Public API |

**Anggota slice**:
- `db/ticket-repo.ts` — CRUD produk & tarif
- `app/components/ticket-settings.tsx` — UI master tiket

---

## 5. `dashboard/` — Halaman Utama

**Tanggung jawab**: Halaman dashboard root dan widget KPI.

| File | Tipe | Deskripsi |
|---|---|---|
| `index.ts` | — | Public API |

**Anggota slice**:
- `app/page.tsx` — root dashboard
- `app/components/dashboard-widgets.tsx` — `MetricCard`

**Catatan**: KPI Pengunjung & Pendapatan sudah membaca ringkasan penjualan nyata
via `GET /api/sales` (slice `ticket-sales`). Panel operasional, fasilitas, dan
komplain masih simulasi statis.

---

## 6. `platform/` — Cross-cutting Utilities

**Tanggung jawab**: Brand, toggle, runtime guard, sidebar nav, mobile sidebar hook, config API client.

| File | Tipe | Deskripsi |
|---|---|---|
| `index.ts` | — | Public API |

**Anggota slice**:
- `app/components/brand.tsx`, `toggle.tsx`, `dev-runtime-guard.tsx`
- `app/components/sidebar-navigation.tsx` (di-share dengan slice `rbac`)
- `app/hooks/use-mobile-sidebar.ts`
- `app/lib/config-api.ts` — `fetchSession`, `loginRemote`, dll.

**Catatan**: `sidebar-navigation.tsx` adalah anggota **dua slice** (`rbac` untuk permission logic, `platform` untuk komponen UI). Ini acceptable karena komponennya memang cross-cutting.

---

## Lihat Juga: Vertical Features

Pattern **vertical slice** untuk fitur BARU yang self-contained
didefinisikan di [`../features/README.md`](../features/README.md).

**Pilot slice**: `app/features/ticket-sales/` — transaksi penjualan tiket
dari DB schema sampai UI. Lihat [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md)
section "Pilot Slice: `ticket-sales/` (Fase 5)" untuk detail.
