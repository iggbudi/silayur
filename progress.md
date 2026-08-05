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
