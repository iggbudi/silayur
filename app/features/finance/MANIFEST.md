# `finance/` — Keuangan & Rekap Kas (Sprint 3)

> Slice untuk pencatatan **pemasukan non-tiket**, **pengeluaran**, dan **rekap kas
> shift**. Self-contained: types, repo, api, komponen, dan test di folder ini.
> Untuk konvensi vertical slice, lihat [`../README.md`](../README.md).

## Tanggung Jawab

Mencatat pemasukan di luar tiket (parkir, tenant, outbound, dll), mencatat
pengeluaran dengan persetujuan, dan merekonsiliasi kas melalui buka/tutup shift.

## Asumsi Bisnis

- **Pendapatan tiket** tetap dicatat di tabel `sales` (slice `ticket-sales`),
  **bukan** di sini. Tabel `revenue_entries` khusus pemasukan **non-tiket**.
- **Sumber pendapatan** memakai `config_items` section `revenue` (di `/pengaturan`).
- **Pengeluaran** berstatus `pending` → `approved` (oleh `finance: manage`).
- **Satu shift kas aktif** pada satu waktu (MVP).
- **`system_cash`** = (SUM tiket completed + SUM pemasukan non-tiket) − SUM
  pengeluaran `approved`, dihitung server-side dalam rentang `[opened_at, closed_at]`.
- **`difference`** = `declared_cash − system_cash` (positif = kas lebih).

## RBAC

- `finance: view` — melihat pemasukan, pengeluaran, ringkasan, dan status shift.
- `finance: manage` — mencatat pemasukan/pengeluaran, menyetujui pengeluaran,
  membuka/menutup shift.

Pengecekan server-side via `assertCanViewFinance` / `assertCanManageFinance`
(`db/config-repo.ts`).

## Anggota Slice

| File | Tanggung Jawab |
|---|---|
| `index.ts` | Public API (re-exports) |
| `types.ts` | `RevenueEntry`, `Expense`, `CashSession`, `FinanceSummary`, input types |
| `repo.ts` | `createRevenueEntry`, `listRevenueEntries`, `todayRevenueSummary`, `createExpense`, `approveExpense`, `listExpenses`, `openCashSession`, `closeCashSession`, `activeCashSession` |
| `api.ts` | Client wrapper (fetch) |
| `__tests__/repo.test.ts` | Logic test: pemasukan, ringkasan, pengeluaran, rekap kas |

## Wire-up (file di luar slice)

| File | Perubahan |
|---|---|
| `db/schema.ts` | Tambah tabel `revenue_entries`, `expenses`, `cash_sessions` |
| `drizzle/0006_checkpoint_15_finance.sql` | Migration: 3 tabel + index |
| `db/config-repo.ts` | `assertCanViewFinance` / `assertCanManageFinance` |
| `app/api/revenue/route.ts` | `GET` list, `POST` create |
| `app/api/expenses/route.ts` | `GET` list, `POST` create |
| `app/api/expenses/approve/route.ts` | `POST` approve |
| `app/api/cash-session/*` | `GET` status, `POST` open, `POST` close |
| `app/api/finance/summary/route.ts` | `GET` ringkasan pendapatan harian |
| `app/keuangan/page.tsx` | Halaman keuangan |
| `app/components/sidebar-navigation.tsx` | Nav item "Keuangan" → `/keuangan` |
| `app/page.tsx` | KPI "Pendapatan hari ini" → total (tiket + non-tiket) |

## Status Implementasi

- ✅ Schema & migration (3 tabel)
- ✅ Pemasukan non-tiket + ringkasan pendapatan
- ✅ Pengeluaran + persetujuan
- ✅ Rekap kas shift (buka/tutup + selisih)
- ✅ Dashboard KPI "Pendapatan hari ini" → total
- ✅ Nav sidebar "Keuangan"
- ⏳ Void/koreksi pemasukan & pengeluaran (deferred)
- ⏳ Laporan/rekap berkala (future)

## Test

```bash
npm test   # finance: 3 test (2 repo + 1 API)
```
