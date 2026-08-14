# MANIFEST — Slice `app/features/facilities/`

## Tanggung jawab

Status fasilitas harian: mencatat & menampilkan kondisi tiap fasilitas
(Beroperasi / Perlu cek / Ditutup) per hari kalender WIB. Menjadi sumber
data panel "Kesiapan fasilitas", donut "Status operasional", dan KPI
"Fasilitas aktif"/"Perlu perhatian" di dashboard.

## Asumsi bisnis

- **Sumber fasilitas** = `config_items` section `facilities` yang `active`;
  fasilitas nonaktif tidak ditampilkan.
- **Status per hari** = satu baris per `(facility_id, date)` di
  `facility_status` (upsert). Belum dicatat hari ini → default
  `operational`.
- **Status**: `operational` (Beroperasi), `needs_attention` (Perlu cek),
  `closed` (Ditutup).
- **RBAC**: view = `facilities` ≥ view; catat/ubah = `facilities` = manage.
- **Tanggal**: `date` = WIB `YYYY-MM-DD`; `recordedAt` = ISO UTC.

## Anggota slice

| File | Peran |
|------|-------|
| `types.ts` | Tipe domain (status, row, with-status, input, summary). |
| `repo.ts` | `upsertFacilityStatus`, `listFacilitiesWithStatus`, `facilityStatusSummary`. |
| `api.ts` | Client wrapper: `facilitySummary`, `setFacilityStatus`. |
| `index.ts` | Public API (satu-satunya pintu impor dari luar). |
| `__tests__/repo.test.ts` | Test logic-level (upsert, list, counts). |

## Wire-up eksternal

- Tabel: `db/schema.ts` → `facility_status` + migration
  `drizzle/0008_checkpoint_17_facilities.sql`.
- RBAC: `assertCanViewFacilities` / `assertCanManageFacilities`
  (`db/config-repo.ts`).
- Route: `app/api/facilities/route.ts` (GET summary),
  `app/api/facilities/status/route.ts` (POST upsert).
- Halaman: `app/fasilitas/page.tsx`; nav "Fasilitas" baru
  (`sidebar-navigation.tsx`).
- Dashboard: donut "Status operasional" + panel "Kesiapan fasilitas" +
  KPI di `app/page.tsx` memakai `facilitySummary`.

## Status implementasi

- [x] Schema + migration 0008 (lokal; rollout remote menunggu otorisasi).
- [x] Slice lengkap (types, repo, api, index) + test logic-level.
- [x] Route + RBAC + halaman + nav + wire dashboard.
- [ ] Riwayat status lintas hari (tabel terpisah / history) — future.
- [ ] Inspeksi/checklist rinci per fasilitas — future (modul Operasional).
