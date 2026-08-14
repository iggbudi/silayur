# Rencana Implementasi — Keuangan & Rekap Kas (Sprint 3)

> Dibuat: **13 Agustus 2026** · Author: agent · Reviewer: owner SILAYUR
> Workflow mengikuti [`AGENTS.md`](../AGENTS.md): kerjakan → test lokal → update docs → commit.
> Status: **Selesai diimplementasi** (13 Agustus 2026) — lihat `progress.md` & `app/features/finance/MANIFEST.md`.

## 1. Ringkasan

Melengkapi sisi **keuangan** yang saat ini baru mencatat pendapatan **tiket**. Tujuannya
menjadikan sistem satu sumber kebenaran **uang** yang utuh:

1. **Pemasukan non-tiket** — parkir, tenant, dan pemasukan lain.
2. **Pengeluaran** sederhana dengan persetujuan.
3. **Rekap kas shift** — buka/tutup shift, hitung selisih kas, verifikasi manajer.
4. **Dashboard** — "Pendapatan hari ini" menjadi **total**, panel komposisi pendapatan
   memakai data nyata.

Dibagi **3 fase** agar inkremental & aman (masing-masing selesai + teruji sendiri):

| Fase | Isi |
|---|---|
| **A** | Pemasukan non-tiket + dashboard total pendapatan |
| **B** | Pengeluaran + persetujuan |
| **C** | Rekap kas shift (buka/tutup + selisih + verifikasi) |

## 2. Kondisi Saat Ini

- `ConfigSectionKey` sudah punya section `revenue` (Sumber pendapatan) — config generik
  yang sudah editable di `/pengaturan` (list `name/detail/active`).
- `todaySummary()` (`ticket-sales`) hanya menghitung pendapatan **tiket** (tabel `sales`).
- Panel "komposisi pendapatan" di dashboard masih **hardcoded** (Parkir/Tenant/Lainnya).
- Nav sidebar "Keuangan" masih **tombol tanpa halaman** (`permission: finance`).
- Belum ada tabel/endpoint untuk pemasukan non-tiket, pengeluaran, maupun rekap kas.

## 3. Desain Solusi

### 3.1 Schema (migration baru `0006_checkpoint_15_finance`)

**`revenue_entries`** — pemasukan non-tiket:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | text PK | |
| `source_key` | text | key sumber (ref config item revenue, opsional) |
| `source_name` | text | snapshot nama sumber (mis. "Parkir") |
| `amount` | integer | Rupiah |
| `note` | text NOT NULL DEFAULT '' | |
| `entry_date` | text | tanggal WIB `YYYY-MM-DD` |
| `recorded_by` | text FK `users.id` | |
| `recorded_at` | text ISO UTC | |

**`expenses`** — pengeluaran:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | text PK | |
| `description` | text | |
| `amount` | integer | Rupiah |
| `note` | text NOT NULL DEFAULT '' | |
| `entry_date` | text | tanggal WIB |
| `recorded_by` | text FK `users.id` | |
| `recorded_at` | text ISO UTC | |
| `status` | enum `pending`/`approved`/`voided` | default `pending` |
| `approved_by` | text FK `users.id` (nullable) | |
| `approved_at` | text ISO UTC (nullable) | |

**`cash_sessions`** — rekap kas shift (satu shift aktif pada satu waktu):

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | text PK | |
| `opened_by` | text FK `users.id` | |
| `opened_at` | text ISO UTC | |
| `closed_by` | text FK `users.id` (nullable) | |
| `closed_at` | text ISO UTC (nullable) | |
| `declared_cash` | integer (nullable) | setoran kasir saat tutup |
| `system_cash` | integer (nullable) | dihitung sistem saat tutup |
| `difference` | integer (nullable) | `declared - system` |
| `status` | enum `open`/`closed` | |

Indeks untuk query per `entry_date`, `status`, dan `opened_at`.

### 3.2 Alur & RBAC

- `finance: view` — melihat pemasukan, pengeluaran, dan rekap kas.
- `finance: manage` — mencatat pemasukan/pengeluaran, buka/tutup shift, menyetujui pengeluaran.
- **`system_cash`** saat tutup shift = `(SUM sales completed + SUM revenue_entries) − SUM expenses approved`
  dalam rentang `[opened_at, closed_at]` — dihitung server-side (bukan input user).
- **`difference`** = `declared_cash − system_cash` (positif = kasir lebih, negatif = kurang).

### 3.3 Slice baru `app/features/finance/` (vertical slice)

Mengikuti pola `ticket-sales/`:

```
app/features/finance/
├── index.ts            # public API
├── MANIFEST.md
├── types.ts            # RevenueEntry, Expense, CashSession, FinanceSummary
├── repo.ts             # createRevenueEntry, listRevenueEntries, todayRevenueSummary,
│                       #   createExpense, approveExpense, listExpenses,
│                       #   openCashSession, closeCashSession, activeCashSession
├── api.ts              # client wrappers
├── components/         # RevenueForm, ExpenseForm, FinanceList, CashSessionPanel
└── __tests__/repo.test.ts
```

Repo `todayRevenueSummary` menggabungkan pendapatan **tiket** (query `sales`) dan
**non-tiket** (query `revenue_entries`) untuk satu tanggal WIB — dipakai dashboard.

### 3.4 API

- `GET /api/revenue?date=` + `POST /api/revenue`
- `GET /api/expenses?date=` + `POST /api/expenses` + `POST /api/expenses/approve` (body `{ id }`)
- `GET /api/cash-session` + `POST /api/cash-session/open` + `POST /api/cash-session/close` (body `{ declaredCash }`)
- `GET /api/finance/summary` — total pendapatan hari ini (tiket + non-tiket) untuk dashboard.

Semua thin handler mengikuti pola `app/api/sales/route.ts` (same-origin, auth, RBAC).

### 3.5 UI

- Halaman **`/keuangan`** — form pemasukan & pengeluaran, list harian, panel buka/tutup shift
  + hasil rekap (declared vs system vs selisih).
- Sidebar: "Keuangan" → `href="/keuangan"` (`permission: finance`).
- Dashboard `app/page.tsx`: KPI "Pendapatan hari ini" → total (via `/api/finance/summary`);
  panel komposisi pendapatan → breakdown nyata per sumber.

---

## 4. Keputusan Terbuka (perlu konfirmasi owner)

1. **Sumber pendapatan**: reuse `config_items` section `revenue` (rekomendasi) **vs** tabel
   master khusus `revenue_sources`. Rekomendasi: **reuse** (sudah editable di Pengaturan).
2. **Pengeluaran butuh persetujuan?** Rekomendasi: **ya** (status `pending` → `approved` oleh
   `finance: manage`), sesuai `plan.md` "Pengeluaran sederhana beserta persetujuan".
3. **Model shift**: satu shift aktif pada satu waktu (singleton) — rekomendasi: **ya** untuk MVP.
4. **"Pendapatan hari ini"** = **bruto** (tiket + non-tiket) atau netto (dikurangi pengeluaran)?
   Rekomendasi: **bruto**; pengeluaran tampil terpisah di modul keuangan.
5. **Void/koreksi** pemasukan non-tiket & pengeluaran: rekomendasi **defer** (mirip pola void
   sales bisa menyusul).

---

## 5. Scope & Non-scope

**Dalam scope (Sprint 3):**

- Migration 3 tabel (`revenue_entries`, `expenses`, `cash_sessions`).
- Slice `finance` (types, repo, api, komponen, test).
- Endpoint revenue, expenses, cash-session, finance-summary.
- Halaman `/keuangan` + nav sidebar.
- Dashboard total pendapatan + komposisi nyata. ✅ **Selesai 14 Agt 2026**:
  panel "Komposisi pendapatan" menampilkan breakdown per sumber real (tiket
  per produk + non-tiket per sumber) dari transaksi hari ini.

**Di luar scope (future):**

- Akuntansi penuh (jurnal, neraca, laba-rugi).
- Penggajian, inventaris, depresiasi.
- Rekonsiliasi otomatis ke bank.
- Laporan PPN/pajak.

---

## 6. Rencana Langkah Kerja (berurutan per fase)

**Fase A — Pemasukan non-tiket:**
1. `db/schema.ts` → tabel `revenue_entries`; `npm run db:generate` → `0006_*`.
2. `app/features/finance/` — types, repo (`createRevenueEntry`, `listRevenueEntries`,
   `todayRevenueSummary`), api, index.
3. `app/api/revenue/route.ts` + `app/api/finance/summary/route.ts`.
4. Halaman `/keuangan` (form pemasukan + list) + nav sidebar.
5. Dashboard: KPI "Pendapatan hari ini" → total; komposisi pendapatan nyata.
6. Test repo + API.

**Fase B — Pengeluaran:**
7. `db/schema.ts` → `expenses`; generate migration.
8. Repo `createExpense`, `approveExpense`, `listExpenses` + endpoint.
9. UI form & list pengeluaran + tombol setujui.

**Fase C — Rekap kas shift:**
10. `db/schema.ts` → `cash_sessions`; generate migration.
11. Repo `openCashSession`, `closeCashSession`, `activeCashSession` + endpoint.
12. UI panel buka/tutup shift + hasil rekap (declared/system/difference).
13. Docs akhir + commit.

---

## 7. Rencana Test

**Repo (`finance/__tests__/repo.test.ts`):**
- `createRevenueEntry` validasi amount > 0, tersimpan dengan snapshot source.
- `todayRevenueSummary` = tiket + non-tiket pada tanggal WIB tertentu.
- `createExpense` → `pending`; `approveExpense` → `approved`; approve selain pending → error.
- `closeCashSession`: `system_cash` = (tiket + non-tiket) − expenses; `difference` benar.
- Tutup shift saat tidak ada shift aktif → error; buka saat sudah ada yang aktif → error.

**API (`app/api/__tests__/`):**
- Anonymous → 401; role tanpa `finance` → 403.
- `finance: view` hanya bisa baca; `finance: manage` bisa tulis & tutup shift.
- `GET /api/finance/summary` mengembalikan total untuk tanggal WIB.

---

## 8. Definition of Done

- [ ] `npm run type-check` & `npm run lint` hijau (tanpa warning/error baru).
- [ ] `npm test` hijau (termasuk test finance baru).
- [ ] Migration `0006_*` ter-generate & ter-track.
- [ ] Docs sinkron: `MANIFEST.md` finance + `progress.md`.
- [ ] Commit conventional commits per fase.
- [ ] **Tidak** menyentuh Turso remote / Sites tanpa otorisasi.

---

## 9. Risiko & Catatan

- **Risiko sedang** — fitur lebih besar dari void; mitigasi dengan 3 fase inkremental.
- `system_cash` dihitung **server-side** dari transaksi (bukan input user) — konsisten
  dengan prinsip "satu sumber kebenaran" (`plan.md`).
- Sumber pendapatan reuse `config_items` agar tidak duplikasi master data.
- Perhatikan **boundary tanggal WIB** (`shared/date.ts`) untuk `entry_date` & ringkasan,
  konsisten dengan `ticket-sales`.
- KPI dashboard berubah dari "pendapatan tiket" menjadi "total" — perlu konfirmasi owner
  (keputusan #4) agar tidak salah interpretasi.