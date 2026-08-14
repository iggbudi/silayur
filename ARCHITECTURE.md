# SILAYUR — Arsitektur Aplikasi

> Dokumen ini menjelaskan filosofi organisasi kode SILAYUR Dashboard.
> Berlaku sejak Checkpoint 12. Untuk konteks produk & progress, lihat
> [`README.md`](./README.md) dan [`progress.md`](./progress.md).

## TL;DR

SILAYUR adalah **edge-deployed modular monolith** dengan organisasi kode
**hybrid (layered + co-located + vertical slice)**. Kita **tidak** refactor
besar-besaran; setiap fase dirancang agar **aman, inkremental, dan
backward-compatible**. Sejak CP12, kita punya **pilot slice** (`ticket-sales`)
yang membuktikan pattern vertical slicing berjalan baik berdampingan dengan
layered existing.

## Status Implementasi

Semua 5 fase roadmap arsitektur **selesai** (commit `5737833`):

| Fase | Scope | Commit |
|---|---|---|
| 0 | Pondasi docs & path alias | `3386d3c` |
| 1 | Co-locate tests dengan source | `1f1552b` |
| 2 | Public API boundary per slice | `23e9a23` |
| 3A | Extract CSS tokens & base | `e8c7c3a` |
| 4 | Scaffold `app/features/` | `6b3cd7a` |
| 5 | Pilot slice `ticket-sales/` | `5737833` |

Lihat [`docs/adr/0001-hybrid-layered-with-co-location.md`](./docs/adr/0001-hybrid-layered-with-co-location.md)
untuk keputusan arsitektur & trade-off.

## Filosofi Inti

1. **Modul dulu, lalu layer** — kode dikelompokkan berdasarkan domain
   (auth, settings, ticket-master) sebelum berdasarkan teknis (UI, API, DB).
2. **Co-location when it helps** — file test dan stylesheets diletakkan
   sedekat mungkin dengan source-nya.
3. **Pragmatism over purity** — folder structure mengikuti kebutuhan
   saat ini, bukan aturan абстрактный.
4. **Public API per slice** — setiap modul punya `index.ts` yang jadi
   satu-satunya pintu impor dari luar.

## Struktur Folder

```
dashboard/
├── app/                          # Next.js / vinext app router
│   ├── page.tsx                  # Dashboard (/)
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles (Tailwind + custom)
│   ├── styles/                   # Extracted CSS (tokens, base)
│   ├── api/                      # API routes (thin handler)
│   ├── components/               # Cross-cutting UI components
│   ├── hooks/                    # Cross-cutting React hooks
│   ├── lib/                      # Cross-cutting client helpers
│   ├── features/                 # Vertical slice (BARU) — lihat Fase 4+
│   ├── login/                    # Auth pages
│   └── pengaturan/               # Settings pages
│
├── db/                           # Data layer
│   ├── schema.ts                 # Drizzle schema (single source)
│   ├── *-repo.ts                 # Repository per domain
│   ├── client.ts                 # Node libSQL client
│   ├── client-web.ts             # Fetch-based libSQL (Workers)
│   ├── env.ts                    # Env resolver
│   ├── runtime-env.ts            # Runtime env loader (.env → process.env)
│   ├── http.ts                   # HTTP helpers (jsonOk, jsonError, same-origin)
│   ├── get-db.ts                 # DB factory (choose Node/Web)
│   ├── seed-data.json            # Idempotent seed
│   └── __tests__/                # Co-located tests (lihat Fase 1)
│
├── shared/                       # Domain contracts (type & pure functions)
│   ├── config.ts                 # Domain types (Module, Role, Permission, Tiket)
│   ├── access.ts                 # RBAC primitives
│   └── password.mjs              # Crypto primitives (PBKDF2, session token)
│
├── drizzle/                      # SQL migrations
│   └── meta/                     # Drizzle metadata
│
├── scripts/                      # CLI scripts (migrate, seed, check, auth)
├── tests/                        # Cross-cutting tests (rendered-html, utils)
├── worker/                       # Cloudflare Worker entry
├── examples/                     # Contoh & dokumentasi visual
├── work/                         # Output kerja checkpoint
├── docs/                         # 📁 INI — dokumentasi arsitektur & ADR
│   ├── adr/                      # Architecture Decision Records
│   └── folder-map.md             # Visual map folder
│
├── ARCHITECTURE.md               # 📄 INI FILE
├── README.md
├── progress.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── next.config.ts
└── drizzle.config.ts
```

## Per Slice (Domain)

Domain-domain aplikasi (lihat [`docs/folder-map.md`](./docs/folder-map.md)
untuk visual):

| Slice | Deskripsi | Files |
|---|---|---|
| **auth** | Login, session, password | `app/login/`, `app/api/auth/`, `db/auth-repo.ts`, `app/hooks/use-session.ts`, `app/components/session-gate.tsx`, `shared/password.mjs` |
| **rbac** | Role, permission, akses modul | `shared/access.ts`, `app/components/sidebar-navigation.tsx`, `app/lib/access.ts` |
| **settings** | Konfigurasi sistem & user | `app/pengaturan/`, `db/config-repo.ts`, `app/api/config/`, `app/components/settings-user-form.tsx` |
| **ticket-master** | Master tiket & tarif | `db/ticket-repo.ts`, `app/components/ticket-settings.tsx`, types di `shared/config.ts` |
| **dashboard** | Halaman utama & KPI | `app/page.tsx`, `app/components/dashboard-widgets.tsx` |
| **platform** | Cross-cutting UI/utility | `app/components/brand.tsx`, `toggle.tsx`, `dev-runtime-guard.tsx`, `app/lib/`, `app/hooks/use-mobile-sidebar.ts` |

## Aturan Impor

- **Boleh**: `import { x } from "@/shared/config"`
- **Boleh**: `import { x } from "@/db/auth-repo"` (langsung ke file)
- **Disarankan**: `import { x } from "@/slices/auth"` (via public API — lihat Fase 2)
- **Dilarang**: deep import ke internal folder (`@/slices/auth/internal/...`)
- **Slice boundary**: file di `app/api/` akan diberi warning (Fase 2) bila
  import langsung dari internal slice (`db/auth-repo`, `shared/password.mjs`, dll).
  Naikkan ke error setelah migrasi selesai.

Lihat [`app/slices/MANIFEST.md`](./app/slices/MANIFEST.md) untuk struktur
internal setiap slice.

## Vertical Features (Fase 4+)

Untuk fitur **baru** yang self-contained, gunakan folder
[`app/features/<nama>/`](./app/features/). Bedanya dengan `app/slices/`:

| Aspek | `app/slices/<nama>/` | `app/features/<nama>/` |
|---|---|---|
| **Kapan** | Domain existing (auth, settings, dll.) | Fitur baru, terisolasi |
| **Struktur** | Re-export dari lokasi existing | Self-contained, semua di 1 folder |
| **Anggota** | File tersebar di `app/`, `db/`, `shared/` | Semua kode 1 fitur di 1 folder |
| **Index.ts** | Wajib (public API) | Wajib (public API) |
| **ESLint** | Warning untuk `app/api/**` deep-import | Warning untuk semua `app/**` kecuali `app/features/**` |

Lihat [`app/features/README.md`](./app/features/README.md) untuk konvensi
lengkap dan cara memulai fitur baru.

## Pilot Slice: `ticket-sales/` (Fase 5)

Slice pertama yang mengimplementasikan pattern vertical. Semua kode
transaksi penjualan tiket (DB schema, repo, API, UI, tests) ada di
[`app/features/ticket-sales/`](./app/features/ticket-sales/).

### Struktur

```
app/features/ticket-sales/
├── index.ts                       # Public API (re-exports)
├── types.ts                       # Sale, SaleItem, SaleInput, PricedItem
├── repo.ts                        # createSale, loadSaleById, list, summary
├── api.ts                         # Client wrapper (createSale, listTodaySales)
├── components/
│   ├── SaleForm.tsx               # Form input tiket per produk
│   ├── SaleHistory.tsx            # List transaksi hari ini
│   └── TodaySummary.tsx           # Ringkasan count & revenue
└── __tests__/
    └── repo.test.ts               # 2 test (type & signature)
```

### Key Design Decisions

- **Atomic transaction** — `createSale()` di-wrap `db.transaction()` untuk
  insert header `sales` + line items `sale_items` secara all-or-nothing.
- **Snapshot pricing** — `unitPrice`, `subtotal`, dan `productName` di-freeze
  di `sale_items` saat transaksi. Jika master tarif atau nama produk
  berubah di kemudian hari, transaksi lama tetap refer ke nilai historis.
- **Effective tariff** — query otomatis cari harga sesuai `dayType`
  (weekday/weekend) dan periode `validFrom`/`validUntil` di `ticket_prices`.
- **Receipt number** — format `RCP-YYYYMMDD-####` (auto-increment per hari).
- **Day type detection** — weekend = Sabtu/Minggu, weekday = Senin-Jumat.

### DB Schema

- Tabel `sales`: `id`, `receipt_number` (UNIQUE), `sold_by`, `sold_at`,
  `visit_date`, `total_amount`, `total_quantity`, `status`, `notes`.
- Tabel `sale_items`: `id`, `sale_id` (FK cascade), `ticket_product_id`
  (FK), `product_name`, `visitor_category`, `unit_price`, `quantity`,
  `subtotal`.
- 6 index untuk query performance (`sold_at`, `sold_by`, `visit_date`,
  `sale_id`, `product_id`, `receipt_number` UNIQUE).
- Migration: [`drizzle/0003_checkpoint_12_ticket_sales.sql`](./drizzle/0003_checkpoint_12_ticket_sales.sql).

### Wire-up

- **API route**: [`app/api/sales/route.ts`](./app/api/sales/route.ts) —
  thin handler `POST` (create) & `GET` (list by date), import logic dari
  `features/ticket-sales/repo`.
- **Halaman**: [`app/penjualan/page.tsx`](./app/penjualan/page.tsx) —
  RBAC: butuh `access.visitors` (view/manage).
- **Nav**: BELUM ditambahkan ke `sidebar-navigation.tsx` (todo next phase).

## Slice Laporan: `reports/`

Fitur rekap & rincian lintas tanggal (halaman `/laporan`). Membaca langsung
tabel `sales`, `revenue_entries`, `expenses`, `cash_sessions` (tanpa
perubahan schema). Semantik waktu konsisten dengan modul existing: window
UTC WIB untuk `sold_at`, filter string untuk `entry_date`, penjualan
`voided` dikecualikan, pengeluaran hanya `approved` dihitung sebagai uang
keluar. Public API: [`app/features/reports/`](./app/features/reports/);
route thin handler: [`app/api/reports/route.ts`](./app/api/reports/route.ts)
(RBAC `assertCanViewReports`); halaman:
[`app/laporan/page.tsx`](./app/laporan/page.tsx). Rincian per hari memakai
endpoint existing (`/api/sales?date=`, `/api/revenue?date=`,
`/api/expenses?date=`).

## Slice Komplain: `complaints/`

Modul komplain end-to-end (halaman `/complaints`), pilot untuk dead-link
modul. Tabel `complaints` (migration `0007`) dengan siklus hidup
`open → assigned → processing → resolved` (atau `reopened`). Public API:
[`app/features/complaints/`](./app/features/complaints/); route thin
handler: `app/api/complaints/*` (RBAC `assertCanViewComplaints` /
`assertCanManageComplaints`); halaman:
[`app/complaints/page.tsx`](./app/complaints/page.tsx). Dashboard memakai
`listRecentComplaints` + `countOpenComplaints` untuk panel & KPI komplain.

## Mengikuti Roadmap

Lihat [`docs/adr/0001-hybrid-layered-with-co-location.md`](./adr/0001-hybrid-layered-with-co-location.md)
untuk keputusan teknis & trade-off, dan `progress.md` untuk status eksekusi.

## Untuk Kontributor Baru

1. Baca [`README.md`](./README.md) — setup & perintah dasar
2. Baca [`ARCHITECTURE.md`](./ARCHITECTURE.md) (file ini) — filosofi & struktur
3. Baca [`docs/folder-map.md`](./docs/folder-map.md) — visual overview
4. Baca [`docs/adr/`](./adr/) — keputusan arsitektur & alasannya
5. Pilih slice yang ingin diubah, baca `MANIFEST.md` slice tersebut
