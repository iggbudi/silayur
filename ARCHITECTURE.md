# SILAYUR — Arsitektur Aplikasi

> Dokumen ini menjelaskan filosofi organisasi kode SILAYUR Dashboard.
> Berlaku sejak Checkpoint 12. Untuk konteks produk & progress, lihat
> [`README.md`](./README.md) dan [`progress.md`](./progress.md).

## TL;DR

SILAYUR adalah **edge-deployed modular monolith** dengan organisasi kode
**hybrid (layered + co-located)** dan **opsional vertical slice** untuk
fitur baru. Kita **tidak** refactor besar-besaran; setiap fase dirancang
agar **aman, inkremental, dan backward-compatible**.

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

## Mengikuti Roadmap

Lihat [`docs/adr/0001-hybrid-layered-with-co-location.md`](./adr/0001-hybrid-layered-with-co-location.md)
untuk keputusan teknis & trade-off, dan `progress.md` untuk status eksekusi.

## Untuk Kontributor Baru

1. Baca [`README.md`](./README.md) — setup & perintah dasar
2. Baca [`ARCHITECTURE.md`](./ARCHITECTURE.md) (file ini) — filosofi & struktur
3. Baca [`docs/folder-map.md`](./docs/folder-map.md) — visual overview
4. Baca [`docs/adr/`](./adr/) — keputusan arsitektur & alasannya
5. Pilih slice yang ingin diubah, baca `MANIFEST.md` slice tersebut
