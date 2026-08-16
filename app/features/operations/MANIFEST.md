# MANIFEST — Slice `app/features/operations/`

## Tanggung jawab

Checklist operasional harian (buka/tutup): daftar tugas nyata dikelompokkan
per tahap **Persiapan buka** / **Penutupan**, menandai status per hari kalender
WIB, dan menyediakan ringkasan progress untuk halaman `/operasional` dan dashboard.

## Asumsi bisnis

- **Sumber checklist** = `config_items` section `hours` yang `active`; item
  nonaktif tidak ditampilkan dan tidak bisa ditandai. Setiap item aktif wajib
  punya `phase` (`buka` / `tutup`) agar bisa dikelompokkan.
- **Tugas harian vs jam buka dipisah**: section `hours` berisi tugas harian
  nyata (mis. "Siapkan uang kembalian loket"); jam buka taman berasal dari
  section `operating-hours` dan hanya ditampilkan sebagai baris info di
  halaman `/operasional` — bukan bagian dari checklist.
- **Status per hari** = satu baris per `(checklistId, date)` di
  `operations_checklist` (upsert). Belum dicatat hari ini → `done: false`.
- **Progress** = `doneCount / totalCount` item aktif pada tanggal itu, dengan
  sub-progress per tahap (`groups`).
- **RBAC**: view = `operations` ≥ view; catat/ubah = `operations` = manage.
- **Tanggal**: `date` = WIB `YYYY-MM-DD`; `recordedAt` = ISO UTC.

## Anggota slice

| File | Peran |
|------|-------|
| `types.ts` | Tipe domain (item, input, status). |
| `repo.ts` | `listOperationsChecklist`, `upsertOperationsChecklist`, `operationsStatus`. |
| `api.ts` | Client wrapper: `operationsStatus`, `setOperationsChecklist`. |
| `index.ts` | Public API (satu-satunya pintu impor dari luar). |
| `__tests__/repo.test.ts` | Test logic-level (upsert, list, summary). |

## Wire-up eksternal

- Tabel: `db/schema.ts` → `config_items` (section `hours`, kolom `phase`) +
  `operations_checklist` (status per hari). Migration `drizzle/0004_*` menambah
  kolom `phase` dan menonaktifkan item hours placeholder lama.
- RBAC: `assertCanViewOperations` / `assertCanManageOperations`
  (`db/config-repo.ts`).
- Route: `app/api/operations/route.ts` (GET status, POST upsert).
- Halaman: `app/operasional/page.tsx`; nav "Operasional"
  (`sidebar-navigation.tsx`).
- Dashboard: KPI "Status operasional" di `app/page.tsx` memakai
  `operationsStatus`.

## Status implementasi

- [x] Schema + migration 0009 (lokal; rollout remote menunggu otorisasi).
- [x] Slice lengkap (types, repo, api, index) + test logic-level.
- [x] Route + RBAC + halaman + nav + wire dashboard.
- [x] Daftar tugas harian sungguhan (tahap buka/tutup) + pengelompokan per tahap.
- [ ] Pencatatan insiden/kendala operasional terpisah — future.
- [ ] Inspeksi/checklist rinci per fasilitas — future (modul Fasilitas).
