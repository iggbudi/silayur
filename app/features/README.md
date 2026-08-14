# Features (Vertical Slices)

> Folder ini untuk fitur **baru** yang self-contained (vertical slice).
> Untuk fitur yang sudah ada, lihat [`../slices/MANIFEST.md`](../slices/MANIFEST.md)
> dan [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md).

## Kapan Pakai `features/` vs `slices/`?

| Gunakan `features/<nama>/` bila: | Tetap di `slices/<nama>/` atau `app/<layer>/` bila: |
|---|---|
| Fitur benar-benar baru (belum ada di codebase) | Sudah ada anggota di `app/`, `db/`, `shared/` |
| Self-contained — bisa berdiri sendiri | Cross-cutting, dipakai banyak tempat |
| Akan jadi pilot pattern | Bagian dari domain yang sudah mature |
| Butuh folder terisolasi (testing, deployment) | Hanya tambahan/penyesuaian kecil |

**Contoh kandidat** (sesuai `progress.md`):
- `ticket-sales/` — transaksi penjualan tiket (Fase 5 pilot)
- `visitor-checkin/` — check-in pengunjung di loket
- `cashier-report/` — laporan kas harian
- `complaints/` — alur komplain end-to-end ✅ **dibuat 14 Agt 2026** sebagai
  pilot dead-link (lihat [`complaints/`](./complaints/))

## Konvensi Struktur

```
features/<nama-fitur>/
├── components/          # UI components (jika ada)
│   ├── Form.tsx
│   └── List.tsx
├── api.ts               # Client API (fetch wrapper)
├── server.ts            # Server logic (route handler, RSC, dll.)
├── repo.ts              # Data access (Drizzle queries)
├── types.ts             # TypeScript types lokal
├── validation.ts        # Zod schema (jika ada)
├── constants.ts         # Konstanta (jika ada)
├── index.ts             # ★ PUBLIC API — hanya ini yang di-import dari luar
├── MANIFEST.md          # (opsional) penjelasan fitur, dependency, edge cases
└── __tests__/           # Co-located tests
    ├── api.test.ts
    ├── server.test.ts
    └── repo.test.ts
```

## Aturan Impor (WAJIB)

### ✅ Boleh

```typescript
// Import public API dari slice/feature lain
import { fetchSession } from "../../slices/auth";
import { MetricCard } from "../../slices/dashboard";
import { TicketProduct } from "@shared/config";
import { getRequestDb } from "@db/get-db";
```

### ❌ Dilarang

```typescript
// Deep import ke internal file feature/slice lain
import { x } from "../../slices/auth/internal/crypto";  // ❌
import { y } from "../../features/ticket-sales/repo";   // ❌
import { z } from "@db/auth-repo";                      // ❌ (di app/features)
```

ESLint rule (`no-restricted-imports` di Fase 2) akan memberikan **warning**
bila melanggar. Naikkan ke **error** bila semua migrasi selesai.

## Contoh: Struktur Ideal `ticket-sales/`

```
features/ticket-sales/
├── components/
│   ├── SaleForm.tsx           # form input penjualan
│   ├── Receipt.tsx            # struk
│   └── SaleHistory.tsx        # list transaksi
├── api.ts                     # fetch /api/sales
├── server.ts                  # handler POST/GET sales
├── repo.ts                    # Drizzle: insert sale, get sales by date
├── types.ts                   # Sale, Receipt, Payment types
├── validation.ts              # Zod: createSaleSchema
├── index.ts                   # public API
├── MANIFEST.md                # doc
└── __tests__/
    ├── repo.test.ts
    ├── server.test.ts
    └── SaleForm.test.tsx
```

## Cara Mulai Fitur Baru

1. **Diskusi schema & flow** — apa tabel DB, alur UI, edge case
2. **Buat folder** `app/features/<nama>/`
3. **Tulis `types.ts`** dulu (kontrak data)
4. **Tulis `repo.ts`** (data layer + Drizzle)
5. **Tulis `server.ts`** (handler API, validasi)
6. **Tulis `api.ts`** (client wrapper)
7. **Tulis components** (UI)
8. **Tulis `index.ts`** (public API)
9. **Tulis tests** (unit + integration)
10. **Update `progress.md`** dengan status fitur
11. **Tambah route** di `app/api/<nama>/route.ts` (thin handler, import dari `features/<nama>/server`)
12. **Tambah nav** di `app/components/sidebar-navigation.tsx`
13. **Commit** dengan pesan `feat(<scope>): ...`

## Pilot Implementation: `ticket-sales/`

Slice pertama yang mengimplementasikan pattern ini adalah
[`ticket-sales/`](./ticket-sales/) — transaksi penjualan tiket.

**Struktur final**:

```
ticket-sales/
├── index.ts            # Public API
├── types.ts            # Sale, SaleItem, SaleInput, PricedItem
├── repo.ts             # createSale, loadSaleById, listSalesByDate, todaySummary
├── api.ts              # createSale, listTodaySales (client wrapper)
├── components/
│   ├── SaleForm.tsx
│   ├── SaleHistory.tsx
│   └── TodaySummary.tsx
└── __tests__/
    └── repo.test.ts
```

**Hasil**: 1 fitur lengkap (DB → API → UI → test) dalam **15 file**, **0 baris
disentuh di lokasi existing** (`app/components/`, `db/`, `app/api/`,
`shared/`).

**Wire-up** (file external, minimum touch):
- `app/api/sales/route.ts` — thin handler (33 baris) import dari slice
- `app/penjualan/page.tsx` — halaman (134 baris) pakai public API
- `db/schema.ts` — tambah 2 tabel (+75 baris)
- `drizzle/0003_*.sql` — migration baru

**Key takeaways** untuk slice baru:
1. **Mulai dari `types.ts`** — definisikan kontrak data dulu
2. **`repo.ts` adalah jantung** — semua business logic & DB access
3. **`index.ts` boundary** — hanya ini yang di-import dari luar
4. **Halaman hanya tipis** — UI rendering, logic ada di slice

Lihat [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) section
"Pilot Slice" untuk detail teknis.

## Prinsip Desain

- **Self-contained** — semua kode 1 fitur di 1 folder
- **Test-first** — tulis test sebelum/bersamaan kode
- **Idempotent migration** — schema DB harus backward-compatible
- **Atomic transaction** — operasi multi-tabel wajib dalam `db.transaction()`
- **RBAC enforced server-side** — `assertCanViewSettings` / `assertCanManageSettings` dll.
