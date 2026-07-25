# Progress Pengembangan SILAYUR

Pembaruan terakhir: **25 Juli 2026** — sinkronisasi riwayat CP0B–CP8 dan
penyelesaian CP9 pada commit `545df0a`

## Status Saat Ini

- Implementasi dan verifikasi lokal: **selesai**
- Branch: `main`
- Commit implementasi terbaru: `545df0a` —
  `feat: harden auth and persist dashboard config`
- Rollout database CP9: **selesai**
- Environment produksi Sites: **sudah dikonfigurasi**
- Deployment Sites: **selesai**
- Production: `https://silayur-dashboard.cakilbiru.chatgpt.site`

## Aturan Status

- `[x]` Selesai dan sudah diverifikasi.
- `[~]` Sudah dibuat, masih membutuhkan verifikasi atau rollout.
- `[ ]` Belum dikerjakan.

## Fase 0 — Prototype dan Validasi Lokal

- [x] **Checkpoint 0B — Dashboard statis**
  - Struktur dashboard dan lima KPI awal.
  - Dashboard adaptif mengikuti modul aktif.
  - Disetujui pada 23 Juli 2026.

- [x] **Checkpoint 2 — Pengaturan Operasional**
  - Enam bagian konfigurasi awal.
  - Pencarian, tambah data sementara, dan aktivasi item.
  - Disetujui pada 23 Juli 2026.

- [x] **Checkpoint 3 — Persistence Modul Sistem**
  - Status lima modul disimpan di perangkat lokal pada prototype awal.
  - Dashboard dan Pengaturan membaca konfigurasi yang sama.
  - Digantikan secara fungsional oleh Checkpoint 8 dan 9.
  - Disetujui pada 24 Juli 2026.

- [x] **Checkpoint 4 — Akses Modul per Role**
  - Level akses `Tidak ada`, `Lihat`, dan `Kelola`.
  - Super Admin memiliki akses penuh yang terkunci.
  - Disetujui pada 23 Juli 2026.

- [x] **Checkpoint 5 — Pengguna dan Penetapan Role**
  - Tambah dan edit pengguna.
  - Satu role utama untuk setiap pengguna.
  - Aktifkan atau nonaktifkan pengguna.
  - Preview akses modul turunan.
  - Minimal satu Super Admin tetap aktif.
  - Disetujui pada 23 Juli 2026.

- [x] **Checkpoint 5A — Master Role Dinamis**
  - Tambah, edit, aktifkan, dan nonaktifkan role.
  - Role kustom yang belum dipakai dapat dihapus.
  - Role aktif menjadi sumber pilihan pada form pengguna.
  - Permission role dan data master awalnya tersimpan lokal, lalu dipindahkan
    ke database pada CP8.
  - Disetujui pada 23 Juli 2026.

- [x] **Checkpoint 6 — Sesi Lokal dan Enforce Permission**
  - Halaman `/login` memilih pengguna aktif tanpa kata sandi.
  - Sesi prototype disimpan di `localStorage`.
  - Menu, kartu KPI, panel, dan halaman Pengaturan mengikuti permission.
  - Digantikan oleh autentikasi dan sesi server-side pada Checkpoint 9.
  - Disetujui pada 24 Juli 2026.

## Fase 1 — Database dan Sinkronisasi

- [x] **Checkpoint 7 — Fondasi Turso/libSQL**
  - Schema awal: `modules`, `roles`, `role_permissions`, `users`, dan
    `schema_version`.
  - Driver `@libsql/client` dan Drizzle ORM.
  - Migration `drizzle/0000_checkpoint_7_foundation.sql`.
  - Script migrate, seed, check, setup, dan sinkronisasi development vars.
  - Database lokal default: `file:./.data/silayur.db`.
  - API health database.
  - Migration, seed, dan check CP7 pernah berhasil pada database Turso remote
    development.
  - Disetujui pada 24 Juli 2026.

- [x] **Checkpoint 8 — UI Sinkron ke Turso**
  - Database menjadi sumber kebenaran modul, role, permission, dan pengguna.
  - API konfigurasi, direktori login prototype, dan health database.
  - Login, dashboard, dan Pengaturan membaca atau menulis melalui API.
  - Build, test, dan smoke API CP8 berhasil.
  - Mekanisme sesi `localStorage` dan header identitas client pada CP8
    digantikan oleh Checkpoint 9.
  - Disetujui pada 24 Juli 2026.

## Fase 2 — Hardening dan Persistence

- [x] **Checkpoint 9 — Auth Server, RBAC, dan Persistence Operasional**
  - Login username/password dengan PBKDF2-SHA256 dan salt acak.
  - Parameter PBKDF2 disesuaikan dengan batas maksimum 100.000 iterasi pada
    runtime Workerd production.
  - Token sesi opaque dikirim melalui cookie `HttpOnly`, `SameSite=Lax`, dan
    `Secure` pada HTTPS.
  - Database hanya menyimpan hash token sesi.
  - Identitas dan permission ditentukan server-side; header identitas buatan
    client tidak dipercaya.
  - Proteksi same-origin untuk mutasi konfigurasi.
  - Persistence database untuk modul, role, permission, pengguna, tiket,
    tarif, jam operasional, fasilitas, wahana, dan sumber pendapatan.
  - Perubahan konfigurasi majemuk berjalan dalam transaksi atomik.
  - Seed tunggal, idempotent, dan tidak menimpa data operasional.
  - Shared domain model, hooks, dan komponen UI dirapikan.
  - Migration `drizzle/0001_checkpoint_9_secure_persistence.sql`.
  - Utilitas setup, pemeriksaan database, dan penggantian password.
  - Behavior tests untuk auth, RBAC, same-origin, transaksi, persistence,
    logout, health, migration, seed, dan SSR.
  - Dependensi diperbarui hingga `npm audit` melaporkan 0 kerentanan.
  - Selesai dan di-commit pada 25 Juli 2026 sebagai `545df0a`.

## Verifikasi Teknis Terakhir

Dijalankan pada snapshot yang menjadi commit `545df0a`:

- [x] TypeScript type-check
- [x] Vinext production build
- [x] 3 dari 3 behavior tests lulus
- [x] Lint tanpa warning
- [x] `npm audit` — 0 kerentanan
- [x] Staged diff check
- [x] Pemeriksaan credential pada file staged
- [x] Drizzle generate — tidak ada perubahan schema tambahan
- [x] Worktree bersih setelah commit implementasi
- [x] Smoke test production: halaman, login, config GET/PUT, health, logout,
  dan invalidasi sesi

## Status Database dan Deployment

- [x] Database file lokal mendukung migration, seed, integration test, dan
  persistence.
- [x] Fondasi CP7 pernah diuji pada Turso remote development.
- [x] Terapkan migration CP9 pada database Turso target.
- [x] Tetapkan password awal Super Admin pada database target.
- [x] Jalankan smoke test auth, config, persistence, dan health pada target.
- [x] Simpan versi dan deploy melalui Sites.
- [x] Verifikasi aplikasi production setelah deployment.

Schema, autentikasi, dan persistence CP9 sudah tersedia pada database Turso
target. Aplikasi CP9 sudah aktif melalui deployment Sites privat.

## Pekerjaan Produk yang Belum Dikerjakan

- [ ] Transaksi bisnis operasional, seperti penjualan tiket aktual.
- [ ] Dashboard dengan data transaksi nyata.
- [ ] Pelaporan dan rekonsiliasi berbasis transaksi aktual.

Transaksi database untuk menyimpan konfigurasi CP9 sudah selesai. Istilah
“transaksi bisnis operasional” di bagian ini merujuk pada pencatatan aktivitas
bisnis nyata, bukan atomic database transaction.

## Langkah Berikutnya

- [x] Commit pembaruan `progress.md`.
- [x] Push branch `main` ke source repository Sites.
- [x] Siapkan kredensial environment target tanpa memasukkannya ke repository.
- [x] Jalankan migration dan inisialisasi password CP9.
- [x] Lakukan smoke test target.
- [x] Deploy dan verifikasi production.

## Catatan Operasional

- `.env` dan `.dev.vars` tidak boleh di-commit.
- Gunakan `.env.example` hanya sebagai template tanpa credential.
- Setelah mengganti konfigurasi Turso, sinkronkan development vars dan restart
  development server.
- Jalankan perintah database dari direktori `dashboard`.
- Sumber kebenaran konfigurasi aplikasi adalah database.
- Sumber kebenaran autentikasi adalah sesi server-side, bukan `localStorage`.
