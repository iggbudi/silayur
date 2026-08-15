# Asesmen Fitur, Layout UI, dan UX — SILAYUR Dashboard

> Penilaian atas fitur yang **sudah tersedia** saat ini, ditinjau dari sisi
> kelengkapan fitur, layout UI, dan kemudahan dipahami tiap role.
> Data acuan: halaman `app/page.tsx`, `app/penjualan`, `app/keuangan`,
> `app/pengaturan`, komponen `sidebar-navigation`, `shared/access.ts`,
> `db/seed-data.json`, dan manifes slice `ticket-sales` + `finance`.

---

## 1. Ringkasan

Sistem tersusun dari **3 alur fungsional yang sudah hidup** dan beberapa yang
**masih dekoratif (belum terhubung DB)**:

| Modul | Status | Halaman |
|---|---|---|
| **Penjualan Tiket** (ticket-sales) | ✅ Fungsional penuh (form, riwayat, summary, void) | `/penjualan` |
| **Keuangan** (finance) | ✅ Fungsional (pemasukan, pengeluaran+approval, shift kas) | `/keuangan` |
| **Dashboard** | ✅ Sebagian besar real (KPI tiket, keuangan, fasilitas, komplain, operasional) | `/` |
| **Operasional** (operations) | ✅ Fungsional (checklist buka-tutup harian + jadwal) — selesai 15 Agt 2026 | `/operasional` |
| **Fasilitas** (facilities) | ✅ Fungsional (status harian) — selesai 14 Agt 2026 | `/fasilitas` |
| **Komplain** (complaints) | ✅ Fungsional (alur open → resolved) — selesai 14 Agt 2026 | `/complaints` |
| **Pengaturan** (settings) | ✅ Fungsional (role/permission/pengguna/master tiket/tarif) | `/pengaturan` |

---

## 2. Penilaian Per Halaman

### 2.1 `/penjualan` — Penjualan Tiket (Sprint terkuat)
**Bagus:**
- Form per produk dengan input kuantitas + pilihan tanggal kunjungan dan
  **preview harga** sebelum submit (mencerminkan server via `effectivePriceFor`).
- **Snapshot pricing** di `sale_items` → history aman dari perubahan master.
- **Nota `RCP-YYYYMMDD-####`** atomik + anti-race via `receipt_counters`.
- **Alur void 2 langkah** (`void_pending` → approval + verifikasi password)
  mencegah petugas membatalkan seenaknya.

**Kekurangan / risiko UX:**
- Void menggunakan `window.prompt()` untuk alasan & password → **UX kasar**,
  tidak ada form dialog yang rapi, rawan salah ketik password saat demo.
- Tidak ada **koreksi jumlah** selain lewat void.
- Tidak ada **riwayat lintas tanggal** (hanya "hari ini"). "Atasan" sulit melihat
  tren mingguan dari sini.

### 2.2 `/keuangan` — Keuangan
**Bagus:**
- Ringkasan total = tiket + non-tiket; dua kolom breakdown.
- Pemasukan non-tiket memakai sumber dari `config_items.revenue`
  (konsisten dengan `/pengaturan`).
- Pengeluaran berstatus `pending → approved`; approval hanya oleh `finance: manage`.
- Rekap shift: satu shift aktif, `system_cash` dihitung server, `difference` jelas.

**Kekurangan / risiko UX:**
- Input memakai `window.prompt()` / field polos tanpa validasi langsung, dan
  `handleCloseShift` memakai `prompt` untuk nominal setoran → rawan salah input
  saat demo.
- **Tidak ada void/koreksi** pemasukan & pengeluaran (deferred) — bila salah
  catat, tidak bisa dibatalkan.
- Tidak ada **filter/riwayat lintas hari** — hanya "hari ini" (`todayIsoDate`).
- Tidak menampilkan **agregat per sumber pendapatan** (hanya daftar flat).

### 2.3 `/` — Dashboard
**Bagus:**
- KPI **Pendapatan hari ini** digabung tiket+non-tiket (data asli dari API).
- Kehadiran **MetricCard**, sidebar role-based, dan catatan sesi.

**Kekurangan / risiko UX (PENTING):**
- Banyak data **hardcoded dekoratif**: `facilityRows`, `complaintRows`, baris
  "revenue per sumber" (Parkir/Tenant/Lainnya), label "Diperbarui 10 menit lalu",
  dan "Komplain terbaru" **bukan** dari DB → **menyesatkan** saat demo, karena
  tampak data nyata padahal statis. Atasan bisa salah menilai.
- KPI pengunjung/fasilitas/komplain **belum komputerisasi** (masih placeholder).

### 2.4 `/pengaturan` — Pengaturan
- RBAC (role ↔ module ↔ access), pengguna, master tiket & tarif efektif, jam
  operasional, fasilitas, sumber pendapatan — semuanya termanajemen via DB.
- Kuat & konsisten secara arsitektur.

---

## 3. Kecukupan Role (RBAC) — Pemetaan Akses

Role di DB: `super_admin`, `manager`, `supervisor`, `ticket_officer`,
`finance_officer`, `field_officer`, `customer_service`, `viewer`.

| Role | Akses kunci (seed) | Cukup? |
|---|---|---|
| **super_admin / manager** | semua = manage | ✅ |
| **supervisor** | dashboard view, ops/facilities manage, visitors/finance view | ✅ wajar |
| **ticket_officer** | visitors manage | ✅ |
| **finance_officer** | finance manage | ✅ (sementara) |
| **field_officer** | ops/facilities manage, complaints view | ✅ (feature belum ada) |
| **customer_service** | complaints & facilities manage | ✅ (feature belum ada) |
| **viewer** | dashboard + reports view | ⚠️ **tidak lihat penjualan/keuangan** |

**Catatan penting untuk demo:**
1. **Hanya 4 user yang di-seed** (`admin.resepsionis`, `manajer.operasional`,
   `siti.tiket`, `pimpinan.viewer`) dari 8 role. Belum ada user bertindak sebagai
   `finance_officer`, `supervisor`, `field_officer`, `customer_service` — padahal
   perannya sudah didefinisikan. **Ini gap utilitas RBAC.**
2. **Role `viewer` = `visitors:none`, `finance:none`** → "Pimpinan/pemilik"
   ber-role viewer **tidak bisa membuka `/penjualan` maupun `/keuangan`**, hanya
   dashboard + laporan. Untuk maksud "atasan melihat isi operasional," role
   **manager** lebih cocok (semua manage).

---

## 4. Gap Data / Seed yang Terlihat

- **Tarif anak belum di-seed** → tiket anak tidak bisa dijual lewat flow normal.
- **Tarif weekend dewasa `active:false`** di seed → akhir pekan akan gagal
  ("Tarif weekend belum dikonfigurasi") padahal weekend = momen ramai.
- **Tidak ada kalender hari libur** (weekend dipakai untuk semua hari libur) —
  sudah ditandai TODO di MANIFEST.
- Data demo tiket anak memakai **snapshot harga eksplisit** (nilai tidak cocok
  dengan master tarif), sehingga merupakan trade-off demo saja.

---

## 5. Rekomendasi Prioritas (agar "terlihat bekerja" & mudah dipahami atasan)

1. **Bersihkan data hardcoded di Dashboard** → ganti placeholder fasilitas &
   komplain dengan data DB, atau sembunyikan sampai fitur dibuat (hindari
   menyesatkan saat demo). ✅ **Sebagian selesai 14 Agt 2026**: panel
   "Komposisi pendapatan" kini real per sumber (tiket per produk + non-tiket
   per sumber), tanggal topbar dinamis WIB, badge notifikasi palsu dihapus,
   dan kartu KPI operasional/fasilitas/komplain menampilkan "—" / "Modul
   belum tersedia" (jujur, tidak lagi angka palsu). ✅ **Komplain selesai
   14 Agt 2026**: panel "Komplain terbaru" + KPI "Komplain terbuka" kini
   data nyata dari modul `/complaints`. ✅ **Fasilitas selesai 14 Agt 2026**:
   donut "Status operasional" + panel "Kesiapan fasilitas" + KPI fasilitas
   kini data nyata dari modul `/fasilitas` (status harian). ✅ **Operasional
   selesai 15 Agt 2026**: KPI "Status operasional" + halaman `/operasional`
   (checklist buka-tutup harian, sumber item dari Pengaturan → Jam
   operasional).
2. **Ganti semua `window.prompt()`** dengan modal/form dialog yang proper
   (void reason, void password, close shift declared cash, dst.).
   ✅ **Selesai 15 Agt 2026**: void penjualan kini pakai modal proper
   (`app/penjualan/page.tsx`) + setor kas sudah modal sejak 14 Agt 2026.
3. **(Urgent) Lengkapi tarif**: seed tarif anak + aktifkan tarif weekend, atau
   tambahkan kalender hari libur. ✅ **Kalender hari libur selesai 15 Agt 2026**:
   section "Hari libur" di Pengaturan — tanggal libur memakai tarif weekend
   (`priceSale` + preview client konsisten). Seed tarif anak & aktivasi
   weekend tersedia via `db:seed-demo-extras`.
4. **Seed user untuk semua role** yang ingin didemokan (setidaknya
   `finance_officer`, `supervisor`) agar RBAC bisa benar-benar diuji.
5. **Tambah riwayat/filter lintas tanggal** untuk penjualan & keuangan agar
   atasan dapat melihat tren, bukan hanya "hari ini". ✅ **Selesai 14 Agt 2026**:
   halaman `/laporan` (slice `app/features/reports/`) — rekap rentang tanggal
   (penjualan, pemasukan non-tiket, pengeluaran, sesi kas) + rincian per hari.
6. **Sediakan void/koreksi** untuk pemasukan & pengeluaran.
7. Pertimbangkan role **viewer/owner** agar diberi akses view penjualan &
   keuangan bila tujuannya untuk atasan melihat data.

---

## 6. Catatan Keamanan & Edukasi (nilai tambah)

- Kontrol akses server-side (`assertCan*`) & sesi cookie **HttpOnly** sudah
  diterapkan dengan benar (identitas header client tidak dipercaya).
- Void approval menuntut **verifikasi password** → bagus.
- Perlu dipastikan **tidak ada route yang hanya cek auth tanpa RBAC** (pernah
  terjadi di `app/api/sales` — sudah diperbaiki).