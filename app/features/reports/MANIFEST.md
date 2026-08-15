# MANIFEST — Slice `app/features/reports/`

## Tanggung jawab

Rekap operasional lintas tanggal: penjualan tiket, pemasukan non-tiket,
pengeluaran, dan sesi kas pada satu rentang tanggal kalender WIB. Menjadi
dasar halaman `/laporan` (nav "Laporan" yang sebelumnya dead link).

## Asumsi bisnis

- **Rentang tanggal** `from`/`to` = `YYYY-MM-DD` WIB, inklusif, maksimal
  366 hari (`from <= to`); diverifikasi di route.
- **Semantik waktu** konsisten dengan modul existing:
  - `sales.sold_at` (ISO UTC) difilter window UTC WIB (`localUtcRange`) dan
    dikelompokkan per hari WIB (`utcIsoToLocalDate`).
  - `revenue_entries.entry_date` / `expenses.entry_date` = string `YYYY-MM-DD`
    WIB, filter `between`.
- **Status penjualan**: `voided` dikecualikan dari count/visitors/revenue
  (sama seperti `todaySummary`), tapi dilaporkan terpisah di
  `sales.voidedCount` / `sales.voidedAmount`. `void_pending` tetap dihitung.
- **Status pengeluaran**: hanya `approved` masuk `approvedAmount` (sama seperti
  `computeSystemCash`); `pending` dihitung di `pendingCount`.
- **Sesi kas**: total `cashTotals` hanya dari sesi `closed`; sesi `open`
  dilaporkan via `openCount` dan tetap ada di daftar `sessions`.
- **Net kas per hari** = `ticketRevenue + otherRevenue − approvedExpenses`.

## Anggota slice

| File | Peran |
|------|-------|
| `types.ts` | Tipe domain laporan. |
| `repo.ts` | `rangeReport(db, from, to)` — 4 query paralel + agregasi di JS. |
| `api.ts` | Client wrapper: `reportSummary`, `fetchDaySales`, `fetchDayRevenue`, `fetchDayExpenses`. |
| `index.ts` | Public API (satu-satunya pintu impor dari luar). |
| `__tests__/repo.test.ts` | Test logic-level agregasi & boundary WIB. |

## Wire-up eksternal

- Route: `app/api/reports/route.ts` (thin handler, RBAC `assertCanViewReports`).
- Halaman: `app/laporan/page.tsx`.
- Nav: `app/components/sidebar-navigation.tsx` (item "Laporan" → `/laporan`).
- Permission: `reports` (sudah ada di `shared/config.ts` & seed).
- Rincian per hari memakai endpoint existing: `/api/sales?date=`,
  `/api/revenue?date=`, `/api/expenses?date=` (bukan API baru).

## Status implementasi

- [x] `rangeReport` — agregasi rentang (4 query paralel, grouping per hari WIB).
- [x] Test logic-level (voided, approved-only, boundary WIB, sesi open/closed).
- [x] Cetak / PDF — print-friendly (`window.print()` + CSS `@media print`,
      header cetak, sembunyikan UI) — 15 Agt 2026.
- [ ] Filter status eksplisit (mis. hanya voided) — belum dikerjakan.
