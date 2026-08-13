# Tarif Activation Runbook — Master Tiket Masuk

> **Tujuan**: memandu owner mengaktifkan **tarif operasional** untuk tiket
> Dewasa dan Anak (weekday + weekend) sehingga slice `ticket-sales/`
> bisa menerima transaksi nyata.
>
> **Status saat dokumen ini ditulis (29 Juli 2026)**:
> - Schema CP11 (ticket_products, ticket_prices) sudah ter-rollout ke Turso remote ✅
> - Seed sudah include 2 produk (Dewasa `TKT-DEWASA`, Anak `TKT-ANAK`) ✅
> - Seed include 1 tarif aktif: Dewasa weekday `Rp 15.000` (mulai 2026-07-25)
> - Seed include 1 tarif non-aktif: Dewasa weekend `Rp 20.000` (menunggu konfirmasi)
> - **Tarif Anak BELUM ada** — perlu diinput manual oleh owner
> - **Tarif Dewasa weekend perlu diaktifkan** (toggle dari non-aktif ke aktif)
>
> **Asumsi bisnis** (per `progress.md` Checkpoint 11):
> - Dewasa = usia 12 tahun ke atas
> - Anak = usia di bawah 12 tahun, **dipilih manual** oleh petugas (tidak ada validasi umur)
> - Hari libur nasional → tarif weekend
> - Harga disimpan sebagai **integer Rupiah**
> - Tidak ada batas maksimal tanggal ke depan, tidak ada reschedule setelah transaksi

---

## ⚠️ Prinsip

- **Snapshot pricing aktif** — setelah transaksi dibuat, harga di `sale_items`
  di-freeze. Perubahan tarif di kemudian hari **TIDAK** mempengaruhi transaksi lama.
- **Periode tarif tidak boleh overlap** untuk kombinasi (product, dayType) yang
  aktif pada tanggal yang sama. UI sudah validasi ini, tapi jika input via
  SQL/script, perhatikan dengan teliti.
- **Harga integer** — tidak ada decimal/koma. `Rp 15.000` → `15000`, bukan `15.0` atau `15000.00`.
- **Day type** hanya `weekday` atau `weekend`. Tidak ada `holiday` (lihat TODO).
- **Tidak ada** "tarif per tanggal spesifik" — semua hari yang termasuk weekend
  (Sabtu/Minggu) otomatis pakai tarif weekend. Hari libur mengikuti tarif weekend.

---

## 📊 Referensi Harga (WAJIB Dikonfirmasi Owner)

Harga di bawah adalah **default seed**, bukan harga final. Owner **HARUS**
konfirmasi harga aktual sebelum aktivasi.

### Tabel Referensi

| Produk | Kategori | Day Type | Harga Default Seed | Status Default | Action |
|---|---|---|---|---|---|
| Tiket Dewasa | adult | weekday | Rp 15.000 | ✅ aktif | Pertahankan atau ubah |
| Tiket Dewasa | adult | weekend | Rp 20.000 | ❌ non-aktif | **Aktifkan** (toggle) |
| Tiket Anak | child | weekday | (belum ada) | — | **Input baru** |
| Tiket Anak | child | weekend | (belum ada) | — | **Input baru** |

### Pertanyaan yang Harus Dijawab Owner

1. **Berapa harga final Dewasa weekday?** (saat ini 15.000)
2. **Berapa harga final Dewasa weekend?** (saat ini 20.000, non-aktif)
3. **Berapa harga final Anak weekday?**
4. **Berapa harga final Anak weekend?**
5. **Apakah harga berlaku mulai hari ini**, atau tanggal khusus? (default: hari ini, 2026-07-25+)
6. **Berlaku sampai kapan?** (default: `null` = tidak ada batas, atau tanggal spesifik)

**Owner menjawab di sini sebelum menjalankan aktivasi:**

```
Dewasa weekday: Rp _______
Dewasa weekend: Rp _______
Berlaku sampai: YYYY-MM-DD atau "selamanya"
```

---

## 🚀 Langkah Aktivasi (Via UI)

### Prasyarat
- Login sebagai Super Admin (`admin.resepsionis` + password)
- Sidebar menampilkan menu **Pengaturan** (ikon ⚙)
- Akses `https://silayur-dashboard.cakilbiru.chatgpt.site/pengaturan`

### Step 1: Buka Master Tiket

1. Klik **Pengaturan** di sidebar
2. Pilih tab/accordion **"Tiket & Tarif"** (atau **"Master Tiket"**)
3. Expected: menampilkan 2 card produk — Tiket Dewasa & Tiket Anak

### Step 2: Verifikasi Produk Aktif

Untuk masing-masing produk:
- [ ] Tiket Dewasa (`TKT-DEWASA`) — pastikan badge **aktif** berwarna
- [ ] Tiket Anak (`TKT-ANAK`) — pastikan badge **aktif** berwarna

Jika non-aktif, klik tombol "Aktifkan" di card produk. Konfirmasi.

### Step 3: Cek Tarif Dewasa Weekday (sudah ada)

1. Expand/ klik card "Tiket Dewasa"
2. Lihat tabel "Riwayat Tarif"
3. Expected: ada 1 row aktif untuk `weekday` mulai `2026-07-25`, harga `15000`
4. **Jika harga perlu diubah**:
   - Klik "Edit" pada row tersebut
   - Ubah harga
   - Konfirmasi perubahan
5. **Jika harga sudah benar** → lewati ke step 4

### Step 4: Aktifkan Tarif Dewasa Weekend (toggle on)

1. Di card "Tiket Dewasa" → tabel "Riwayat Tarif"
2. Cari row `weekend` harga `20000` (saat ini **non-aktif**)
3. Klik tombol "Aktifkan" / toggle di row tersebut
4. **ATAU** jika ingin edit harga dulu:
   - Klik "Edit", ubah harga sesuai konfirmasi owner
   - Centang "Aktif"
   - Konfirmasi
5. Verifikasi: row weekend sekarang punya badge **aktif** berwarna

### Step 5: Tambah Tarif Anak Weekday

1. Expand card "Tiket Anak" (`TKT-ANAK`)
2. Klik tombol **"+ Tambah Tarif"**
3. Isi form:
   - **Tipe Hari**: Weekday
   - **Harga**: sesuai konfirmasi owner (integer Rupiah)
   - **Berlaku dari**: tanggal hari ini atau sesuai konfirmasi
   - **Berlaku sampai**: kosongkan (=selamanya) atau sesuai konfirmasi
   - **Status**: ✅ Aktif
4. Klik **Simpan**
5. Verifikasi: row baru muncul di tabel dengan badge aktif

### Step 6: Tambah Tarif Anak Weekend

1. Masih di card "Tiket Anak" → klik **"+ Tambah Tarif"**
2. Isi form:
   - **Tipe Hari**: Weekend
   - **Harga**: sesuai konfirmasi owner
   - **Berlaku dari**: tanggal hari ini atau sesuai konfirmasi
   - **Berlaku sampai**: kosongkan atau sesuai konfirmasi
   - **Status**: ✅ Aktif
3. Klik **Simpan**
4. Verifikasi: row baru muncul

### Step 7: Final Review

1. Muat ulang halaman (refresh browser)
2. Pastikan state:
   - [ ] 2 produk aktif
   - [ ] 4 tarif aktif (Dewasa weekday, Dewasa weekend, Anak weekday, Anak weekend)
   - [ ] Tidak ada tarif duplikat dengan periode overlap
3. Screenshot halaman ini untuk dokumentasi
3. Screenshot halaman ini untuk dokumentasi

---

## ✅ Verifikasi via API/DB

### A. Via db-check (read-only)
```bash
node --env-file=.env scripts/db-check.mjs
```

Expected output:
```json
{
  "counts": {
    "ticket_products": 2,
    "ticket_prices": 4,
    ...
  }
}
```

### B. Via Turso shell (read-only)
```bash
# Lihat semua tarif aktif
turso db shell silayur-nayantaka "SELECT tp.code, tp.name, tpr.day_type, tpr.price, tpr.valid_from, tpr.active FROM ticket_prices tpr JOIN ticket_products tp ON tp.id = tpr.ticket_product_id ORDER BY tp.code, tpr.day_type;"

# Hanya yang aktif
turso db shell silayur-nayantaka "SELECT tp.code, tpr.day_type, tpr.price FROM ticket_prices tpr JOIN ticket_products tp ON tp.id = tpr.ticket_product_id WHERE tpr.active = 1 AND tp.active = 1 ORDER BY tp.code, tpr.day_type;"
```

Expected:
```
TKT-ANAK   | weekday | <harga anak weekday>
TKT-ANAK   | weekend | <harga anak weekend>
TKT-DEWASA | weekday | <harga dewasa weekday>
TKT-DEWASA | weekend | <harga dewasa weekend>
```

### C. Test transaksi kecil

1. Login ke aplikasi
2. Buka `/penjualan`
3. Di form, pilih produk **Tiket Dewasa**, isi quantity `1`
4. Cek total di form: harusnya = harga Dewasa **weekday** (Rp 15.000 default, atau sesuai konfirmasi)
5. Klik "Catat Penjualan"
6. Expected:
   - Row baru muncul di history
   - Summary count naik jadi 1
   - Summary revenue naik jadi sesuai total
7. **Ubah system clock ke hari Sabtu**, refresh `/penjualan`
8. Cek total di form: harusnya = harga Dewasa **weekend**
9. (Atau: input 1 tiket lagi, cek di history — `unitPrice` dan `productName` harus ter-snapshot)

### D. Cek snapshot pricing

```bash
# Ambil transaksi terakhir
turso db shell silayur-nayantaka "SELECT si.product_name, si.unit_price, si.quantity, si.subtotal FROM sale_items si ORDER BY si.id DESC LIMIT 5;"
```

Expected: `unit_price` sesuai harga yang berlaku **saat transaksi dibuat**, BUKAN harga terbaru di master. Inilah inti dari snapshot pricing — history stabil meski master tarif berubah.

---

## 🔄 Rollback / Koreksi

### Salah input harga? (sebelum ada transaksi)
1. Buka `/pengaturan` → Tiket & Tarif
2. Klik "Nonaktifkan" pada row yang salah
3. Tambah row baru dengan harga benar
4. Refresh `/penjualan` → total form sudah benar

### Salah input harga? (setelah ada transaksi)
- **Jangan nonaktifkan row lama** — transaksi yang sudah dibuat akan kehilangan referensi harga.
- Cukup **tambah row baru** dengan harga benar dan tandai aktif. Row lama menjadi non-aktif, row baru yang berlaku.
- Transaksi lama **tetap pakai harga lama** (snapshot pricing), transaksi baru pakai harga baru.

### Ingin hapus row?
- UI tidak mengizinkan hapus row tarif (untuk audit trail).
- Jika perlu benar-benar hapus, gunakan `turso db shell` langsung:
  ```bash
  turso db shell silayur-nayantaka "DELETE FROM ticket_prices WHERE id = '<row-id>';"
  ```
  ⚠️ Hati-hati: ini akan membuat transaksi yang reference row tsb kehilangan link (meskipun snapshot di `sale_items` tetap valid).

---

## 📋 Checklist Aktivasi

Untuk tracking setelah aktivasi:

- [ ] Harga final dikonfirmasi owner
- [ ] Tiket Dewasa aktif (badge)
- [ ] Tiket Anak aktif (badge)
- [ ] Tarif Dewasa weekday aktif (verifikasi via UI)
- [ ] Tarif Dewasa weekend aktif (toggle on)
- [ ] Tarif Anak weekday ditambahkan & aktif
- [ ] Tarif Anak weekend ditambahkan & aktif
- [ ] db-check menunjukkan `ticket_prices: 4`
- [ ] db-check menunjukkan `ticket_products: 2`
- [ ] Test transaksi weekday berhasil
- [ ] Test transaksi weekend berhasil (via system clock)
- [ ] Snapshot pricing terverifikasi di `sale_items`
- [ ] Screenshot state master tiket diarsipkan

---

## 📝 Catatan Versi

- **v1** (29 Juli 2026) — initial runbook untuk aktivasi tarif
- Author: agent (Fase B)
- Reviewer: owner SILAYUR

## 🔗 Referensi

- `app/features/ticket-sales/MANIFEST.md` — aturan bisnis slice ticket-sales
- `progress.md` Checkpoint 11 — catatan implementasi master tiket
- `docs/DEPLOY-CHECKLIST.md` — runbook deployment
- `app/components/ticket-settings.tsx` — UI master tiket
- `db/ticket-repo.ts` — repo CRUD produk & tarif
- `drizzle/0002_checkpoint_11_ticket_master.sql` — migration schema


---

Anak weekday:   Rp _______
Anak weekend:   Rp _______
Berlaku dari:   YYYY-MM-DD
Berlaku sampai: YYYY-MM-DD atau "selamanya"
```

---
