# Progress Pengembangan SILAYUR

Pembaruan terakhir: **16 Agustus 2026** — modul Tim & Jadwal (jadwal
shift, PIC, kehadiran karyawan) dengan 3 tabel baru, slice vertical, API
RBAC, dan halaman `/jadwal-karyawan`.

## Status Saat Ini

- Database: **PostgreSQL** (lokal `silayur` + `silayur_test`)
- Implementasi dan verifikasi lokal CP11: **selesai**
- Fitur void transaksi (permintaan + persetujuan manajer/supervisor): **selesai**
- Modul keuangan — pemasukan non-tiket, pengeluaran + persetujuan, rekap kas shift: **selesai**
- Modul Operasional — checklist harian: **selesai** (15 Agustus 2026)
- Kalender hari libur — tarif weekend untuk tanggal libur: **selesai** (15 Agustus 2026)
- Modul Tim & Jadwal — jadwal shift, PIC, kehadiran karyawan: **selesai** (16 Agustus 2026)
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
- [x] **Terapkan migration 0003–0010 (CP12–CP19) pada database Turso target**
  (15 Agustus 2026, otorisasi owner): `npm run db:migrate` → semua 11
  migration terdaftar di `__drizzle_migrations`; 19 tabel ada di remote
  (termasuk `sales`, `receipt_counters`, `revenue_entries`, `expenses`,
  `cash_sessions`, `complaints`, `facility_status`, `operations_checklist`,
  `holidays`). Seed idempotent dijalankan tanpa menimpa data operasional
  (`adminPasswordConfigured: false`).
- [x] **Smoke end-to-end di remote** (15 Agustus 2026): login admin →
  GET `/api/operations`, `/api/facilities`, `/api/complaints`, `/api/sales`,
  `/api/holidays`, `/api/reports` semua 200; POST checklist operasional
  tersimpan (lalu data uji dihapus).
- [ ] Deploy UI CP10–CP11 ke Sites.

Schema hingga migration 0010 (CP19) sudah tersedia pada database Turso target
(terverifikasi via `sqlite_master` + `__drizzle_migrations`). Aplikasi Sites
masih menggunakan deployment UI sebelumnya sampai rollout CP10–CP11 dilakukan.

## Pekerjaan Produk yang Belum Dikerjakan

- [ ] Transaksi bisnis operasional, seperti penjualan tiket aktual.
- [~] Dashboard dengan data transaksi nyata — KPI Pengunjung & Pendapatan sudah real dari `sales`; panel operasional/fasilitas/komplain masih simulasi.
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
- [x] Mulai mengganti data simulasi dashboard dengan transaksi operasional nyata
  (KPI Pengunjung & Pendapatan via `GET /api/sales`).

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
- [x] **Fase 4 — Scaffold `app/features/`** (26 Juli 2026)
  - Folder `app/features/` dibuat dengan `.gitkeep` agar tracked.
  - `app/features/README.md`: konvensi struktur, kapan pakai `features/` vs `slices/`, aturan impor, contoh `ticket-sales/`.
  - ESLint rule `no-restricted-syntax` ditambah untuk `app/**` (kecuali `app/features/**`): warning bila import langsung ke internal file feature (e.g. `features/ticket-sales/repo`).
  - Rule divalidasi dengan file dummy — terdeteksi 1 warning. File test dihapus setelah validasi.
  - `ARCHITECTURE.md` ditambah section "Vertical Features (Fase 4+)" dengan tabel perbandingan `features/` vs `slices/`.
  - Validasi: type-check hijau, lint 0 error, 4/4 test pass.
- [x] **Fase 5 — Pilot slice: transaksi penjualan tiket** (26 Juli 2026)
  - DB schema: tambah tabel `sales` (header transaksi) dan `sale_items` (line items) dengan snapshot harga & nama produk.
  - Migration: `drizzle/0003_checkpoint_12_ticket_sales.sql` (2 tabel + 6 index).
  - `drizzle/meta/_journal.json` di-update dengan idx 3.
  - Slice self-contained: `app/features/ticket-sales/` dengan `types.ts`, `repo.ts`, `api.ts`, `index.ts`, `components/SaleForm.tsx`, `components/SaleHistory.tsx`, `components/TodaySummary.tsx`, `__tests__/repo.test.ts`.
  - API route: `app/api/sales/route.ts` (thin handler: POST create, GET list-by-date).
  - Halaman: `app/penjualan/page.tsx` (form + summary + history).
  - Snapshot pricing: harga & nama produk di-freeze di `sale_items` saat transaksi, agar history stabil meski master tarif berubah.
  - Receipt number format: `RCP-YYYYMMDD-####` (auto-increment per hari).
  - Atomic: `createSale()` di-wrap `db.transaction()` untuk insert sale + items.
  - Test: 2 test pass (type validation & signature check). Integration test lengkap didefer (butuh snapshot drizzle).
- [x] **Fase 5 — Pilot slice: transaksi penjualan tiket** (26 Juli 2026)
  - DB schema: tambah tabel `sales` (header transaksi) dan `sale_items` (line items) dengan snapshot harga & nama produk.
  - Migration: `drizzle/0003_checkpoint_12_ticket_sales.sql` (2 tabel + 6 index).
  - `drizzle/meta/_journal.json` di-update dengan idx 3.
  - Slice self-contained: `app/features/ticket-sales/` dengan `types.ts`, `repo.ts`, `api.ts`, `index.ts`, `components/SaleForm.tsx`, `components/SaleHistory.tsx`, `components/TodaySummary.tsx`, `__tests__/repo.test.ts`.
  - API route: `app/api/sales/route.ts` (thin handler: POST create, GET list-by-date).
  - Halaman: `app/penjualan/page.tsx` (form + summary + history).
  - Snapshot pricing: harga & nama produk di-freeze di `sale_items` saat transaksi, agar history stabil meski master tarif berubah.
  - Receipt number format: `RCP-YYYYMMDD-####` (auto-increment per hari).
  - Atomic: `createSale()` di-wrap `db.transaction()` untuk insert sale + items.
  - Test: 2 test pass (type validation & signature check). Integration test lengkap didefer (butuh snapshot drizzle).
- [x] **Fase A — Quick wins pilot `ticket-sales/`** (29 Juli 2026)
  - **Nav item "Penjualan"** ditambah di `app/components/sidebar-navigation.tsx`. Tipe `ActiveSidebarItem` diperluas dengan `"penjualan"`. Item nav menggunakan permission `visitors` (reuse) dengan `href="/penjualan"` dan `activeKey="penjualan"`. Item "Pengunjung" dihapus (duplikat dengan Penjualan). `app/penjualan/page.tsx` mengirim `active="penjualan"`.
  - **Incremental summary update**: `onCreated` callback di `app/penjualan/page.tsx` sekarang meng-update `summary.count` dan `summary.revenue` secara lokal jika `sale.status === "completed"` dan `sale.soldAt.slice(0,10)` cocok dengan `summary.date`. Tidak ada refetch → tetap responsif. Hanya Sale yang sudah dipakai, tidak ada perubahan public API slice.
  - **MANIFEST.md** slice: `app/features/ticket-sales/MANIFEST.md` baru — berisi tanggung jawab, asumsi bisnis (weekend=Sat/Sun, hari libur=tarif weekend), format receipt `RCP-YYYYMMDD-####`, snapshot pricing rationale, edge cases (item kosong, qty invalid, produk non-aktif, tarif belum dikonfigurasi, midnight rollover, status voided), aturan RBAC (`access.visitors` ≥ view), anggota slice, wire-up eksternal, status implementasi (termasuk yang masih TODO: voided, integration test, auto-increment receipt harian, kalender hari libur).
  - Validasi: type-check hijau, ESLint 0 error pada file yang disentuh, 2/2 test `ticket-sales` pass.
  - Risiko rendah: tidak ada perubahan schema DB, tidak ada perubahan public API, tidak ada breaking change.
- [x] **Fase B — Deployment readiness (read-only, no remote mutation)** (29 Juli 2026)
  - **Investigasi state DB lokal** via `scripts/db-check-local-fase-b.mjs` (satu-shot, read-only, di-ignore). Temuan: `.data/silayur.db` hanya CP7; `.data/silayur-checkpoint9.db` CP7+CP9. **DB lokal BELUM pernah dimigrate ke CP11/CP12**. Schema CP12 di remote perlu diverifikasi owner via `turso db shell`.
  - **3 runbook dibuat** untuk owner, semua read-only, no mutation:
    - `docs/DEPLOY-CHECKLIST.md` — 6 langkah deployment, 5 bagian pre-deploy checklist, post-deploy smoke test 7 step, rollback plan (kode + DB + per-fase), troubleshooting 4 symptom.
    - `docs/TARIFF-ACTIVATION.md` — 7 langkah aktivasi tarif via UI `/pengaturan`, referensi harga seed default + pertanyaan konfirmasi owner, verifikasi via db-check + Turso shell + test transaksi + cek snapshot pricing, rollback/koreksi 3 skenario.
    - `docs/ENV-AUDIT.md` — inventaris 5 file konfigurasi, status secrets (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, dll), analisis Worker entry point, verifikasi env Sites checklist 6 item, 4 risiko (token rotation, secret manager, dll).
  - **Temuan penting**:
    - `.env` saat ini aktif menunjuk ke Turso remote (bukan file lokal) — semua `npm run db:*` akan menyentuh remote. **Rekomendasi**: comment `TURSO_DATABASE_URL` ke `file:./.data/silayur.db` saat develop lokal.
    - Schema CP11 (master tiket) sudah ter-apply ke Turso target. Schema CP12 (sales + sale_items) **status belum pasti** — perlu verifikasi owner.
    - Seed default sudah include 2 produk (Dewasa `TKT-DEWASA`, Anak `TKT-ANAK`) + 1 tarif aktif (Dewasa weekday Rp 15.000) + 1 tarif non-aktif (Dewasa weekend Rp 20.000). **Tarif Anak BELUM ada** — perlu input manual owner.
    - Harga final operasional **perlu konfirmasi owner** sebelum aktivasi.
  - **Tidak ada perubahan kode aplikasi** di Fase B — hanya dokumentasi & script investigasi. Semua perubahan kode yang dibutuhkan owner (deployment, aktivasi tarif, set password) **tidak dijalankan** sesuai prinsip `.serena/memories/task_completion.md`.
  - **Risiko**: rendah (dokumentasi + investigasi). **Nilai**: tinggi — owner punya 3 dokumen operasional lengkap untuk eksekusi deploy tanpa trial-and-error.

  - Validasi: type-check hijau, lint 0 error (2 warning Fase 4 di app/api/sales/route.ts), 6/6 test pass.
- [x] **Fase A — Quick wins pilot `ticket-sales/`** (29 Juli 2026)
  - **Nav item "Penjualan"** ditambah di `app/components/sidebar-navigation.tsx`. Tipe `ActiveSidebarItem` diperluas dengan `"penjualan"`. Item nav menggunakan permission `visitors` (reuse) dengan `href="/penjualan"` dan `activeKey="penjualan"`. Item "Pengunjung" dihapus (duplikat dengan Penjualan). `app/penjualan/page.tsx` mengirim `active="penjualan"`.
  - **Incremental summary update**: `onCreated` callback di `app/penjualan/page.tsx` sekarang meng-update `summary.count` dan `summary.revenue` secara lokal jika `sale.status === "completed"` dan `sale.soldAt.slice(0,10)` cocok dengan `summary.date`. Tidak ada refetch → tetap responsif. Hanya Sale yang sudah dipakai, tidak ada perubahan public API slice.
  - **MANIFEST.md** slice: `app/features/ticket-sales/MANIFEST.md` baru — berisi tanggung jawab, asumsi bisnis (weekend=Sat/Sun, hari libur=tarif weekend), format receipt `RCP-YYYYMMDD-####`, snapshot pricing rationale, edge cases (item kosong, qty invalid, produk non-aktif, tarif belum dikonfigurasi, midnight rollover, status voided), aturan RBAC (`access.visitors` ≥ view), anggota slice, wire-up eksternal, status implementasi (termasuk yang masih TODO: voided, integration test, auto-increment receipt harian, kalender hari libur).
  - Validasi: type-check hijau, ESLint 0 error pada file yang disentuh, 2/2 test `ticket-sales` pass.
  - Risiko rendah: tidak ada perubahan schema DB, tidak ada perubahan public API, tidak ada breaking change.
  - Validasi: type-check hijau, lint 0 error (2 warning Fase 4 di app/api/sales/route.ts), 6/6 test pass.


## Sprint Perbaikan (29 Juli 2026) — hasil audit codebase

Workflow: kerjakan → test lokal → update docs → commit (lihat `AGENTS.md`).
Daftar lengkap: [`docs/PLAN-PERBAIKAN.md`](./docs/PLAN-PERBAIKAN.md).

- [x] **P0 #1 — RBAC di Sales API** (commit `fix(sales)`)
  - Sebelumnya `app/api/sales/route.ts` hanya memanggil `requireRequestUser()`
    (autentikasi) tanpa cek akses modul `visitors` — semua user yang sudah
    login bisa membuat/membaca transaksi penjualan berapa pun role-nya.
  - `db/config-repo.ts` mendapat helper generik `getModuleAccess()` dan
    `assertCanAccessModule()`; fungsi settings lama (`getSettingsAccess`,
    `assertCanViewSettings`, `assertCanManageSettings`) direfaktor sebagai
    wrapper tipis dengan pesan error identik; tambah `assertCanViewVisitors`
    dan `assertCanManageVisitors`.
  - Route sales: GET dan POST kini memanggil `assertCanViewVisitors()`
    (konsisten dengan gating halaman `/penjualan` yang memakai
    `canView(access.visitors)`). Keputusan terbuka: apakah POST sebaiknya
    butuh `manage` — lihat PLAN-PERBAIKAN.
  - Test baru `app/api/__tests__/sales-rbac.test.mjs`: anonim 401 (GET/POST),
    viewer (`visitors: none`) 403 (GET/POST), petugas tiket
    (`visitors: manage`) 200, validasi receipt/total/snapshot, persistensi.
  - Validasi: type-check hijau, lint 0 error (2 warning Fase 4 pre-existing),
    5/5 test pass.

- [x] **P0 #2 — Track migration CP11 di git** (commit `chore(db)`)
  - `drizzle/0002_checkpoint_11_ticket_master.sql` +
    `drizzle/meta/0002_snapshot.json` di-commit tanpa mengubah isinya (sebelum
    ini untracked padahal sudah di-rollout ke Turso remote; repo clone baru
    akan kehilangan migration tersebut).

- [x] **P1 #3 — Timezone Asia/Jakarta untuk "hari ini"**
  - Helper baru `shared/date.ts`: `todayIsoDate()` (kalender WIB via
    `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" })`),
    `isWeekend`/`dayTypeFor` (dipindah dari slice ticket-sales agar single
    source), dan `effectivePriceFor()` (tarif efektif per day type & periode).
  - Kolom waktu (`sold_at`, `created_at`) tetap ISO UTC; hanya pengelompokan
    kalender yang memakai WIB: prefix receipt, default `visit_date`, filter
    "hari ini" di GET sales, default tanggal summary halaman penjualan, dan
    default `valid_from` tarif baru.
  - Test: `shared/__tests__/date.test.ts` (format, weekend, tarif efektif,
    periode, prioritas validFrom).

- [x] **P1 #4 — Receipt sequence bebas race condition**
  - Tabel baru `receipt_counters` (counter per hari kalender WIB) dengan
    upsert inkremental atomik (`ON CONFLICT ... DO UPDATE SET seq = seq + 1
---

## Sprint Asesmen Fitur + Data Demo (13 Agustus 2026)

- **Tujuan**: memungkinkan pengujian fitur yang sudah ada dengan data contoh
  yang terlihat (penjualan, keuangan, shift kas) dan penilaian fitur/UI-UX per role.
- **`scripts/db-seed-demo.mjs`** + **`db/demo-data.json`** (baru):
  - Menambahkan data demo (14 penjualan + 20 item tiket, 3 pemasukan non-tiket,
    4 pengeluaran, 2 rekap kas) dengan pola idempotent `ON CONFLICT DO NOTHING`.
  - **Guard anti-remote**: menolak menulis ke Turso remote
    (`libsql://` / `https://`) kecuali di-force `SILAYUR_DEMO_ALLOW_REMOTE=1`.
  - Menyelaraskan `receipt_counters` agar nomor receit transaksi baru tidak
    bentrok dengan nomor demo.
  - Nama file `db/demo-data.json` mengikuti single-source-of-truth seed.
- **`package.json`** → tambah script `db:seed-demo`.
- **`docs/ASESMEN-FITUR-UI-UX.md`** (baru) → penilaian fitur, layout UI, dan
  UX per role, termasuk gap RBAC & data tarif.
- **`docs/RUNBOOK-DEMO.md`** (baru) → cara menjalankan demo dengan DB lokal
  secara aman (tanpa menyentuh remote) + akun login demo.
- **Validasi lokal**: migrate + seed + seed-demo sukses pada DB file lokal
  `.data/demo-silayur.db`; idempotensi & guard remote terverifikasi;
  `npm run type-check` hijau.
- **Catatan**: DB remote (`libsql://silayur-nayantaka...`) **tidak disentuh**.

### Sesi seed demo lengkap (13 Agustus 2026)

- **`scripts/db-seed-demo-extras.mjs`** (baru) — melengkapi data demo supaya
  fitur benar-benar bisa diuji end-to-end:
  - Tarif **Anak** weekday Rp 10.000 & weekend Rp 12.000 (aktif).
  - **Aktivasi tarif Weekend Dewasa** Rp 20.000 (seed dasar menonaktifkannya).
  - User untuk role yang belum punya akun demo: `budi.keuangan`
    (finance_officer), `ratna.supervisor` (supervisor), `agus.lapangan`
    (field_officer), `dewi.cs` (customer_service) — password `silayur-demo`.
  - Guard anti-remote & idempotent sama seperti `db-seed-demo`.
- **`package.json`** → tambah script `db:seed-demo-extras`.
- **Bug bundling native libsql diperbaiki** (`db/get-db.ts`):
  - `getRequestDb()` diubah menjadi `async` dan memuat `@libsql/client` Node
    lewat `createRequire` pada mode `file:`. Sebelumnya Rolldown mengalikan
    `@libsql/client` ke versi web (conditional export `workerd`) dan native
    addon (`@libsql/win32-x64-msvc`) tidak bisa di-`require` di bundle —
    akibatnya `dist/standalone` selalu 503 saat memakai DB file lokal.
  - Semua route API + test di-update ke `await getRequestDb()`.
  - Validasi: `npm run type-check`, `npm run lint` (0 error, 13 warning
    pre-existing), `npm test` 22/22 pass, build sukses.
- **Smoke test end-to-end** pada `dist/standalone` dengan
  `.data/demo-fresh.db`:
  - Login `manajer.operasional` / `admin.resepsionis` / `siti.tiket` /
    `budi.keuangan` 200; RBAC per role benar.
  - GET `/api/sales` (4 transaksi hari ini, 15 pengunjung, Rp 190.000),
    `/api/finance/summary` (total Rp 615.000), `/api/expenses`,
    `/api/revenue`, `/api/cash-session`, `/api/db/health` semua 200.
  - POST `/api/sales` (dewasa + anak) → `RCP-20260813-0006`; void flow
    `completed → void_pending → voided` (approval manager + verifikasi
    password) berhasil.
  - Semua halaman `/`, `/penjualan`, `/keuangan`, `/pengaturan` 200.
- **`docs/RUNBOOK-DEMO.md`** di-update: langkah extras, tabel 8 akun demo,
  catatan teknis dev-server (workerd tidak mendukung `file:`) dan cara
  menjalankan standalone.
- **Catatan**: `.env` / `.dev.vars` sementara diarahkan ke DB demo untuk
  sesi ini dan **di-restore** setelah selesai; DB remote tidak disentuh.

### Perbaikan UX halaman Keuangan (14 Agustus 2026)

- **`app/keuangan/page.tsx`** dirombak mengikuti alur kerja: status kas harian
  sebagai panel utama (ikon status + teks panduan + tombol mulai/setor) →
  ringkasan pendapatan hari ini → form & riwayat pemasukan non-tiket →
  form & riwayat pengeluaran.
- **Modal setor kas** menggantikan `window.prompt()`: form nominal setoran
  yang proper, ringkasan total pendapatan tercatat sebagai acuan, tombol
  Batal/Setor, validasi input non-negatif (menutup poin rekomendasi
  `docs/ASESMEN-FITUR-UI-UX.md` #2).
- **Terminologi awam**: istilah "shift kas" diganti menjadi **"Kas harian"**,
  "buka shift" → **"Mulai sesi kas"**, "tutup shift" → **"Setor kas"**, status
  "Shift aktif dibuka…" → **"Sesi kas berjalan sejak…"**. Perubahan hanya di
  teks UI halaman `/keuangan`; identifier internal (variabel `shift`, fungsi,
  class CSS) dan API/schema tidak berubah.
- **Form berlabel** (bukan placeholder doang): sumber, nominal, catatan pada
  pemasukan; keterangan, nominal, catatan pada pengeluaran; submit via
  `onSubmit` + tombol dengan kata kerja yang jelas ("Catat pemasukan",
  "Catat pengeluaran", "Setujui").
- **Feedback sukses** (`finance-notice`) setelah mencatat/menyetujui/menutup,
  memisahkan dari error.
- **CSS baru** di `app/globals.css` (di akhir): `.finance-*`, `.shift-panel`,
  `.modal-*` dengan token existing (`--green`, `--forest-dark`, `--success`),
  responsif di bawah 620px (tombol & form full-width).
- Validasi: `npm run type-check` hijau, `npm run lint` 0 error (13 warning
  pre-existing di route lama, tidak ada warning baru), `npm test` **22/22 pass**.

## Halaman Laporan & Rekap Lintas Tanggal (14 Agustus 2026)

- **Slice baru `app/features/reports/`** — `rangeReport(db, from, to)`: 4 query
  paralel (sales, revenue_entries, expenses, cash_sessions) pada satu rentang
  tanggal WIB, agregasi & grouping per hari di JS. Semantik waktu konsisten
  dengan modul existing: window UTC WIB untuk `sold_at`, filter string untuk
  `entry_date`; penjualan `voided` dikecualikan dari total tapi dilaporkan
  terpisah (`voidedCount`/`voidedAmount`); pengeluaran hanya `approved` dihitung
  sebagai uang keluar; sesi kas `closed` diagregasi ke `cashTotals`, sesi `open`
  dilaporkan via `openCount`.
- **Route baru `app/api/reports/route.ts`** — thin handler, RBAC
  `assertCanViewReports` (baru di `db/config-repo.ts`), validasi rentang
  (format tanggal, `from <= to`, maksimal 366 hari) → 400 "Rentang tanggal
  tidak valid."
- **Halaman baru `app/laporan/page.tsx`** — form rentang tanggal (Dari/Sampai)
  + preset cepat (Hari ini / 7 hari terakhir / Bulan ini), 6 kartu KPI rekap
  (Pengunjung, Transaksi, Pendapatan tiket, Non-tiket, Pengeluaran disetujui,
  Selisih kas net), panel sesi kas, tabel rincian per hari (klik baris → detail
  hari itu via endpoint existing `/api/sales?date=`, `/api/revenue?date=`,
  `/api/expenses?date=`). Role `reports=view` tanpa akses `visitors`/`finance`
  mendapat pesan ramah saat membuka detail (bukan error mentah).
- **Nav "Laporan" diaktifkan** (`app/components/sidebar-navigation.tsx`):
  `href: "/laporan"`, `activeKey: "laporan"` — sebelumnya dead link.
- **Helper tanggal baru** di `shared/date.ts`: `isValidDateIso`,
  `localUtcRange`, `utcIsoToLocalDate`, `eachDateInRange` + test.
- **CSS baru** `.report-*` di `app/globals.css` (grid KPI, tabel, detail,
  status sesi, responsif < 620px).
- **Tidak ada perubahan schema DB** (tidak ada migration baru).
- Validasi: type-check hijau, lint 0 error (warning pre-existing), `npm test`
  pass (termasuk test baru `shared/date` + `reports`).

## Dashboard Data Nyata (14 Agustus 2026)

- **Panel "Komposisi pendapatan"** (`app/page.tsx`) kini memakai data nyata
  hari ini, bukan hardcoded "7,85 juta": breakdown per sumber dari transaksi
  (tiket per produk via `sales[].items[]`, non-tiket per sumber via
  `listRevenue`), urutan label dari `config.configItems.revenue` (aktif),
  donut `conic-gradient` dinamis + list bucket. Empty state jujur
  ("Belum ada data pendapatan hari ini").
- **Kartu KPI operasional/fasilitas/komplain** jadi jujur: nilai hardcoded
  ("8 dari 9", "Buka", "3 item", "2 kasus") diganti `"—"` dengan catatan
  "Modul belum tersedia" / "Belum ada data" — tidak menyesatkan saat demo.
  Gating modul & permission tetap.
- **Tanggal topbar** dinamis WIB (`Intl.DateTimeFormat("id-ID", timeZone:
  "Asia/Jakarta")`) menggantikan literal "Kamis, 23 Juli 2026".
- **Badge notifikasi "3"** dihapus (angka palsu); tombol tetap ada dengan
  `aria-label` "Notifikasi belum tersedia".
- Tanpa perubahan schema DB, tanpa migration, tanpa endpoint baru — komposisi
  dihitung client-side memakai API existing (`listTodaySales`, `listRevenue`,
  `fetchRemoteConfig`).
- Grafik tren per hari di-defer (butuh permission `reports`, tidak selalu
  dimiliki role penampil panel finance).
- Validasi: type-check hijau, lint 0 error (warning pre-existing), `npm test`
  pass, smoke manual dashboard dengan DB demo.

## Modul Komplain — Pilot Dead-Link (14 Agustus 2026)

- **Tabel `complaints`** baru di `db/schema.ts` + migration
  `drizzle/0007_checkpoint_16_complaints.sql` (siklus hidup: `open` →
  `assigned` → `processing` → `resolved` / `reopened`; kolom audit
  `reportedBy`/`updatedBy`, WIB `date`, `priority`).
- **Slice baru `app/features/complaints/`** (types, repo, api, index,
  MANIFEST, test) — `createComplaint`, `listComplaintsByDate`,
  `listRecentComplaints`, `countOpenComplaints`, `updateComplaintStatus`
  (validasi transisi).
- **RBAC baru** `assertCanViewComplaints` / `assertCanManageComplaints`
  (`db/config-repo.ts`); route thin handler:
  `app/api/complaints/` (GET/POST), `app/api/complaints/recent/` (GET),
  `app/api/complaints/[id]/status/` (POST).
- **Halaman `/complaints`** + nav sidebar "Komplain" diaktifkan (sebelumnya
  dead link). Form catat komplain (judul, kategori dari config facilities,
  prioritas) + daftar hari ini + tombol lanjut status — hanya untuk
  `complaints=manage`; view hanya lihat.
- **Dashboard di-wire**: panel "Komplain terbaru" memakai
  `listRecentComplaints` (bukan `complaintRows` hardcoded); KPI "Komplain
  terbuka" memakai `countOpenComplaints` (angka real).
- **CSS** `.complaint-status-*` + `.complaint-row` di `app/globals.css`.
- Migration 0007 hanya dijalankan di DB lokal/test; **rollout Turso remote
  menunggu otorisasi owner** (AGENTS.md).
- Validasi: type-check hijau, lint 0 error (warning pre-existing), `npm test`
  pass (termasuk test baru `complaints`), smoke manual.

## Modul Fasilitas — Status Harian (14 Agustus 2026)

- **Tabel `facility_status`** baru di `db/schema.ts` + migration
  `drizzle/0008_checkpoint_17_facilities.sql` — satu baris per
  `(facility_id, date)` WIB, status `operational` / `needs_attention` /
  `closed`, kolom audit (`recordedBy`, `recordedAt`, `note`). Upsert per hari.
- **Slice baru `app/features/facilities/`** (types, repo, api, index,
  MANIFEST, test) — `upsertFacilityStatus` (validasi fasilitas aktif dari
  config_items), `listFacilitiesWithStatus` (fasilitas aktif + status hari
  ini, default `operational`), `facilityStatusSummary` (counts + updatedAt).
- **RBAC baru** `assertCanViewFacilities` / `assertCanManageFacilities`
  (`db/config-repo.ts`); route thin handler `app/api/facilities/` (GET
  summary) + `app/api/facilities/status/` (POST upsert).
- **Halaman `/fasilitas`** + **nav "Fasilitas" baru** di sidebar (sebelumnya
  tidak ada). Tabel fasilitas + status pill + tombol ubah status & catatan
  (hanya `facilities=manage`; view hanya lihat).
- **Dashboard di-wire**: donut "Status operasional" (kini milik modul
  fasilitas — gating diubah dari `operations || facilities` ke
  `facilities`), panel "Kesiapan fasilitas", KPI "Fasilitas aktif" &
  "Perlu perhatian" — semua dari `facilityStatusSummary` (bukan 8/7/1/0
  palsu). Tombol "Lihat detail" → `/fasilitas`.
- **CSS** `.facility-*` di `app/globals.css`.
- Migration 0008 hanya dijalankan di DB lokal/test; **rollout Turso remote
  menunggu otorisasi owner** (AGENTS.md).
- Validasi: type-check hijau, lint 0 error (warning pre-existing), `npm test`
  pass (termasuk test baru `facilities`), smoke manual.

## Modul Operasional — Checklist Harian (15 Agustus 2026)

- **Tabel `operations_checklist`** baru di `db/schema.ts` + migration
  `drizzle/0009_checkpoint_18_operations.sql` — satu baris per
  `(checklist_id, date)` WIB, `done` boolean, kolom audit (`recordedBy`,
  `recordedAt`, `note`). Upsert per hari.
- **Sumber checklist** = `config_items` section `hours` yang `active`
  (dikelola di Pengaturan → Daftar tugas harian; sebelumnya "Jam
  operasional"). Item belum dicatat dianggap
  `done: false`; progress = `doneCount / totalCount`.
- **Slice baru `app/features/operations/`** (types, repo, api, index,
  MANIFEST, test) — `upsertOperationsChecklist` (validasi item hours aktif),
  `listOperationsChecklist` (item aktif + status per tanggal),
  `operationsStatus` (items + doneCount/totalCount/updatedAt).
- **RBAC baru** `assertCanViewOperations` / `assertCanManageOperations`
  (`db/config-repo.ts`); route thin handler `app/api/operations/` (GET
  status, POST upsert, same-origin + auth + RBAC).
- **Halaman `/operasional`** + **nav "Operasional" diaktifkan** (sebelumnya
  dead link/tombol mati). Checklist buka-tutup harian + progress bar + panel
  "Jadwal operasional" read-only (dari Pengaturan). `operations=manage` bisa
  menandai; view hanya lihat.
- **Dashboard di-wire**: KPI "Status operasional" memakai `operationsStatus`
  (doneCount/totalCount) — menggantikan nilai "—" dan "Modul operasional
  belum tersedia". Label stale `aria-label="Simulasi aktivasi modul"` →
  "Aktivasi modul".
- **Perbaikan test sensitif hari**: dua test `ticket-sales` (`createSale is
  atomic`, `listSalesByDate/todaySummary`) kini mengaktifkan tarif weekend
  dulu (deterministik di hari apa pun), mengikuti pola test lain.
- **CSS** `.operations-*` di `app/globals.css`.
- Migration 0009 hanya dijalankan di DB lokal/test; **rollout Turso remote
  menunggu otorisasi owner** (AGENTS.md).
- Validasi: type-check hijau, lint 0 error (warning pre-existing), `npm test`
  **42/42 pass**, `db:generate` no-op, smoke API (anon 401, admin 200,
  upsert persist, manager 200, viewer 403) pada DB lokal.

## Quick Wins Dashboard + Modal Void (15 Agustus 2026)

- **Dashboard `app/page.tsx`**:
  - Tombol mati di-wire: "Lihat detail" → `/fasilitas` dan "Semua komplain" →
    `/complaints` (kini `Link`).
  - Kartu cuaca hardcoded ("31°C Cerah berawan Ngaliyan") diganti kartu
    jujur "Hari ini — Data operasional dari transaksi nyata".
  - Label "Penjualan live" → "Data hari ini" (data di-fetch sekali, bukan
    live stream).
  - Tombol tanggal & lonceng notifikasi yang tidak berfungsi dihapus;
    tanggal ditampilkan sebagai teks statis (`date-button-static`).
  - KPI "Fasilitas aktif" `suffix="dari 3"` hardcoded → total fasilitas
    real (`facility.facilities.length`).
- **Modal void penjualan** (`app/penjualan/page.tsx`): `window.prompt()`
  diganti modal proper (pola `/keuangan`): form alasan + password, tombol
  Batal/konfirmasi, state submitting, close via overlay. Menutup rekomendasi
  ASESMEN #2 untuk halaman penjualan.
- Validasi: type-check hijau, lint 0 error (warning pre-existing), `npm test`
  pass.

## Kalender Hari Libur (15 Agustus 2026)

- **Tabel `holidays`** baru di `db/schema.ts` + migration
  `drizzle/0010_checkpoint_19_holidays.sql` — satu baris per tanggal WIB
  (unique `date`), kolom `name`, `createdBy`, `createdAt`.
- **Slice baru `app/features/holidays/`** (types, repo, api, index,
  MANIFEST, test) — `listHolidays`, `listHolidayDates`, `upsertHoliday`
  (idempotent per tanggal), `deleteHoliday`.
- **Route `app/api/holidays/route.ts`** (GET/POST/DELETE) — RBAC
  `settings` manage.
- **Penentuan tarif**: helper baru `dayTypeForWithHolidays` +
  `effectivePriceFor(product, date, holidayDates)` di `shared/date.ts`;
  `priceSale` (server) membaca `holidays` sehingga tanggal libur weekday
  memakai tarif weekend. Preview client `SaleForm` fetch holidays agar
  konsisten.
- **UI Pengaturan** → section baru "Hari libur": form tanggal + nama,
  daftar, tombol hapus (hanya `settings` manage; view hanya lihat).
- Migration 0010 hanya dijalankan di DB lokal/test; **rollout Turso remote
  menunggu otorisasi owner** (AGENTS.md).
- Validasi: type-check hijau, lint 0 error (warning pre-existing), `npm test`
  **48/48 pass** (6 test baru: holidays repo ×3, priceSale holiday,
  dayTypeForWithHolidays, effectivePriceFor holiday), `db:generate` no-op,
  smoke API (anon 401, admin CRUD 200, viewer 403) pada DB lokal.

## Perbaikan UI Penjualan (15 Agustus 2026)

- **CSS fitur penjualan ternyata belum ada** di `app/globals.css` (hanya
  sebagian kecil `.sale-history-actions`/`.sale-action-button`/`.sale-status-*`)
  — halaman `/penjualan` tampil tanpa styling. Ditambahkan blok lengkap:
  `.today-summary` (3 kartu rekap), `.sale-form` (grid produk, catatan,
  ringkasan, error), `.sale-history` (row, status, empty) + responsif < 620px,
  memakai token yang ada (`--panel`, `--line`, `--green`, `--forest`, dll).
- **`SaleForm` UX diperbaiki**:
  - Produk tanpa tarif aktif → input qty dinonaktifkan + pesan "Tarif belum
    dikonfigurasi — tanyakan admin" (sebelumnya tetap bisa diisi lalu submit
    gagal di server).
  - Label jenis hari: "Hari kerja — tarif weekday" / "Akhir pekan — tarif
    weekend" / "Hari libur — tarif akhir pekan" (menggunakan
    `dayTypeForWithHolidays`).
  - Tombol submit disable saat tidak ada produk yang bisa dibeli, teks berubah
    "Belum ada tarif aktif".
- **Data tarif lokal dilengkapi** via `db:seed-demo-extras` (guard anti-remote):
  tarif Anak weekday Rp 10.000 & weekend Rp 12.000 aktif, tarif weekend Dewasa
  Rp 20.000 diaktifkan — kini kedua produk bisa dijual di hari apa pun.
- Validasi: type-check hijau, lint 0 error (warning pre-existing), test
  ticket-sales 8/8 pass, verifikasi end-to-end: login 200, `/penjualan` 200,
  asset 200, POST sale (2 Dewasa + 1 Anak = Rp 52.000, receipt
  `RCP-20260815-0001`) sukses, history GET 200 (data uji dihapus setelahnya).

## Migrasi Turso/libSQL → PostgreSQL (15 Agustus 2026)

- **Keputusan**: driver `pg` (node-postgres), Postgres lokal (service
  PostgreSQL 18 di `localhost:5432`), test pakai database terpisah
  (`silayur_test`). Drizzle tetap.
- **Postgres disiapkan**: password user `postgres` di-reset (metode trust
  sementara → scram-sha-256, `pg_hba.conf` di-backup), database `silayur` dan
  `silayur_test` dibuat.
- **Schema `db/schema.ts` di-rewrite**: `sqliteTable` → `pgTable`,
  `integer({mode:"boolean"})` → `boolean`, 13 enum inline → `.$type<>()`,
  `sql\`(datetime('now'))\`` → `sql\`now()\``, `serial` untuk schema_version.
- **Runtime client**: `db/get-db.ts` → satu client `pg` (`Pool` + Drizzle
  `node-postgres`), mekanisme dual-client Turso (`createRequire` vs web)
  dihapus. `db/client-web.ts` dihapus. `db/env.ts`/`runtime-env.ts` baca
  `DATABASE_URL`.
- **Env**: `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` → `DATABASE_URL`
  (`postgres://...`) + `TEST_DATABASE_URL`. Backup Turso di
  `.env.turso-backup` / `.dev.vars.turso-backup`. `.env.example` di-update.
- **Migration**: `drizzle.config.ts` `dialect: "postgresql"`; semua migration
  SQLite (0000–0010) di-backup ke `drizzle-backup-sqlite/` dan diganti satu
  migration Postgres `0000_postgres_migration` (19 tabel). `db-migrate.mjs`
  memakai `pg` + `drizzle-orm/node-postgres/migrator`.
- **Seed & scripts**: `db-seed*.mjs`, `auth-set-password.mjs`, `db-check.mjs`,
  `sync-dev-vars.mjs` di-porting ke `pg` (`$1` placeholder, `now()`, `EXCLUDED`,
  BEGIN/COMMIT). Guard anti-remote demo kini menolak host non-localhost.
  `backup-remote.mjs` dan `db-check-local-fase-b.mjs` (artefak Turso) dihapus.
- **Worker**: `worker/index.ts` env `TURSO_*` → `DATABASE_URL`
  (`exposeDbEnv`).
- **Test**: helper baru di `tests/test-utils.mjs` (`prepareTestEnv`,
  `resetTestDb`, `connectTestDb`, `truncateAllTables`) menggantikan pola temp
  `file:` DB + spawn migrate/seed. 13 test file di-update ke Postgres
  (`information_schema`, `now() + interval`, boolean). `tsconfig` exclude
  `examples` (D1 example SQLite).
- **Dependencies**: tambah `pg` + `@types/pg`; `npm audit` 0 kerentanan
  (setelah `audit fix`; catatan: 2 vulnerability transitive `image-size`
  via vinext menuntut upgrade breaking `vinext@1.0.0-beta.6` — sengaja
  di-defer, risiko rendah).
- Validasi: type-check hijau, lint 0 error, migrate+seed+seed-demo+extras ke
  Postgres sukses (19 tabel, 8 user, tarif 4 aktif, demo data), 22/22 test
  Postgres pass, `db:generate` no-op.
- **Catatan**: data Turso remote **tidak** dimigrasi (fresh start di
  Postgres); kredensial Turso tetap di backup lokal. Rollout Postgres ke
  production belum dilakukan.

## Migrasi Password Turso → Postgres (15 Agustus 2026)

- **Temuan**: DB Turso lokal (`.data/silayur.db`) hanya punya master data
  (8 users, roles, permissions, produk, tarif, config) tanpa transaksi;
  Postgres sudah lebih lengkap (termasuk demo data). Yang bernilai untuk
  dimigrasi hanya **password hash users**.
- **Script baru `scripts/migrate-passwords-turso-to-pg.mjs`** (+ npm
  `db:migrate-passwords`): membaca `password_hash` dari DB Turso lokal
  (`TURSO_DATABASE_URL=file:...`) dan men-update users di Postgres
  (`DATABASE_URL`) — idempotent, satu arah, tidak menyentuh field lain.
- Hasil: **8 user diperbarui**; verifikasi login admin di Postgres tetap
  berhasil dengan `SilayurLocal-2026!` (hash Turso cocok dengan password
  seed yang sama).
- Validasi: type-check hijau (tidak ada perubahan kode aplikasi), smoke
  login OK.

## Void/Koreksi Keuangan (15 Agustus 2026)

- **Schema**: `revenue_entries` mendapat kolom `status` (`active`/`voided`),
  `voided_by`, `voided_at`, `void_reason` — migration
  `drizzle/0001_revenue_void.sql`. `expenses` sudah punya `status: voided`.
- **Repo `app/features/finance/repo.ts`**: `voidRevenueEntry` (set status +
  audit, hanya dari `active`), `voidExpense` (dari `pending`/`approved`, cegah
  double-void). `todayRevenueSummary` & `computeSystemCash` kini **mengecualikan
  revenue `voided`**; list tetap menampilkan dengan status.
- **Route baru**: `app/api/revenue/[id]/void/route.ts` +
  `app/api/expenses/[id]/void/route.ts` (RBAC `finance` manage, same-origin).
- **UI `/keuangan`**: tombol "Batalkan" pada riwayat pemasukan (aktif) &
  pengeluaran (non-voided); baris voided tampil redup + coret + label
  "Dibatalkan". CSS `.finance-row-voided` + `.finance-btn-danger`.
- Validasi: type-check hijau, lint 0 error (16 warning pre-existing +
  route void), test finance **4/4 pass** (2 test baru: void revenue eksklusi
  summary + audit, void expense eksklusi system cash + cegah double-void).

## Cetak/PDF Laporan (15 Agustus 2026)

- **Halaman `/laporan`**: tombol "Cetak / PDF" di header (muncul saat report
  ada) memanggil `window.print()` — user bisa pilih printer atau "Save as
  PDF" dari dialog print browser.
- **CSS `@media print`** di `app/globals.css`: sembunyikan sidebar, topbar,
  form rentang, preset, tombol, dan detail hari; tampilkan header cetak
  (judul "SILAYUR Park — Laporan Operasional" + rentang + tanggal cetak),
  KPI, tabel sesi kas, dan rincian per hari dengan border rapi;
  `break-inside: avoid` agar panel tidak terpotong antar halaman.
- Tanpa dependency baru; hasil rapi di kertas/PDF.
- Validasi: type-check hijau, lint 0 error (warning pre-existing).

## Enam Fitur Pelengkap (15 Agustus 2026)

1. **Riwayat transaksi lintas tanggal di `/penjualan`** — date picker di
   header; `listSalesByDate` di slice ticket-sales; judul riwayat dinamis.
2. **Filter status eksplisit di `/laporan`** — dropdown status penjualan
   (Semua/Selesai/Menunggu void/Dibatalkan) pada detail hari; label
   "dibatalkan" pada baris voided.
3. **Riwayat status fasilitas lintas hari** — `listFacilityStatusHistory` +
   route `/api/facilities/history` + panel "Riwayat status" (30 catatan
   terakhir) di `/fasilitas`.
4. **Advance sale / selected_date** — `SaleForm` punya input tanggal
   kunjungan; preview harga & submit memakai `visitDate`; route `/api/sales`
   POST menerima `visitDate`; `SaleInput.visitDate`.
5. **Riwayat transisi status komplain** — tabel `complaint_history` +
   migration `0002_complaint_history` (pg); catat entri saat create & ubah
   status; route `/api/complaints/[id]/history`; tombol "Riwayat" + panel di
   `/complaints`; test baru.
6. **Kalender libur nasional** — script `db:seed-holidays` (idempotent)
   mengisi 13 libur nasional Indonesia 2026 ke `holidays`; tarif weekend
   otomatis berlaku di tanggal merah.

Validasi: type-check hijau, lint 0 error (warning pre-existing), test
per-slice lulus (ticket-sales 8, complaints 5 dgn history, facilities 4,
finance 4), seed holidays idempotent (13 inserted → 0/13 existing).

- [x] **P1 #4 — Receipt sequence bebas race condition**
  - Tabel baru `receipt_counters` (counter per hari kalender WIB) dengan
    upsert inkremental atomik (`ON CONFLICT ... DO UPDATE SET seq = seq + 1
    RETURNING seq`) — menggantikan `count(*)+1` yang rawan duplikat saat
    banyak loket transaksi bersamaan.
  - Migration `drizzle/0004_checkpoint_13_receipt_counters.sql`.
  - **Perbaikan rantai snapshot**: `drizzle/meta/0003_snapshot.json`
    ternyata tidak pernah dibuat saat CP12 (defect pre-existing) — akibatnya
    `drizzle-kit generate` men-generate ulang tabel `sales`/`sale_items`.
    Snapshot 0003 disusun ulang dari state 0004 minus `receipt_counters`
    dan rantai `prevId` diperbaiki (0002 → 0003 → 0004). Validasi:
    `drizzle-kit generate` → "No schema changes".
  - Test integrasi `createSale` di `__tests__/repo.test.ts`: nomor receipt
    increment (0001, 0002), format `RCP-YYYYMMDD-####`, konsistensi
    total/subtotal, counter tersimpan per tanggal.

- [x] **P1 #5 — Preview harga client konsisten dengan server**
  - `SaleForm` kini memakai `effectivePriceFor(product, todayIsoDate())`
    (helper bersama dari item 3) alih-alih tarif aktif pertama dalam array —
    preview di akhir pekan tidak lagi menampilkan harga weekday.

- **Runner test diperlebar** (sebagian item P2 #6, dikerjakan lebih awal
  agar test baru ikut dijalankan): glob `npm test` di `package.json` kini
  menjangkau `app/**/__tests__/*.test.ts` dan `shared/__tests__/*.test.ts`.
  Total test naik dari 5 menjadi **13/13 pass**.

- [x] **P2 #6 — Perkuat test `ticket-sales` + runner**
  - Glob `npm test` sudah menjangkau `*.test.ts` (dikerjakan di Sprint 2).
  - Test baru `app/features/ticket-sales/__tests__/repo.test.ts`:
    - `priceSale`: item kosong, qty invalid (0/-1), produk tidak dikenal,
      produk non-aktif, tarif belum dikonfigurasi, tarif efektif weekday vs
      weekend (Rp 15.000 / Rp 20.000), agregasi total & quantity.
    - `createSale` atomik: kegagalan (satu item tidak dikenal) tidak
      menyisakan baris sales baru dan **counter receipt tidak maju**.
    - `listSalesByDate` / `todaySummary`: filter hari WIB, urutan terbaru
      dulu, summary mengecualikan status `voided` sementara list tetap
      menampilkan, hari lain kosong.
  - **Perbaikan boundary waktu** yang ditemukan saat menulis test:
    `listSalesByDate` dan `todaySummary` sebelumnya memfilter `sold_at`
    antara `T00:00:00.000Z`–`T23:59:59.999Z` (interpretasi UTC dari tanggal
    WIB) — transaksi 00:00–06:59 WIB akan hilang dari "hari ini". Kini
    memakai `localDayUtcRange()` (hari WIB = [17:00Z sebelumnya, 17:00Z)).
  - Test `shared/__tests__/date.test.ts` + `localDayUtcRange` (boundary
    01:00 WIB termasuk hari kalender yang sama).
  - Total test: **17/17 pass** (naik dari 13).

- [x] **P2 #7 — Konsistensi label checkpoint**
  - `app/api/auth/login/route.ts` dan tipe `SessionBootstrap`
    (`app/lib/config-api.ts`) disamakan dari `checkpoint: "9"` menjadi
    `"11"` — konsisten dengan config snapshot, config route, dan health.
  - Merge `app/lib/access.ts` (re-export 1 baris) sengaja **tidak**
    dilakukan — adapter tipis yang tidak mengganggu; di-defer agar diff
    minim (keputusan di PLAN-PERBAIKAN #7).

## Modul Tim & Jadwal (16 Agustus 2026)

- **Tabel baru** di `db/schema.ts`: `employees` (master karyawan — id, nama,
  posisi, area, aktif), `schedule_shifts` (jadwal shift per tanggal, unik
  per `employee_id+date`, shift `morning`/`evening`, status
  `hadir`/`izin`/`libur`/`tidak_hadir`), `pic_assignments` (penugasan PIC
  per area per tanggal, unik per `employee_id+date+area`). FK cascade dari
  `employees`; 6 index untuk query performance.
- **Migration** `drizzle/0003_jadwal_karyawan.sql` (nama deskriptif;
  awalnya auto-generate `amazing_harpoon`, di-rename sebelum commit).
  `db:generate` no-op — schema sinkron.
- **Slice `app/features/jadwal-karyawan/`** (types, constants, repo,
  validation, api, index, MANIFEST, test): `listEmployees`,
  `createEmployee`, `listSchedulesByDate`, `createSchedule` (upsert per
  employee+date), `updateScheduleStatus`, `listPicsByDate`, `assignPic`
  (upsert per employee+date+area), `getJadwalSummary`, `listJadwal`.
- **Route `app/api/jadwal-karyawan/*`** (GET/POST jadwal, GET/POST
  karyawan, POST PIC, POST `[id]/status`) — RBAC `jadwalKaryawan`
  view/manage.
- **RBAC**: modul `jadwalKaryawan` ditambahkan ke `shared/config.ts`
  (`PermissionModuleKey`, `PERMISSION_KEYS`, `createEmptyPermissions`),
  `shared/access.ts` (Super Admin full, nav label "Tim & Jadwal"),
  `db/config-repo.ts` (`assertCanViewJadwalKaryawan` /
  `assertCanManageJadwalKaryawan`), `app/lib/role-permissions.ts`
  (`PERMISSION_MODULES` + `FULL_ACCESS`), `app/page.tsx` (`NO_ACCESS`),
  `db/seed-data.json` (entri permission per 8 role).
- **Seed**: 7 karyawan awal di `db/seed-data.json` (`emp-budi`, `emp-siti`,
  dst.) + `db/seed-data.ts` (`SEED_EMPLOYEES`) + `scripts/db-seed.mjs`
  (insert idempotent `ON CONFLICT(id) DO NOTHING`).
- **Nav**: "Tim & Jadwal" (👥) ditambahkan ke `sidebar-navigation.tsx`.
- **UI** `app/jadwal-karyawan/page.tsx`: rekap metrik harian (total
  terjadwal, shift pagi/sore aktif, tidak hadir, PIC), form atur jadwal
  + assign PIC + tambah karyawan (hanya `manage`), tabel jadwal dengan
  badge status kehadiran. Styling via class CSS eksplisit di
  `app/globals.css` (`.jadwal-*`, `.badge-*`) — tanpa inline style.
- **Test**: `app/features/jadwal-karyawan/__tests__/repo.test.ts` — 9 test
  logic-level (createEmployee validasi+trim, listEmployees activeOnly,
  createSchedule upsert+default, listSchedulesByDate filter+urutan,
  updateScheduleStatus+not found, assignPic upsert+multi-area,
  listPicsByDate urutan area+nama, getJadwalSummary hitungan shift/absen,
  listJadwal response). `tests/test-utils.mjs` diupdate: 3 tabel baru
  ditambahkan ke `WORK_TABLES` untuk truncate per test.
- Migration 0003 hanya dijalankan di DB lokal/test; **rollout Postgres
  remote menunggu otorisasi owner** (AGENTS.md).
- Validasi: type-check hijau, lint 0 error (warning pre-existing),
  `db:generate` no-op.
