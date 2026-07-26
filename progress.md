# Progress Pengembangan SILAYUR

Pembaruan terakhir: **25 Juli 2026** — implementasi CP11 master tiket masuk
Dewasa/Anak dan rollout schema ke Turso remote

## Status Saat Ini

- Implementasi dan verifikasi lokal CP11: **selesai**
- Branch: `main`
- Commit production terbaru: `cbe872c` —
  `fix: improve dashboard typography readability`
- Rollout database CP11: **selesai**
- Password Super Admin pada Turso: **sudah diperbarui dan diuji lokal**
- Environment produksi Sites: **sudah dikonfigurasi**
- Deployment Sites CP10–CP11: **belum dilakukan**
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

## Fase 3 — Login Operasional dan Transisi Sesi

- [x] **Checkpoint 10 — Login Super Admin tanpa splash**
  - Password Super Admin `admin.resepsionis` diperbarui pada Turso remote dan
    login lokal berhasil dengan akses penuh.
  - Penggantian password berjalan atomik dan mencabut seluruh sesi lama.
  - Session bootstrap disimpan sementara di client agar navigasi Dashboard ↔
    Pengaturan tidak menampilkan splash login.
  - Logout langsung membuka formulir login tanpa menampilkan `SessionGate`.
  - Cache sesi diperbarui setelah perubahan modul, role, permission, atau user.
  - Peringatan browser `ResizeObserver` yang tidak fatal tidak lagi dianggap
    sebagai error aplikasi oleh overlay development vinext.
  - Label prototype/checkpoint di halaman login dan metadata aplikasi dihapus.
  - Regression test cache sesi dan reset password ditambahkan.
  - Sidebar Dashboard dan Pengaturan memakai navigasi penuh yang konsisten dan
    drawer mobile yang aksesibel.
  - Login langsung berpindah ke Dashboard tanpa hard refresh.
  - Implementasi lokal selesai; deployment menunggu.

## Fase 4 — Master Data Operasional

- [x] **Checkpoint 11 — Master Tiket Masuk dan Tarif Efektif**
  - Master tiket terstruktur menggantikan penggunaan `config_items` generik di
    UI Tiket & Tarif.
  - Dua kategori tetap: Dewasa (`TKT-DEWASA`) dan Anak (`TKT-ANAK`).
  - Anak berarti usia di bawah 12 tahun dan dipilih manual oleh petugas tanpa
    validasi umur otomatis.
  - Masa berlaku dapat diatur `same_day` atau `selected_date`; tidak ada batas
    maksimal tanggal ke depan dan tidak ada reschedule setelah transaksi.
  - Tarif dipisahkan menjadi weekday dan weekend; hari libur mengikuti tarif
    weekend.
  - Harga disimpan sebagai integer Rupiah dengan periode mulai/akhir, status,
    validasi tanggal, dan pencegahan periode aktif yang bertumpuk.
  - UI mendukung edit produk, aktivasi, tambah/edit tarif, periode berlaku, dan
    riwayat tarif.
  - Status aktif/nonaktif pada produk dan tarif diperjelas melalui badge, titik
    status, border, aksen warna, dan kontras kartu.
  - Konflik CSS yang membuat toggle status tampak putih sudah diperbaiki;
    toggle aktif kembali tampil ungu dan posisi knob mengikuti status.
  - Migration `drizzle/0002_checkpoint_11_ticket_master.sql` dan seed idempotent
    sudah diterapkan ke Turso remote.
  - Turso remote terverifikasi memiliki 2 produk tiket, 2 tarif awal, dan schema
    version 3.
  - Transaksi penjualan tiket belum dibuat pada checkpoint ini.

## Verifikasi Teknis Terakhir

Dijalankan pada worktree CP11:

- [x] TypeScript type-check
- [x] Vinext production build
- [x] 4 dari 4 behavior tests lulus
- [x] Lint tanpa warning
- [x] `npm audit` — 0 kerentanan
- [ ] Staged diff dan pemeriksaan credential sebelum commit CP11
- [x] Drizzle generate — migration CP11 dibuat dan sinkron dengan schema
- [x] Integration test migration, seed, auth, RBAC, dan persistence tiket
- [x] Smoke test lokal: login Super Admin serta GET/PUT konfigurasi CP11

## Status Database dan Deployment

- [x] Database file lokal mendukung migration, seed, integration test, dan
  persistence.
- [x] Fondasi CP7 pernah diuji pada Turso remote development.
- [x] Terapkan migration CP9 pada database Turso target.
- [x] Tetapkan password awal Super Admin pada database target.
- [x] Jalankan smoke test auth, config, persistence, dan health pada target.
- [x] Simpan versi dan deploy melalui Sites.
- [x] Verifikasi aplikasi production setelah deployment CP9.
- [x] Terapkan migration dan seed CP11 pada database Turso target.
- [x] Verifikasi master tiket CP11 melalui API lokal terhadap Turso remote.
- [ ] Deploy UI CP10–CP11 ke Sites.

Schema CP11 dan master tiket awal sudah tersedia pada database Turso target.
Aplikasi Sites masih menggunakan deployment UI sebelumnya sampai rollout
CP10–CP11 dilakukan.

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
- [x] Deploy dan verifikasi production CP9.
- [ ] Tetapkan tarif operasional untuk tiket Anak dan aktifkan tarif Weekend
  setelah dikonfirmasi.
- [ ] Deploy dan verifikasi production CP10–CP11.
- [ ] Implementasikan transaksi penjualan tiket masuk berdasarkan master CP11.
- [ ] Mulai mengganti data simulasi dashboard dengan transaksi operasional nyata.

## Catatan Operasional

- `.env` dan `.dev.vars` tidak boleh di-commit.
- Gunakan `.env.example` hanya sebagai template tanpa credential.
- Setelah mengganti konfigurasi Turso, sinkronkan development vars dan restart
  development server.
- Jalankan perintah database dari direktori `dashboard`.
- Sumber kebenaran konfigurasi aplikasi adalah database.
- Sumber kebenaran autentikasi adalah sesi server-side, bukan `localStorage`.

## Fondasi Arsitektur (Checkpoint 12 — Pekerjaan Arsitektur)

Disusun bertahap melalui 5 fase, lihat
[`ARCHITECTURE.md`](./ARCHITECTURE.md) dan
[`docs/adr/0001-hybrid-layered-with-co-location.md`](./docs/adr/0001-hybrid-layered-with-co-location.md).

- [x] **Fase 0 — Pondasi dokumentasi & path alias** (26 Juli 2026)
  - `ARCHITECTURE.md` menjelaskan filosofi hybrid (layered + co-located + slice).
  - `docs/folder-map.md` memetakan struktur folder & slice domain.
  - `docs/adr/0001-hybrid-layered-with-co-location.md` menjelaskan keputusan
    arsitektur & trade-off (Opsi A: pure vertical, B: pure layered, C: hybrid).
  - `tsconfig.json` menambah path alias `@shared/*`, `@db/*`, `@app/*`,
    `@features/*`, `@slices/*` (tanpa menghapus `@/*` yang sudah ada).
  - Validasi: type-check hijau, lint hijau, 4/4 behavior test pass.
  - Tidak ada perubahan kode aplikasi — hanya docs & config.
- [x] **Fase 1 — Co-locate tests** (26 Juli 2026)
  - 3 test dipindah ke folder `__tests__/` di sebelah source-nya:
    - `tests/db-foundation.test.mjs` → `db/__tests__/`
    - `tests/config-api.test.mjs` → `app/api/__tests__/`
    - `tests/session-cache.test.mjs` → `app/lib/__tests__/`
  - `tests/rendered-html.test.mjs` tetap di `tests/` (cross-slice, butuh `dist/`).
  - `tests/test-utils.mjs` tetap di `tests/` (shared util, dipakai semua test).
  - Import path internal di test di-update: `root` resolution naik 1–2 level, dan relative path dynamic `import()` disederhanakan.
  - `package.json` test script di-update untuk glob `**/__tests__/*.test.mjs`.
  - Validasi: 4/4 test pass di lokasi baru, type-check hijau, lint hijau.
- [x] **Fase 2 — Public API boundary per slice** (26 Juli 2026)
  - 6 slice dibuat di `app/slices/`: `auth`, `rbac`, `settings`, `ticket-master`, `dashboard`, `platform`.
  - Tiap slice punya `index.ts` sebagai public API (re-exports) + `MANIFEST.md` gabungan.
  - Tidak ada file yang dipindahkan dari lokasi aslinya. Hanya re-export via `index.ts`.
  - ESLint rule `no-restricted-syntax` ditambahkan untuk `app/api/**`: warning (bukan error) bila import langsung ke internal slice. Excludes file infrastruktur (`db/get-db`, `db/http`, `db/schema`, dll).
  - 8 warning terdeteksi di 4 file API route (semua import via `db/auth-repo`, `db/config-repo`, `db/ticket-repo`, `shared/access`).
  - `ARCHITECTURE.md` di-update dengan aturan boundary slice.
  - Validasi: type-check hijau, lint 0 error (8 warning), 4/4 test pass.
- [x] **Fase 3A — Extract CSS tokens & base** (26 Juli 2026)
  - Extract :root CSS variables + @theme inline ke app/styles/tokens.css (574 bytes).
  - Extract reset/base (*, html, body, button, button:focus-visible) ke app/styles/base.css (392 bytes).
  - app/globals.css sekarang hanya berisi component classes (58 KB, turun dari 58.6 KB).
  - app/layout.tsx di-update untuk import tokens.css + base.css sebelum globals.css.
  - Urutan import penting: tokens (variabel) -> base (reset) -> globals (komponen).
  - Validasi: type-check hijau, lint 0 error (8 warning Fase 2), 4/4 test pass.
  - Component-specific CSS TETAP di globals.css untuk stabilitas visual. Pemecahan per-komponen di-defer ke iterasi berikutnya (risiko lebih tinggi).
- [ ] **Fase 4 — Scaffold `app/features/`** (rencana, untuk slice baru)
- [ ] **Fase 5 — Pilot slice (transaksi penjualan tiket)** (rencana)

