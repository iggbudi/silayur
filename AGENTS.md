# AGENTS.md — Pedoman Agent untuk DIGITAMA Dashboard

Pedoman kerja untuk agent coding (pi, Claude Code, Codex, dll.) yang bekerja
di repositori ini. Sebelum mulai, baca juga
[`ARCHITECTURE.md`](./ARCHITECTURE.md) (filosofi & struktur),
[`README.md`](./README.md) (setup & perintah), dan
[`progress.md`](./progress.md) (status per checkpoint).

---

## Workflow Sprint (WAJIB — setiap unit kerja)

Setiap perubahan mengikuti siklus **4 langkah berurutan**:

1. **Kerjakan** — implementasi mengikuti aturan di bawah (slice boundary,
   konvensi, keamanan). Satu unit kerja = satu masalah/fitur yang kohesif;
   jangan mencampur hal yang tidak terkait.
2. **Test lokal** — jalankan gerbang lengkap sebelum menyatakan selesai:

   ```bash
   npm run type-check
   npm run lint
   npm test          # termasuk production build + semua behavior test
   ```

   Semua error dan warning **baru** wajib diperbaiki. Jangan lanjut ke
   langkah 3 selama gerbang merah.
3. **Update docs** — sinkronkan dokumentasi yang terdampak:
   - `progress.md` — catat status per checkpoint/fase (ikon `[x]` / `[~]`).
   - `ARCHITECTURE.md` / `docs/folder-map.md` — bila struktur, slice, atau
     boundary berubah.
   - `docs/` — runbook/ADR baru bila perilaku operasional berubah (deploy,
     tarif, env, dsb.).
   - `README.md` — bila perintah atau arsitektur tingkat tinggi berubah.
   - Jangan menulis ulang riwayat; tambahkan delta yang akurat.
4. **Commit** — satu commit per unit kerja, pesan conventional commits
   (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`) dengan scope
   opsional (mis. `feat(sales): ...`). Review `git diff` sebelum commit;
   pertahankan pekerjaan user yang tidak terkait.

---

## Batasan yang Tidak Boleh Dilanggar

- **Jangan jalankan migrasi database remote (Postgres produksi) / deploy ke
  server produksi tanpa otorisasi eksplisit dari owner.** Validasi lokal TIDAK
  sama dengan izin produksi.
- **Jangan percaya identitas dari header client.** Identitas & permission
  selalu ditentukan server-side dari sesi (cookie `HttpOnly`).
- **Jangan commit** `.env` / `.dev.vars` (di-ignore, berisi rahasia lokal)
  dan jangan meletakkan password/token di kode.
- **Jangan edit file migration yang sudah di-commit.** Perubahan schema
  = migration baru via `npm run db:generate`.

---

## Deployment di Server Ini (digitama.nusadev.biz.id)

> Fakta operasional spesifik server VPS tempat repo ini berjalan. Bacalah
> sebelum mengubah kode, menjalankan perintah npm, atau me-restart service.
> Runbook umum: [`docs/DEPLOY-VPS-UBUNTU.md`](./docs/DEPLOY-VPS-UBUNTU.md)
> (catatan: server ini memakai **Apache**, bukan Caddy/Nginx).

### Topologi

- VPS Ubuntu (VM-13-18-ubuntu). Cloudflare di depan, lalu Apache
  (mod_proxy + Let's Encrypt) sebagai reverse proxy TLS, lalu app Node.
- Folder repo: **`/var/www/digitama.nusadev.biz.id`** (BUKAN `/opt/digitama`
  seperti contoh runbook). Seluruh isi dimiliki `www-data:www-data` — semua
  perintah npm/git harus dijalankan sebagai `www-data` (mis. `sudo -u www-data
  npm ...`) atau via `sudo`.
- App: Next.js/vinext standalone, dijalankan systemd `digitama.service`,
  bind **`127.0.0.1:3015`** — JANGAN pernah mengekspos port ini ke publik.
- **Branch aktif di server: `digitama`** (bukan `main`). Update kode via
  `git pull origin digitama`; kode baru dari upstream masuk lewat
  `git merge origin/main` (lihat alur di bawah). `main` lokal tetap
  disinkronkan ke `origin/main` hanya sebagai sumber merge.

### Service systemd (`digitama.service`)

- File: `/etc/systemd/system/digitama.service` (bukan contoh di
  `scripts/systemd/` — sudah disesuaikan untuk server ini).
- `User=www-data`, `WorkingDirectory=/var/www/digitama.nusadev.biz.id`,
  `EnvironmentFile=/var/www/digitama.nusadev.biz.id/.env`.
- `ExecStart=/opt/node-v24.14.1/bin/npm run start -- --hostname 127.0.0.1
  --port 3015`.
- Node: **`/opt/node-v24.14.1`** (v24.14.1). JANGAN pakai
  `/home/ubuntu/.nvm/...` — `www-data` tidak bisa mengakses `/home/ubuntu`
  (service gagal dengan `203/EXEC Permission denied`).
- Perintah: `sudo systemctl status|restart|stop digitama`;
  log: `sudo journalctl -u digitama -f`.

### Port

- **3015** khusus DIGITAMA. Port **3000–3012** sudah dipakai app lain
  (safesphere:3000, eduguide:3003, dll). Sebelum mengganti port, cek
  `ss -tlnp` agar tidak bentrok; jika ganti port, update BUKAN hanya unit
  systemd tapi juga `ProxyPass` di vhost Apache.

### Database (PostgreSQL 18 lokal)

- User `digitama`; DB **`silayur`** (produksi) & **`silayur_test`** (test).
- Kredensial & env di `.env` (chmod 600, milik `www-data`) — JANGAN commit.
- Env penting: `DATABASE_URL`, `TEST_DATABASE_URL`,
  `DIGITAMA_SEED_ADMIN_PASSWORD` (hanya dipakai saat seed pertama),
  `VINEXT_TRUST_PROXY=1` (WAJIB agar cookie sesi ber-flag `Secure` di
  belakang proxy TLS).

### Deploy / Update (alur cepat)

```bash
cd /var/www/digitama.nusadev.biz.id
# Branch aktif server: digitama. Ambil update dari branch ini:
sudo -u www-data git pull origin digitama
# Bila ada rilis baru dari upstream (origin/main), gabungkan dulu:
#   sudo -u www-data git merge origin/main
sudo -u www-data npm ci
# Bila ada migration baru: backup DB dulu, baru:
sudo -u www-data npm run db:migrate
sudo -u www-data npm run build
sudo systemctl restart digitama
curl -sI https://digitama.nusadev.biz.id/   # harapannya 200
```

> Jangan pernah push ke `origin/main` dari server — perubahan spesifik server
> (docs, konfigurasi) di-commit ke branch `digitama` saja.

> `db:migrate` menyentuh DB produksi (`silayur`) → tetap butuh otorisasi
> eksplisit owner (lihat Batasan di atas), meskipun server ini sendiri.

### Test lokal di server

- `npm test` butuh `TEST_DATABASE_URL` (sudah diisi di `.env`; helper test
  membaca `.env` sendiri). Karena `.env` chmod 600 milik `www-data`, jalankan
  sebagai `www-data`: `sudo -u www-data npm test` (atau ekspor env manual).
- Test memakai DB `silayur_test` (di-reset per run) — aman berjalan saat
  service produksi aktif. `npm run db:setup` TIDAK aman dijalankan sembarangan
  (menyentuh `silayur` produksi).

### Apache reverse proxy

- Vhost 443: `/etc/apache2/sites-available/digitama.nusadev.biz.id-le-ssl.conf`
  → `ProxyPass / http://127.0.0.1:3015/` + `ProxyPreserveHost On` +
  `RequestHeader set X-Forwarded-Proto "https"`;
  `ProxyPass /.well-known/ !` (agar renewal certbot tetap jalan).
- Setelah mengubah config: `sudo apache2ctl configtest && sudo systemctl
  reload apache2`.

### Password admin

- Seed awal membuat `admin.resepsionis` dengan password dari
  `DIGITAMA_SEED_ADMIN_PASSWORD` (hanya dipakai saat seed pertama).
- Ganti password tanpa argumen CLI:
  `DIGITAMA_NEW_PASSWORD=xxx sudo -u www-data npm run auth:set-password -- admin.resepsionis`

---

## Aturan Arsitektur & Impor

- Organisasi kode: **hybrid (layered + co-located + vertical slice)**.
  Domain existing (auth, settings, ticket-master) tetap di lokasinya; fitur
  baru self-contained di `app/features/<nama>/`.
- **Public API per slice**: `index.ts` adalah satu-satunya pintu impor dari
  luar slice. Deep import ke internal slice dilarang.
- Import langsung ke `db/*-repo.ts` dan `shared/*` dari `app/api/**` boleh
  (belum dimigrasi penuh), tapi impor ke internal slice
  (mis. `@slices/auth/internal/...`) dilarang.
- `app/api/**` = **thin handler**: parsing, autentikasi, RBAC, same-origin,
  JSON. Logika bisnis di repo/feature, bukan di route.
- Path alias: `@/` (root), `@shared/*`, `@db/*`, `@app/*`, `@features/*`,
  `@slices/*` (lihat `tsconfig.json`).

---

## Aturan Data & Database

- **Single source of truth**:
  - Schema: `db/schema.ts` (Drizzle) — jangan definisikan ulang di tempat lain.
  - Default/seed: `db/seed-data.json` — seed **idempotent, hanya menambah**;
    JANGAN menimpa perubahan operasional.
  - Type domain & konstanta: `shared/config.ts`.
- Setiap perubahan schema disertai **migration Drizzle**
  (`npm run db:generate`); file migration + snapshot di-commit **bersama**
  kode dalam commit yang sama.
- Akses data lewat repo per domain di `db/` (`*-repo.ts`), bukan query
  tersebar di komponen/route.
- Perubahan konfigurasi majemuk harus dalam **satu transaksi atomik**
  (pola `saveConfigPatch`).
- **Snapshot pricing**: transaksi yang menyimpan nilai historis (harga, nama
  produk) wajib men-freeze nilai di baris transaksi (pola `sale_items`).

---

## Aturan Keamanan (wajib untuk API baru)

Setiap route API pembacaan sensitif & mutasi WAJIB:

1. `assertSameOrigin(request)` untuk mutasi.
2. `requireRequestUser(db, request)` untuk autentikasi.
3. Cek **RBAC sesuai modul**: `assertCanView<Module>` /
   `assertCanManage<Module>` (pola `assertCanViewSettings` /
   `assertCanManageSettings` di `db/config-repo.ts`).
   ⚠️ JANGAN meniru route yang hanya cek autentikasi tanpa RBAC — itu celah
   akses (pernah terjadi di `app/api/sales/route.ts`).
4. Error response via `jsonError` dengan status yang tepat; jangan bocorkan
   detail internal pada status >= 500 di production (sudah ditangani
   `db/http.ts`).

---

## Aturan Testing

- Test co-located dengan source: folder `__tests__/` di sebelah file
  (`*.test.ts` / `*.test.mjs`).
- Test slice wajib **logic-level** (pricing, transaksi, RBAC, boundary
  tanggal) — bukan sekadar signature/placeholder.
- Pastikan glob `npm test` di `package.json` menjangkau file test baru
  (suffix `.test.mjs` / `.test.ts` sesuai pattern yang ada).
- Semua perubahan wajib melewati `npm run type-check`, `npm run lint`,
  dan `npm test` sebelum commit.

---

## Konvensi Kode

- ESM (`type: module`), TypeScript strict.
- Format: 2 spasi, double quotes, semicolon, trailing comma.
- React: function components; styling via class CSS eksplisit di
  `app/globals.css` + token di `app/styles/`; hindari inline style.
- Bahasa antarmuka & pesan error: **Bahasa Indonesia**; identifier kode
  tetap Bahasa Inggris (kecuali domain value seperti `validFrom`).
- **Tanggal**: kolom waktu (`sold_at`, `created_at`) disimpan sebagai ISO
  UTC. Fungsi yang mengelompokkan "hari ini" (receipt prefix, `visit_date`,
  filter tanggal) HARUS memakai helper tanggal lokal Asia/Jakarta
  (rencana: `shared/date.ts`) — jangan langsung
  `toISOString().slice(0, 10)`.
- Jangan menambah dependency baru tanpa kebutuhan jelas; `npm audit` harus
  tetap 0 kerentanan.

---

## Referensi

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — filosofi & struktur organisasi kode.
- [`docs/folder-map.md`](./docs/folder-map.md) — map folder & slice.
- [`docs/adr/0001-hybrid-layered-with-co-location.md`](./docs/adr/0001-hybrid-layered-with-co-location.md)
  — keputusan arsitektur (ADR).
- [`docs/PLAN-PERBAIKAN.md`](./docs/PLAN-PERBAIKAN.md) — daftar perbaikan
  hasil audit & statusnya.
- [`progress.md`](./progress.md) — status implementasi per checkpoint.
