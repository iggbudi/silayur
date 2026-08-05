# `ticket-sales/` — Transaksi Penjualan Tiket

> Slice untuk pencatatan transaksi penjualan tiket masuk di loket.
> Self-contained: schema DB, repo, API, UI, dan test semua di folder ini.
> Untuk konvensi vertical slice, lihat [`../README.md`](../README.md).
> Untuk filosofi arsitektur, lihat [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md).

## Tanggung Jawab

Mencatat satu transaksi penjualan tiket yang dilakukan oleh petugas loket,
menyimpan snapshot harga & nama produk, dan menyediakan ringkasan harian
(count & revenue) untuk dashboard.

## Asumsi Bisnis

- **Weekend = Sabtu & Minggu** (`dayTypeFor` di `repo.ts`).
- **Hari libur nasional** mengikuti tarif weekend (asumsi operasional,
  belum ada kalender hari libur — lihat "TODO" di bawah).
- **Kategori pengunjung** (`visitorCategory`) dipilih manual oleh petugas
  melalui produk di master tiket (Dewasa vs Anak). Tidak ada validasi umur
  otomatis.
- **Visit date** untuk transaksi hari ini = tanggal hari ini. Untuk
  penjualan di muka (advance sale), gunakan field `visitDate` yang
  ditentukan saat input.

## Format Receipt Number

`RCP-YYYYMMDD-####`

- `YYYYMMDD` = tanggal `soldAt` (UTC) dalam format ISO date.
- `####` = nomor urut 4 digit per hari, auto-increment.
- Sequence di-reset setiap hari (belum diimplementasi — saat ini hanya
  format display; increment di-handle oleh logic di repo. Lihat TODO.).

## Snapshot Pricing — Kenapa Penting

Di `sale_items` disimpan **versi beku** dari:

- `unitPrice` (harga satuan saat transaksi)
- `subtotal` (`unitPrice * quantity`)
- `productName` (nama produk saat transaksi)

**Alasan**: jika master tarif atau nama produk berubah setelah transaksi,
data history penjualan **tetap akurat** dan dapat diaudit tanpa terpengaruh
perubahan master. Lihat `repo.ts` `createSale()` dan `types.ts` `SaleItem`.

## Hari Libur & Tarif

Saat ini fitur kalender hari libur **belum ada**. Logika `dayTypeFor` hanya
membedakan weekday (Senin–Jumat) vs weekend (Sabtu/Minggu). Hari libur
nasional seperti Natal atau Tahun Baru otomatis jatuh ke tarif weekend.

**TODO**: tambah `holiday_calendar` table atau config item agar owner bisa
override `dayType` untuk tanggal tertentu.

## Edge Cases

| Situasi | Handling |
|---|---|
| `items` kosong saat submit | `priceSale()` throw `"Minimal satu item tiket wajib diisi."` (400) |
| Quantity <= 0 | `priceSale()` throw `"Quantity tidak valid: <id>"` (400) |
| Produk tidak ditemukan | `priceSale()` throw `"Produk tiket tidak ditemukan: <id>"` (400) |
| Produk non-aktif | `priceSale()` throw `"Produk tiket nonaktif: <name>"` (400) |
| Tarif belum dikonfigurasi untuk day type | `priceSale()` throw `"Tarif <dayType> untuk <name> belum dikonfigurasi."` (400) |
| Transaksi di luar hari ini (midnight rollover) | `todaySummary()` filter `soldAt` per hari UTC; sale baru tidak ikut summary jika tanggal berbeda |
| Status `voided` | Disimpan di kolom `status` tapi **tidak dihitung** di `todaySummary` |

## RBAC

Halaman `/penjualan` dan endpoint `POST /api/sales`, `GET /api/sales`
memerlukan **`access.visitors` minimal `view`**.

- `view` — boleh lihat summary, history, dan form
- `manage` — boleh submit transaksi baru

Pengecekan dilakukan server-side di `app/api/sales/route.ts` via
`requireRequestUser` + cek `canView(access.visitors)`.

## Anggota Slice

| File | Tanggung Jawab |
|---|---|
| `index.ts` | Public API — re-exports (wajib satu-satunya pintu impor dari luar) |
| `types.ts` | `Sale`, `SaleItem`, `SaleInput`, `SaleInputItem`, `PricedItem`, `SaleStatus` |
| `repo.ts` | `priceSale`, `createSale`, `loadSaleById`, `listSalesByDate`, `todaySummary` |
| `api.ts` | Client wrapper: `createSale`, `listTodaySales` |
| `components/SaleForm.tsx` | Form input tiket per produk |
| `components/SaleHistory.tsx` | List transaksi hari ini |
| `components/TodaySummary.tsx` | Ringkasan count & revenue |
| `__tests__/repo.test.ts` | Type & signature check (2 test) |

## Wire-up (file di luar slice)

| File | Perubahan |
|---|---|
| `db/schema.ts` | Tambah tabel `sales` & `sale_items` (+6 index) |
| `drizzle/0003_checkpoint_12_ticket_sales.sql` | Migration: 2 tabel, 6 index |
| `app/api/sales/route.ts` | Thin handler: `POST` create, `GET` list-by-date (import dari slice) |
| `app/penjualan/page.tsx` | Halaman: form + summary + history |
| `app/components/sidebar-navigation.tsx` | Nav item "Penjualan" (permission `visitors`) |

## Status Implementasi

- ✅ DB schema & migration
- ✅ `createSale` (atomic via `db.transaction()`)
- ✅ Snapshot pricing di `sale_items`
- ✅ `todaySummary` (count & revenue, exclude voided)
- ✅ `listSalesByDate`
- ✅ Halaman `/penjualan` dengan form + history
- ✅ Nav item di sidebar (lihat perubahan CP12+)
- ✅ Incremental summary update setelah sale baru
- ✅ Auto-increment receipt number harian via tabel `receipt_counters`
    (upsert atomik, bebas race saat transaksi konkuren — Sprint P1)
- ✅ Tanggal kalender "hari ini" memakai waktu lokal Asia/Jakarta
    (`shared/date.ts`), bukan UTC — receipt prefix & filter harian benar
- ✅ Preview harga di form memakai tarif efektif per day type
    (`effectivePriceFor`) — konsisten dengan server
- ⏳ Status `voided` — kolom sudah ada, **fitur void belum diimplementasi**
- ⏳ Integration test penuh — butuh Drizzle snapshot untuk `0003_*`
- ⏳ Kalender hari libur override

## Test

```bash
npm test                          # 13/13 pass (termasuk logic test pricing & receipt)
```

Test mencakup: validasi type & signature, logika tarif efektif per day type
(`shared/__tests__/date.test.ts`), dan integrasi `createSale` dengan
increment receipt atomik (`__tests__/repo.test.ts`).
