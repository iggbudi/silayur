# MANIFEST — Slice `app/features/holidays/`

## Tanggung jawab

Kalender hari libur khusus untuk penentuan tarif tiket: tanggal libur yang
jatuh pada hari kerja (weekday) memakai tarif akhir pekan. Dikelola di
Pengaturan → Hari libur (RBAC `settings` manage).

## Asumsi bisnis

- **Tarif libur** = tarif weekend. Tanggal di `holidays` membuat
  `dayTypeForWithHolidays` mengembalikan `weekend` meski bukan Sabtu/Minggu.
- **Satu baris per tanggal** (unique `date`); upsert memperbarui nama.
- **Server adalah sumber kebenaran harga**: `priceSale` (ticket-sales)
  membaca `holidays` saat menentukan tarif. Preview client (`SaleForm`)
  memakai endpoint ini agar konsisten.
- **RBAC**: baca & tulis = `settings` manage (dikelola di Pengaturan).

## Anggota slice

| File | Peran |
|------|-------|
| `types.ts` | Tipe domain (Holiday, HolidayInput). |
| `repo.ts` | `listHolidays`, `listHolidayDates`, `upsertHoliday`, `deleteHoliday`. |
| `api.ts` | Client wrapper: `listHolidays`, `createHoliday`, `removeHoliday`. |
| `index.ts` | Public API (satu-satunya pintu impor dari luar). |
| `__tests__/repo.test.ts` | Test logic-level (validasi, upsert, delete). |

## Wire-up eksternal

- Tabel: `db/schema.ts` → `holidays` + migration
  `drizzle/0010_checkpoint_19_holidays.sql`.
- Route: `app/api/holidays/route.ts` (GET/POST/DELETE, RBAC settings manage).
- Penentuan tarif: `shared/date.ts` (`dayTypeForWithHolidays`,
  `effectivePriceFor` + parameter holiday) dan `priceSale` di
  `app/features/ticket-sales/repo.ts`.
- Preview client: `SaleForm` (ticket-sales) fetch `listHolidays`.
- UI: Pengaturan → section "Hari libur" (`app/pengaturan/page.tsx`).

## Status implementasi

- [x] Schema + migration 0010 (lokal; rollout remote menunggu otorisasi).
- [x] Slice lengkap (types, repo, api, index) + test logic-level.
- [x] Route + RBAC + UI Pengaturan + wire `priceSale` & `SaleForm`.
- [x] Seed libur nasional Indonesia 2026 (`db:seed-holidays`, idempotent) —
      15 Agt 2026; daftar tahun berikutnya ditambah di script.
