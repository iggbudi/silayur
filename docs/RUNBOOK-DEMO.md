# Runbook: Demo dengan Data Dummy (aman, tanpa menyentuh DB remote)

> ⚠️ **Dokumen era Turso (sebelum migrasi Postgres, dipertahankan sebagai
> catatan historis)**. Project sekarang memakai **PostgreSQL** via
> `DATABASE_URL`. Database "file lokal" `.data/*.db` (libSQL) **tidak dipakai
> lagi** — gunakan database Postgres lokal terpisah untuk demo (atur
> `DATABASE_URL` di `.env`), bukan remote/produksi.

Tujuan: mengisi **data contoh** (penjualan tiket, pemasukan non-tiket,
pengeluaran, rekap kas shift) ke **database file lokal** supaya fitur yang sudah
ada bisa langsung terlihat & diuji, sehingga atasan dapat menilai kecukupan.

> ⚠️ **Keamanan**: `.env` / `.dev.vars` di workstation ini menunjuk ke Turso
> **remote**. Script demo ini **menolak menulis ke remote** secara default
> (guard `SILAYUR_DEMO_ALLOW_REMOTE=1`). Gunakan **file lokal** untuk demo.

---

## A. Setup sekali (database demo lokal fresh)

Jalankan dari folder `dashboard/`. Karena `.env` menunjuk ke remote, kita
**override** `TURSO_DATABASE_URL` ke file lokal di tiap perintah; `.env` tidak
diedit.

```powershell
cd C:\dev\silayur\dashboard

# 1. Override DB ke file lokal demo
$env:TURSO_DATABASE_URL = 'file:./.data/demo-fresh.db'
$env:TURSO_AUTH_TOKEN    = ''

# 2. Migrasi schema (bikin tabel)
node scripts/db-migrate.mjs

# 3. Seed dasar (modul, role, permission, user, master tiket, tarif, config)
$env:SILAYUR_SEED_ADMIN_PASSWORD = 'DemoAdmin#2026'
$env:SILAYUR_SEED_DEFAULT_PASSWORD = 'silayur-demo'
node scripts/db-seed.mjs

# 4. Seed data demo (transaksi contoh)
node scripts/db-seed-demo.mjs

# 5. Seed pelengkap demo (tarif Anak, aktifkan Weekend, user semua role)
node scripts/db-seed-demo-extras.mjs
```

Hasil: 14 penjualan, 20 item tiket, 3 pemasukan non-tiket, 4 pengeluaran,
2 rekap kas, 8 user (semua role), 4 tarif aktif — semuanya di
`.data/demo-fresh.db` (ter-ignore git).

> ⚠️ **PENTING**: langkah 3 (seed dasar) **harus dijalankan dengan env
> password** (`SILAYUR_SEED_ADMIN_PASSWORD` / `SILAYUR_SEED_DEFAULT_PASSWORD`)
> pada DB yang baru dibuat, karena baris user hanya mengisi `password_hash`
> bila belum ada. Bila terlewat, login user seed dasar akan gagal.

### Database lokal alternatif
Ganti `file:./.data/demo-fresh.db` dengan `file:./.data/demo-silayur.db` bila
ingin memakai DB demo yang sudah ada. Baris `.env` **tidak diubah**.

---

## B. Menjalankan aplikasi agar memakai DB demo

Karena `node scripts/...` sudah mendukung override via env, cara paling mudah:

### Opsi 1 — Production standalone (paling stabil untuk demo)
```powershell
$env:TURSO_DATABASE_URL = 'file:./.data/demo-fresh.db'
$env:TURSO_AUTH_TOKEN    = ''
npm run build
node dist/standalone/server.js        # → http://localhost:3000
```

### Opsi 2 — Dev server (HMR)
```powershell
$env:TURSO_DATABASE_URL = 'file:./.data/demo-fresh.db'
$env:TURSO_AUTH_TOKEN    = ''
npm run dev               # → http://localhost:3001 (atau port lain)
```

> ⚠️ **Catatan teknis**: `vinext dev` menjalankan route API di dalam
> **Cloudflare Workers runtime (workerd)** yang hanya mendukung URL
> `libsql://` / `ws(s):` / `http(s):` — **bukan `file:`**. Dev server dengan
> DB file lokal akan gagal dengan `URL_SCHEME_NOT_SUPPORTED`. Untuk demo
> dengan DB file lokal, gunakan **Opsi 1 (standalone)**. Dev server hanya bisa
> dipakai bila `TURSO_DATABASE_URL` menunjuk Turso remote (`libsql://`).

> ⚠️ **Jangan menimpa `.env`/`.dev.vars` permanen** supaya konfigurasi remote
> tidak berubah. `dist/` hasil build di-ignore git; build ulang dengan env
> remote bila kembali ke pengembangan normal.

---

## C. Akun login demo

| Username | Password | Role | Bisa melihat |
|---|---|---|---|
| `admin.resepsionis` | `DemoAdmin#2026` | super_admin | semua |
| `manajer.operasional` | `silayur-demo` | manager | semua |
| `siti.tiket` | `silayur-demo` | ticket_officer | penjualan |
| `budi.keuangan` | `silayur-demo` | finance_officer | keuangan (manage) + penjualan (view) |
| `ratna.supervisor` | `silayur-demo` | supervisor | dashboard, operasional, fasilitas |
| `agus.lapangan` | `silayur-demo` | field_officer | operasional & fasilitas |
| `dewi.cs` | `silayur-demo` | customer_service | komplain & fasilitas |
| `pimpinan.viewer` | `silayur-demo` | viewer | dashboard + laporan saja |

> Gunakan **`manajer.operasional`** untuk demonstrasi ke atasan (melihat
> penjualan, keuangan, dashboard sekaligus).

---

## D. Idempotensi & hapus data demo

- Menjalankan `db-seed-demo` / `db-seed-demo-extras` berkali-kali **tidak
  menggandakan** data (memakai `ON CONFLICT DO NOTHING`).
- Untuk menghapus data demo dari DB lokal, jalankan:

  ```powershell
  $env:TURSO_DATABASE_URL='file:./.data/demo-fresh.db'
  node -e "const{createClient}=require('@libsql/client');const db=createClient({url:'file:'+process.argv[1]});(async()=>{for(const t of ['cash_sessions','expenses','revenue_entries','sale_items','sales'])await db.execute('DELETE FROM '+t+' WHERE id LIKE \'demo-%\'')})().then(()=>{console.log('ok')})" ".data/demo-fresh.db"
  ```

---

## E. Status perbaikan yang sudah dilakukan

- **Tarif Anak (weekday Rp 10.000, weekend Rp 12.000)** sudah di-seed aktif
  (script `db-seed-demo-extras`) → tiket anak bisa dijual lewat flow normal.
- **Tarif Weekend Dewasa (Rp 20.000)** sudah diaktifkan → akhir pekan tidak
  gagal.
- **User untuk semua 8 role** sudah di-seed → RBAC bisa benar-benar diuji.
- **Bug bundling native libsql diperbaiki** (`db/get-db.ts` memakai
  `createRequire` untuk memuat `@libsql/client` Node pada mode `file:`).
  Sebelumnya `dist/standalone` selalu memakai client web yang menolak `file:`
  → semua route API 503 saat dijalankan dengan DB file lokal.
- **Sisa rekomendasi asesmen** (belum dikerjakan): dashboard masih memakai
  data hardcoded (fasilitas & komplain), `window.prompt()` untuk void & tutup
  shift, dan riwayat lintas tanggal. Lihat `docs/ASESMEN-FITUR-UI-UX.md`.
