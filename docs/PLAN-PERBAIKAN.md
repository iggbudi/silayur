# Rencana Perbaikan — DIGITAMA Dashboard

> Dibuat: **29 Juli 2026** · Sumber: audit codebase (analisis agent).
> Workflow: setiap item dikerjakan mengikuti `AGENTS.md`
> (kerjakan → test lokal → update docs → commit).
> Item boleh dikerjakan paralel oleh beberapa agent hanya jika tidak
> menyentuh file yang sama (lihat kolom File).

---

## Ringkasan

7 item perbaikan hasil audit, dikelompokkan dalam 3 sprint berprioritas.
Semua item berakhir dengan: kode + test hijau (`type-check`, `lint`,
`npm test`), docs sinkron, dan **satu commit terpisah**.

## Prioritas & Status

| # | Prioritas | Item | Status |
|---|-----------|------|--------|
| 1 | P0 | RBAC di Sales API | ⏳ belum |
| 2 | P0 | Track migration 0002 (CP11) di git | ⏳ belum |
| 3 | P1 | Timezone Asia/Jakarta untuk "hari ini" | ⏳ belum |
| 4 | P1 | Receipt sequence bebas race condition | ⏳ belum |
| 5 | P1 | Preview harga client konsisten dengan server | ⏳ belum |
| 6 | P2 | Perkuat test `ticket-sales` + perbaiki glob runner | ⏳ belum |
| 7 | P2 | Konsistensi label checkpoint & cleanup kecil | ⏳ belum |

---

## Sprint 1 — Keamanan & Integritas (P0)

### 1. RBAC di Sales API

**Masalah**: `app/api/sales/route.ts` hanya memanggil `requireRequestUser()`
(autentikasi) tanpa cek akses modul `visitors`. UI menyembunyikan menu,
tapi **API POST/GET sales terbuka untuk semua user yang sudah login**,
berapa pun role-nya.

**Solusi**: tambah helper RBAC modul visitors mengikuti pola
`getSettingsAccess` / `assertCanViewSettings` / `assertCanManageSettings`
di `db/config-repo.ts`, lalu gunakan di route sales.

**File**:
- `db/config-repo.ts` — `getVisitorsAccess(db, userId)`,
  `assertCanViewVisitors(db, userId)`, `assertCanManageVisitors(db, userId)`.
- `app/api/sales/route.ts` — GET → `assertCanViewVisitors`;
  POST → lihat **Keputusan terbuka #1** (default: `assertCanViewVisitors`,
  konsisten dengan gating halaman penjualan yang memakai
  `canView(access.visitors)`).
- Test: `app/api/__tests__/sales-rbac.test.mjs` — user tanpa akses visitors
  mendapat 403 pada GET & POST.

**Verifikasi**: `npm test` hijau; smoke login sebagai role tanpa akses
visitors → POST sales 403.

**Risiko**: rendah. Keputusan level akses POST (view vs manage) adalah
keputusan bisnis — tanyakan owner jika ragu.

---

### 2. Track migration 0002 (CP11) di git

**Masalah**: `drizzle/0002_checkpoint_11_ticket_master.sql` +
`drizzle/meta/0002_snapshot.json` **belum di-track** (untracked), padahal
0003 sudah di-commit dan 0002 sudah di-rollout ke Turso remote. Repo baru
hasil clone akan kehilangan migration 0002 → state migrasi tidak konsisten.

**Solusi**: commit file yang hilang tanpa mengubah isinya.

**File**: `drizzle/0002_checkpoint_11_ticket_master.sql`,
`drizzle/meta/0002_snapshot.json`.

**Langkah**:
1. `git add` kedua file.
2. Commit: `chore(db): track CP11 ticket master migration`.

**Verifikasi**:
- `git ls-files drizzle/` memuat 0000–0003 + semua snapshot meta.
- Uji dari nol di DB lokal (file): `npm run db:migrate && npm run db:seed
  && npm run db:check` terhadap `.data/*.db` baru.

**Risiko**: rendah. Jangan edit isi SQL/snapshot pada item ini.

---

## Sprint 2 — Kebenaran Transaksi (P1)

### 3. Timezone Asia/Jakarta untuk pengelompokan "hari ini"

**Masalah**: semua tanggal memakai `new Date().toISOString()` (UTC).
Transaksi 01:00–06:59 WIB tercatat di hari UTC sebelumnya → salah hari pada
prefix receipt (`RCP-YYYYMMDD`), `visit_date`, dan filter "hari ini".

**Solusi**: buat helper tanggal lokal (Asia/Jakarta) sebagai single source,
dipakai server & client. Kolom waktu (`sold_at`, `created_at`) **tetap**
ISO UTC; hanya pengelompokan kalender yang memakai WIB.

**File**:
- `shared/date.ts` (baru):
  - `todayIsoDate()` → tanggal WIB `YYYY-MM-DD` (via
    `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" })`).
  - `isWeekend(dateIso)` & `dayTypeFor(dateIso)` — **dipindahkan** dari
    `app/features/ticket-sales/repo.ts` agar tidak duplikat.
  - `effectivePriceFor(product, dateIso)` → tarif aktif untuk dayType
    (dipakai item 5).
- Pemakai baru:
  - `app/features/ticket-sales/repo.ts` — `todayReceiptPrefix()`, default
    `visitDate`, default `todaySummary()`.
  - `app/api/sales/route.ts` — default `date` pada GET.
  - `app/penjualan/page.tsx` — default tanggal summary.
  - `app/features/ticket-sales/components/SaleForm.tsx` — preview (item 5).
- Test: `shared/__tests__/date.test.ts` — boundary WIB (01:00 WIB = hari
  yang sama dengan lokal, bukan UTC), deteksi weekend, tarif efektif.

**Verifikasi**: `npm test` hijau; smoke UI.

**Risiko**: sedang — mengubah perilaku laporan "hari ini" (perbaikan yang
diinginkan). Tidak perlu migrasi data (receipt dihitung live).

---

### 4. Receipt sequence bebas race condition

**Masalah**: `nextReceiptSequence()` memakai `count(*)+1` di dalam
transaksi. Dua petugas loket bertransaksi bersamaan → nomor receipt sama →
violation unique constraint → error 500.

**Solusi (direkomendasikan)**: tabel counter terdedikasi dengan upsert
inkremental atomik:

```sql
CREATE TABLE receipt_counters (
  counter_date TEXT PRIMARY KEY,   -- YYYY-MM-DD (lokal WIB)
  seq INTEGER NOT NULL
);
-- next:
INSERT INTO receipt_counters (counter_date, seq) VALUES (?, 1)
ON CONFLICT(counter_date) DO UPDATE SET seq = seq + 1
RETURNING seq;
```

Ditambah retry kecil pada `SQLITE_BUSY` bila perlu.

**File**:
- `db/schema.ts` — tabel `receiptCounters`.
- Migration baru: `npm run db:generate` →
  `drizzle/0004_checkpoint_13_receipt_counters.sql` (+ snapshot), di-commit
  bersama kode (lihat AGENTS.md).
- `app/features/ticket-sales/repo.ts` — ganti `nextReceiptSequence()`.
- Test: urutan receipt naik per hari; reset di hari baru; format
  `RCP-YYYYMMDD-####`.

**Verifikasi**: `npm test` hijau; uji transaksi berurutan cepat.

**Risiko**: sedang — migration baru; **jalankan hanya di DB lokal**;
rollout ke Turso remote menunggu otorisasi owner.

---

### 5. Preview harga client konsisten dengan server

**Masalah**: `SaleForm` menghitung total dari `p.prices.find(p => p.active)`
(tarif aktif pertama dalam array), sedangkan server memakai **tarif
efektif berdasarkan dayType** dari `visitDate`. Bila tarif weekday &
weekend sama-sama aktif, preview client di akhir pekan bisa menampilkan
harga weekday → total tampilan beda dari yang tersimpan.

**Solusi**: `SaleForm` memakai `effectivePriceFor(product, todayIsoDate())`
(helper dari item 3) dan menampilkan dayType yang sedang berlaku di label.

**File**: `app/features/ticket-sales/components/SaleForm.tsx`,
`shared/date.ts` (helper).

**Verifikasi**: manual — dua tarif aktif (weekday ≠ weekend), cek preview
di hari kerja vs akhir pekan; `npm test` hijau.

**Risiko**: rendah (UI-only).

---

## Sprint 3 — Kualitas & Konsistensi (P2)

### 6. Perkuat test `ticket-sales` + perbaiki glob runner

**Masalah**:
- `app/features/ticket-sales/__tests__/repo.test.ts` hanya mengecek
  signature (placeholder) — logika inti (effective tariff, weekend,
  snapshot pricing, receipt) tidak teruji.
- Glob `npm test` di `package.json` memakai `*.test.mjs`, sedangkan file
  test slice ber-ext `.ts` → kemungkinan **tidak pernah dijalankan**.

**Solusi**:
- Update `package.json` → tambah glob agar menjangkau `.test.ts`
  (mis. `"app/features/**/__tests__/*.test.ts"`).
- Tulis test logic-level memakai DB lokal sementara
  (`file::memory:` atau `.data/test-*.db`) dengan seed minimal:
  - `priceSale`: tarif efektif weekday/weekend, produk nonaktif, qty
    invalid, belum ada tarif → error.
  - `createSale`: format & kenaikan receipt, snapshot harga, total
    konsisten dengan `sale_items`, rollback saat gagal.
  - `listSalesByDate` / `todaySummary`: filter status & agregasi.

**File**: `package.json`, `app/features/ticket-sales/__tests__/*`,
kemungkinan helper `tests/test-utils.mjs` (buat DB temp).

**Verifikasi**: `npm test` benar-benar menjalankan test baru (jumlah test
naik) dan hijau.

**Risiko**: sedang — perlu setup DB test; jangan sentuh Turso remote.

---

### 7. Konsistensi label checkpoint & cleanup kecil

**Masalah**:
- Label `checkpoint: "9"` di login route (`app/api/auth/login/route.ts`)
  dan tipe `SessionBootstrap` (`app/lib/config-api.ts`), sementara config
  snapshot & health sudah `"11"` → membingungkan saat debugging.
- `app/lib/access.ts` hanya re-export 1 baris (opsional: merge).

**Solusi**:
- Samakan literal & tipe ke `"11"` di ketiga tempat.
- Opsional (bila tidak mengganggu): merge `app/lib/access.ts` ke
  `shared/access.ts` atau biarkan sebagai re-export tipis — pilih yang
  minim diff; jangan refactor besar di item ini.

**File**: `app/api/auth/login/route.ts`, `app/lib/config-api.ts`,
opsional `app/lib/access.ts` + pemakainya.

**Verifikasi**: `npm run type-check` & `npm test` hijau; smoke login.

**Risiko**: sangat rendah.

---

## Keputusan Terbuka (perlu konfirmasi owner)

1. **Level akses POST `/api/sales`**: `view` (rekomendasi — konsisten
   dengan gating UI saat ini, petugas loket cukup `visitors=view`) vs
   `manage` (lebih ketat, petugas perlu `visitors=manage`).
2. **Timezone**: konfirmasi semua pelaporan "hari ini" harus waktu
   **Asia/Jakarta** (rekomendasi: ya, item 3).
3. **Hari libur nasional** mengikuti tarif weekend — tetap manual
   (keputusan bisnis existing, tidak diubah di sprint ini).
4. **Dashboard KPI real dari tabel `sales`** (saat ini data simulasi
   hardcoded) — **di luar lingkup** sprint ini; proposal terpisah.

---

## Definition of Done (berlaku per item)

- [ ] `npm run type-check` hijau
- [ ] `npm run lint` hijau (tanpa warning/error baru)
- [ ] `npm test` hijau (termasuk test baru item terkait)
- [ ] Docs sinkron: `progress.md` + dokumen relevan di `docs/`
- [ ] Satu commit per item, pesan conventional commits
- [ ] Tidak menyentuh Turso remote / Sites tanpa otorisasi

## Status Tracker

| Sprint | Item | Commit | Verifikasi | Docs | Selesai |
|--------|------|--------|------------|------|---------|
| 1 | 1. RBAC sales | `fix(sales)` | type-check ✅ lint ✅ 5/5 test ✅ | progress.md ✅ | ✅ |
| 1 | 2. Track migration 0002 | `chore(db)` | — | progress.md ✅ | ✅ |
| 2 | 3. Timezone WIB | (lihat Sprint 2) | type-check ✅ lint ✅ 13/13 test ✅ | progress.md + MANIFEST ✅ | ✅ |
| 2 | 4. Receipt counter | (lihat Sprint 2) | 13/13 test ✅ + db:generate no-op ✅ | progress.md + MANIFEST ✅ | ✅ |
| 2 | 5. Preview harga | (lihat Sprint 2) | 13/13 test ✅ | progress.md + MANIFEST ✅ | ✅ |
| 3 | 6. Test ticket-sales | `test(sales)` | 17/17 test ✅ + boundary WIB fix | progress.md ✅ | ✅ |
| 3 | 7. Label checkpoint | `chore(auth)` | type-check ✅ 17/17 test ✅ | progress.md ✅ | ✅ |

## Catatan Pelaksanaan Sprint 3

- Saat menulis test filter hari, ditemukan bug boundary: `listSalesByDate` /
  `todaySummary` memfilter `sold_at` dengan rentang UTC dari tanggal WIB
  (transaksi 00:00–06:59 WIB hilang dari "hari ini"). Diperbaiki dengan
  `localDayUtcRange()` di `shared/date.ts`.
- Item 7: merge `app/lib/access.ts` sengaja di-defer (re-export tipis,
  tidak mengganggu); label checkpoint disamakan ke "11".

## Catatan Pelaksanaan Sprint 2

- Item 3, 4, dan 5 saling bergantung melalui `shared/date.ts` (helper
  tanggal dipakai receipt, filter harian, dan preview harga) — dikerjakan
  dan di-commit dalam satu unit Sprint 2.
- Defect pre-existing ditemukan & diperbaiki: `drizzle/meta/0003_snapshot.json`
  tidak pernah dibuat saat CP12; rantai snapshot 0002→0003→0004 disusun
  ulang dan `drizzle-kit generate` kembali no-op.
- Item 6 dikerjakan sebagian lebih awal (glob runner `*.test.ts` + test
  logic `shared/date` dan receipt) agar test Sprint 2 bisa dijalankan;
  sisa item 6 (coverage lebih dalam, mis. rollback & filter status) tetap
  dijadwalkan di Sprint 3.
| 2 | 3. Timezone WIB | — | — | — | ⏳ |
| 2 | 4. Receipt counter | — | — | — | ⏳ |
| 2 | 5. Preview harga | — | — | — | ⏳ |
| 3 | 6. Test ticket-sales | — | — | — | ⏳ |
| 3 | 7. Label checkpoint | — | — | — | ⏳ |
