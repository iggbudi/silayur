# DIGITAMA Dashboard

Dasbor operasional tempat wisata berbasis React/vinext, PostgreSQL, dan
Drizzle ORM. Nama taman yang ditampilkan di sistem (login, dashboard,
laporan) dapat disetel di menu **Pengaturan → Identitas taman**. Checkpoint 11
menggunakan sesi autentikasi server-side dan master tiket masuk terstruktur
dengan tarif efektif.

## Persyaratan

- Node.js `>=22.13.0`
- PostgreSQL (lokal, mis. `localhost:5432`)

## Menjalankan secara lokal

1. Salin `.env.example` menjadi `.env`, isi `DATABASE_URL` (`postgres://...`).
2. Buat database dev + test bila belum ada.
3. Isi `DIGITAMA_SEED_ADMIN_PASSWORD` dengan password minimal 10 karakter.
4. Jalankan:

```bash
npm install
npm run db:setup
npm run start:local
```

`npm run start:local` melakukan build lalu menjalankan server standalone di
`http://localhost:3000` (mode ini yang mendukung Postgres lokal).

Masuk menggunakan username `admin.resepsionis` dan password yang dipakai saat
seed.

> `npm run dev` memakai workerd (Miniflare) — hanya cocok bila `DATABASE_URL`
> menunjuk layanan Postgres yang bisa diakses worker.

## Perintah penting

```bash
npm run type-check
npm run lint
npm test          # butuh TEST_DATABASE_URL (Postgres)
npm run build
npm run db:migrate
npm run db:seed
npm run db:check
```

Untuk mengganti password tanpa mengirimkannya sebagai argumen command line.
Penggantian password otomatis mencabut seluruh sesi aktif pengguna tersebut:

```bash
# set DIGITAMA_NEW_PASSWORD di environment terlebih dahulu
npm run auth:set-password -- admin.resepsionis
```

## Arsitektur

- `app/` — halaman, komponen, hooks, dan route API.
- `shared/` — kontrak domain, RBAC, serta primitive password/session.
- `db/schema.ts` — schema Drizzle, termasuk produk tiket dan tarif.
- `db/config-repo.ts` — transaksi konfigurasi.
- `db/auth-repo.ts` — password login dan sesi cookie.
- `db/seed-data.json` — satu-satunya sumber default/seed.
- `drizzle/` — migration SQL.
- `worker/` — entry point Cloudflare Worker untuk vinext.

Data persisten mencakup modul, role, permission, pengguna, master tiket masuk,
tarif efektif, jam operasional, fasilitas/wahana, dan sumber pendapatan.

Master tiket awal terdiri dari kategori Dewasa dan Anak. Tarif disimpan sebagai
integer Rupiah untuk weekday atau weekend dengan periode berlaku. Hari libur
mengikuti tarif weekend; kategori Anak (usia di bawah 12 tahun) dipilih manual
oleh petugas.

## Model keamanan

- Password disimpan sebagai PBKDF2-SHA256 dengan salt acak.
- Browser menerima token sesi acak melalui cookie `HttpOnly`, `SameSite=Lax`,
  dan `Secure` pada HTTPS.
- Database hanya menyimpan hash token sesi.
- API menentukan pengguna dari sesi server; identitas dari header buatan client
  tidak dipercaya.
- Route konfigurasi dan health database diperiksa terhadap RBAC server-side.
- Perubahan konfigurasi majemuk dijalankan dalam satu transaksi.

`db:seed` hanya menambahkan data yang belum ada. Menjalankannya kembali tidak
menimpa konfigurasi operasional yang sudah berubah.

## Deployment

Publish dibuat dengan `git push` ke GitHub (`origin/main`). Deployment ke server
produksi dilakukan oleh **owner di server sendiri** (bukan ChatGPT Sites
tooling). Siapkan migration dan konfigurasi password database target sebelum
menerbitkan versi baru.

> Gubernur langkah deploy di VPS Ubuntu: lihat
> **[`docs/DEPLOY-VPS-UBUNTU.md`](./docs/DEPLOY-VPS-UBUNTU.md)** (Node +
> PostgreSQL + systemd + reverse proxy TLS).

### Menjalankan di lokal (database file)

```bash
npm run start:local
```

Menjalankan build lalu server standalone (Node) di `http://localhost:3000`.
Mode ini memakai PostgreSQL lokal (sesuai `DATABASE_URL` di `.env`) dan
mendukung semua fitur. Login demo: `admin.resepsionis` / `SilayurLocal-2026!`
(password sesuai `DIGITAMA_SEED_ADMIN_PASSWORD` di `.env`).

> `npm run dev` memakai workerd (Miniflare) — gunakan hanya saat `DATABASE_URL`
> menunjuk layanan Postgres yang bisa diakses worker; untuk Postgres lokal
> gunakan `npm run start:local`.

## Dokumentasi

- [`AGENTS.md`](./AGENTS.md) — pedoman kerja agent: workflow sprint, aturan kode & keamanan.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — filosofi & struktur organisasi kode.
- [`docs/PLAN-PERBAIKAN.md`](./docs/PLAN-PERBAIKAN.md) — rencana perbaikan hasil audit & statusnya.
- [`docs/DEPLOY-VPS-UBUNTU.md`](./docs/DEPLOY-VPS-UBUNTU.md) — runbook deploy ke VPS Ubuntu (Node + Postgres + systemd + TLS).
- [`docs/folder-map.md`](./docs/folder-map.md) — visual map folder & slice.
- [`docs/adr/0001-hybrid-layered-with-co-location.md`](./docs/adr/0001-hybrid-layered-with-co-location.md) — keputusan arsitektur (ADR).
- [`app/slices/MANIFEST.md`](./app/slices/MANIFEST.md) — manifest 6 slice domain.
- [`app/features/README.md`](./app/features/README.md) — konvensi vertical slice untuk fitur baru.
- [`progress.md`](./progress.md) — status implementasi per checkpoint & fase arsitektur.
