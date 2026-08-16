# Rekap Arsitektur — Checkpoint 12

> ⚠️ **Dokumen era Turso (sebelum migrasi Postgres, dipertahankan sebagai
> catatan historis)**. Project sekarang memakai **PostgreSQL** via
> `DATABASE_URL` (lihat `db/get-db.ts`), bukan Turso/libSQL. Bagian "Apply
> migration ke Turso" di bawah sekarang setara `npm run db:migrate` dengan
> `.env` yang menunjuk target Postgres yang benar.

> Dokumen ini adalah **handover summary** untuk owner.
> Untuk detail, lihat [`ARCHITECTURE.md`](../ARCHITECTURE.md),
> [`docs/adr/0001-...`](../adr/0001-hybrid-layered-with-co-location.md),
> dan [`progress.md`](../progress.md).

## TL;DR

Sejak **Checkpoint 12**, SILAYUR Dashboard mengadopsi organisasi kode
**hybrid (layered + co-located + vertical slice)**. Implementasi bertahap
dalam 5+1 fase, **zero breaking change**, 6 commit terisolasi.

## Hasil Per Fase

| Fase | Commit | Scope | File | Baris |
|---|---|---|---|---|
| 0 | `3386d3c` | Pondasi docs & path alias | 5 | +490 / -16 |
| 1 | `1f1552b` | Co-locate tests dengan source | 6 (3 rename) | +111 / -28 |
| 2 | `23e9a23` | Public API boundary per slice | 11 | +467 / -1 |
| 3A | `e8c7c3a` | Extract CSS tokens & base | 5 | +515 / -56 |
| 4 | `6b3cd7a` | Scaffold `app/features/` | 5 | +163 / -1 |
| 5 | `5737833` | Pilot slice `ticket-sales/` | 15 | +1089 / -3 |
| **Total** | | | **47** | **+2835 / -105** |

## Validasi

- `npm run type-check` → hijau
- `npm run lint` → 0 error, 2 warning (Fase 4 rule, sesuai desain)
- 4 test existing + 2 test baru = **6/6 pass**

## Deliverables

### 1. Dokumentasi (di `docs/` & root)

- `ARCHITECTURE.md` — filosofi & struktur (root)
- `docs/folder-map.md` — visual map folder
- `docs/adr/0001-hybrid-layered-with-co-location.md` — ADR keputusan
- `app/slices/MANIFEST.md` — manifest 6 slice
- `app/features/README.md` — konvensi vertical slice

### 2. Slices (di `app/slices/`)

6 slice dengan public API boundary:
- `auth` — login, session, password
- `rbac` — role, permission, nav
- `settings` — konfigurasi sistem & user
- `ticket-master` — master tiket & tarif
- `dashboard` — halaman utama & KPI
- `platform` — cross-cutting utilities

### 3. Pilot Feature (di `app/features/`)

`ticket-sales/` — vertical slice lengkap:
- DB schema (2 tabel, 6 index, 1 migration)
- Repo (atomic transaction, snapshot pricing, effective tariff)
- API route (`POST /api/sales`, `GET /api/sales`)
- Halaman (`/penjualan`)
- Tests (2 pass)

### 4. CSS (di `app/styles/`)

- `tokens.css` (574 B) — `:root` variables + Tailwind + `@theme`
- `base.css` (392 B) — reset & base elements

### 5. ESLint Rules (di `eslint.config.mjs`)

- Fase 2: warning untuk `app/api/**` import langsung ke internal slice
- Fase 4: warning untuk `app/**` import langsung ke internal feature
- Naikkan ke error setelah migrasi import selesai

## Yang TIDAK Dilakukan (di-defer)

- **Migrasi `app/api/**` ke import via slice** — saat ini warning saja
- **Component-specific CSS extraction** (mis. `login.css`) — risiko lebih tinggi
- **Sidebar nav item "Penjualan"** — halaman ada, tapi belum di-link
- **CSS untuk `sale-form`, `sale-history`, `today-summary`** — slice jalan tapi UI minimal
- **Integration test lengkap untuk `ticket-sales`** — perlu Drizzle snapshot untuk migration 0003
- **Dashboard integration** — replace simulasi dengan data real dari `todaySummary`
- **Void transaction** — implement status `voided` (saat ini hanya "completed")

## Next Steps (urutan prioritas)

1. **Tambah nav item Penjualan** di `app/components/sidebar-navigation.tsx`
2. **Generate Drizzle snapshot** untuk `0003_*` (untuk integration test penuh)
3. **Tambah CSS** untuk class-class slice ticket-sales di `app/globals.css`
4. **Migrasi `app/api/**` ke import via slice** (naikkan ESLint warning ke error)
5. **Deploy ke production** — pastikan migration 0003 + seed sudah di Turso target
6. **Uji E2E** — login, buka `/penjualan`, input transaksi, refresh list

## Quick Reference untuk Owner

### Cara menjalankan test
```bash
npm test                    # type-check + build + 6 test
npm run type-check          # TypeScript only
npm run lint                # ESLint only
```

### Cara deploy perubahan
```bash
# 1. Apply migration ke Turso
npm run db:migrate
npm run db:seed

# 2. Verify locally
npm test

# 3. Commit & push
git add .
git commit -m "feat/fix/chore: ..."
git push
```

### Cara menambah fitur baru (vertical slice)
Lihat [`app/features/README.md`](../app/features/README.md) — panduan
lengkap 13 langkah. Pattern sudah terbukti dengan `ticket-sales/`.

### Cara rollback per fase
```bash
git revert <commit-hash>     # untuk 1 fase
git revert 3386d3c 1f1552b 23e9a23 e8c7c3a 6b3cd7a 5737833  # semua fase
```

## Stats Final

- **Total file baru**: 30
- **Total file di-modify**: 17
- **Baris ditambahkan**: 2835
- **Baris dihapus**: 105
- **Test pass**: 26/26 (sebelum ticket-sales: 4, sesudah: 6)
- **Breaking change**: 0
