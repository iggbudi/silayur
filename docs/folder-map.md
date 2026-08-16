# Folder Map DIGITAMA

> Visual map dari organisasi kode. Untuk filosofi, lihat
> [`../ARCHITECTURE.md`](../ARCHITECTURE.md). Untuk keputusan teknis,
> lihat [`./adr/`](./adr/).

## Struktur Saat Ini (Checkpoint 12)

```
dashboard/
│
├─ 📜 ROOT CONFIG
│  ├── package.json
│  ├── tsconfig.json           ← path alias @shared, @db, @app, @features, @slices
│  ├── vite.config.ts          ← vinext + Cloudflare plugin
│  ├── next.config.ts
│  ├── drizzle.config.ts
│  ├── eslint.config.mjs
│  ├── postcss.config.mjs
│  ├── .env.example
│  ├── .gitignore
│  ├── README.md
│  ├── progress.md
│  └── ARCHITECTURE.md         ← 📄 FASE 0
│
├─ 🖼️ FRONTEND (app/)
│  ├── layout.tsx              ← Root layout
│  ├── page.tsx                ← Dashboard
│  ├── globals.css             ← Global styles
│  │
│  ├── login/                  ─┐
│  │   └── page.tsx            │ Slice: auth
│  │                           │
│  ├── api/                    │ (thin HTTP handlers)
│  │   ├── auth/               │
│  │   │   ├── login/route.ts  │
│  │   │   └── logout/route.ts │
│  │   ├── config/route.ts     │
│  │   └── db/health/route.ts  │
│  │                           │
│  ├── components/             │
│  │   ├── session-gate.tsx    │
│  │   ├── brand.tsx           │
│  │   ├── toggle.tsx          │
│  │   ├── sidebar-nav...tsx   │
│  │   ├── settings-user-form  │
│  │   ├── ticket-settings.tsx │
│  │   ├── dashboard-widgets   │
│  │   ├── mobile-drawer.tsx   │
│  │   ├── mobile-menu-button  │
│  │   └── dev-runtime-guard   │
│  │                           │
│  ├── hooks/                  │
│  │   ├── use-session.ts      │
│  │   ├── use-mobile-sidebar  │
│  │   └── use-drawer-swipe.ts │
│  │                           │
│  ├── lib/                    │
│  │   ├── config-api.ts       │
│  │   ├── access.ts           │
│  │   ├── module-config.ts    │
│  │   ├── role-permissions.ts │
│  │   ├── settings-items.ts   │
│  │   └── user-config.ts      │
│  │                           │
│  ├── pengaturan/             ─┐ Slice: settings
│  │   └── page.tsx            │
│  │                           │
│  ├── features/               ← 📁 FASE 4 (untuk slice BARU)
│  │   └── README.md
│  │                           │
│  ├── slices/                 ← 📁 FASE 2 (boundary public API)
│  │   └── (akan ditambah)
│  │                           │
│  ├── styles/                 ← 📁 FASE 3A (CSS tokens & base)
│  │   └── (akan ditambah)
│  │                           │
│  ├── chatgpt-auth.ts
│  └── _sites-preview/
│
├─ 🗄️ DATA (db/)
│  ├── schema.ts               ← Single source of truth
│  │
│  ├── auth-repo.ts            ─┐ Slice: auth
│  │                           │
│  ├── config-repo.ts          ─┤ Slice: settings
│  │                           │
│  ├── ticket-repo.ts          ─┤ Slice: ticket-master
│  │                           │
│  ├── client.ts               │ PostgreSQL (scripts/tests)
│  ├── get-db.ts               │ Factory (API routes)
│  │                           │
│  ├── env.ts                  │ Env resolver
│  ├── runtime-env.ts          │ .env loader
│  ├── http.ts                 │ HTTP helpers
│  │                           │
│  ├── index.ts                │ Public exports
│  ├── seed-data.json          │ Idempotent seed
│  ├── seed-data.ts            │ Type-safe wrapper
│  │                           │
│  └── __tests__/              ← 📁 FASE 1 (co-located tests)
│
├─ 📐 SHARED CONTRACTS (shared/)
│  ├── config.ts               ← Domain types
│  ├── access.ts               ← RBAC primitives
│  ├── password.mjs            ← Crypto primitives
│  └── password.d.ts           ← Type declarations
│
├─ 🗃️ DATABASE MIGRATIONS (drizzle/)
│  ├── 0000_checkpoint_7_foundation.sql
│  ├── 0001_checkpoint_9_secure_persistence.sql
│  ├── 0002_checkpoint_11_ticket_master.sql
│  └── meta/
│
├─ 🔧 CLI SCRIPTS (scripts/)
│  ├── db-migrate.mjs
│  ├── db-seed.mjs
│  ├── db-check.mjs
│  ├── auth-set-password.mjs
│  └── sync-dev-vars.mjs
│
├─ 🧪 TESTS (tests/) & co-located __tests__/
│  ├── tests/
│  │   ├── test-utils.mjs        ← shared util (cleanupTempDirectory)
│  │   └── rendered-html.test.mjs  ← cross-slice test
│  ├── db/__tests__/
│  │   └── db-foundation.test.mjs  ← co-located dengan db/
│  ├── app/api/__tests__/
│  │   └── config-api.test.mjs     ← co-located dengan app/api/
│  └── app/lib/__tests__/
│      └── session-cache.test.mjs  ← co-located dengan app/lib/
│
├─ ⚙️ WORKER ENTRY (worker/)
│  └── index.ts                ← Cloudflare Worker handler
│
├─ 📚 DOCS (docs/)              ← 📁 FASE 0
│  ├── folder-map.md           ← 📄 INI FILE
│  └── adr/
│      ├── 0001-hybrid-layered-with-co-location.md  ← 📄 FASE 0
│      └── (ADR berikutnya)
│
├─ 📦 BUILD OUTPUT
│  ├── build/                  ← Vite build config
│  ├── dist/                   ← Build artifacts
│  ├── public/                 ← Static assets
│  └── examples/               ← Contoh kode
│
└─ 🛠️ LOCAL TOOLING (ignored)
   ├── .data/                  ← Local SQLite
   ├── .vinext/                ← Vite cache
   ├── .wrangler/              ← Cloudflare cache
   ├── node_modules/
   ├── work/                   ← Worktree output
   └── .serena/, .openai/      ← Tool state
```

## Slice Map (Domain Boundaries)

| Slice | Files | Tanggung Jawab |
|---|---|---|
| **auth** | `app/login/`, `app/api/auth/*`, `db/auth-repo.ts`, `app/hooks/use-session.ts`, `app/components/session-gate.tsx`, `shared/password.mjs` | Login, logout, session, password |
| **rbac** | `shared/access.ts`, `app/lib/access.ts`, `app/components/sidebar-navigation.tsx` | Role, permission, sidebar nav |
| **settings** | `app/pengaturan/`, `db/config-repo.ts`, `app/api/config/route.ts`, `app/components/settings-user-form.tsx` | Konfigurasi sistem, user management |
| **ticket-master** | `db/ticket-repo.ts`, `app/components/ticket-settings.tsx` | Produk tiket & tarif |
| **dashboard** | `app/page.tsx`, `app/components/dashboard-widgets.tsx` | Halaman utama & KPI |
| **ticket-sales** | `app/features/ticket-sales/`, `app/api/sales/*`, `app/penjualan/` | Transaksi penjualan tiket (POS, void) |
| **finance** | `app/features/finance/`, `app/api/{revenue,expenses,cash-session,finance/summary}/*`, `app/keuangan/` | Pemasukan non-tiket, pengeluaran, kas harian |
| **reports** | `app/features/reports/`, `app/api/reports/`, `app/laporan/` | Rekap & rincian lintas tanggal |
| **complaints** | `app/features/complaints/`, `app/api/complaints/*`, `app/complaints/` | Komplain pengunjung (catat, status, tindak lanjut) |
| **facilities** | `app/features/facilities/`, `app/api/facilities/*`, `app/fasilitas/` | Status fasilitas harian (beroperasi/perlu cek/ditutup) |
| **jadwal-karyawan** | `app/features/jadwal-karyawan/`, `app/api/jadwal-karyawan/*`, `app/jadwal-karyawan/` | Jadwal shift, PIC, kehadiran karyawan |
| **platform** | `app/components/{brand,toggle,dev-runtime-guard,mobile-drawer,mobile-menu-button}.tsx`, `app/hooks/{use-mobile-sidebar,use-drawer-swipe}.ts`, `app/lib/*` | Cross-cutting utilities (shell UI, drawer mobile aksesibel, swipe) |

## Cross-slice Dependency

```
                    ┌──────────────┐
                    │  shared/*    │  ← types & pure functions
                    └──────┬───────┘
                           │ semua slice import
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
   ┌──────┐            ┌──────┐           ┌──────┐
   │ auth │───types───▶│ rbac │◀──types───│settings│
   └──┬───┘            └──────┘           └──────┘
      │                                       │
      │                          ┌────────────┤
      │                          ▼            ▼
      │                       ┌──────┐   ┌─────────┐
      └────session cookie────▶│dashboard│ │ticket-  │
                              │       │ │master   │
                              └──────┘   └─────────┘
```

**Tidak ada cross-DB-join** — semua lewat `shared/config.ts` types.
