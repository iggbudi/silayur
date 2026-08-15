# SILAYUR Dashboard

Dashboard operasional Silayur Park berbasis React/vinext, Turso/libSQL, dan
Drizzle ORM. Checkpoint 11 menggunakan sesi autentikasi server-side dan master
tiket masuk terstruktur dengan tarif efektif.

## Persyaratan

- Node.js `>=22.13.0`
- Database Turso atau file libSQL lokal

## Menjalankan secara lokal

1. Salin `.env.example` menjadi `.env`.
2. Gunakan URL file lokal atau isi kredensial Turso.
3. Isi `SILAYUR_SEED_ADMIN_PASSWORD` dengan password minimal 10 karakter.
4. Jalankan:

```bash
npm install
npm run db:setup
npm run dev
```

Masuk menggunakan username `admin.resepsionis` dan password yang dipakai saat
seed.

## Perintah penting

```bash
npm run type-check
npm run lint
npm test
npm run build
npm run db:migrate
npm run db:seed
npm run db:check
```

Untuk mengganti password tanpa mengirimkannya sebagai argumen command line.
Penggantian password otomatis mencabut seluruh sesi aktif pengguna tersebut:

```bash
# set SILAYUR_NEW_PASSWORD di environment terlebih dahulu
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

Metadata Sites berada di `.openai/hosting.json`. Deployment sengaja tidak
dijalankan selama verifikasi lokal; lakukan migration dan konfigurasi password
database target sebelum menerbitkan versi baru.

### Menjalankan di lokal (database file)

```bash
npm run start:local
```

Menjalankan build lalu server standalone (Node) di `http://localhost:3000`.
Mode ini memakai database file lokal (`.data/silayur.db` sesuai `.env`) dan
mendukung semua fitur. Login demo: `admin.resepsionis` / `SilayurLocal-2026!`
(password sesuai `SILAYUR_SEED_ADMIN_PASSWORD` di `.env`).

> `npm run dev` memakai workerd (Miniflare) yang **tidak** mendukung database
> file `file:` — gunakan hanya saat `.env` menunjuk Turso remote.

## Dokumentasi

- [`AGENTS.md`](./AGENTS.md) — pedoman kerja agent: workflow sprint, aturan kode & keamanan.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — filosofi & struktur organisasi kode.
- [`docs/PLAN-PERBAIKAN.md`](./docs/PLAN-PERBAIKAN.md) — rencana perbaikan hasil audit & statusnya.
- [`docs/folder-map.md`](./docs/folder-map.md) — visual map folder & slice.
- [`docs/adr/0001-hybrid-layered-with-co-location.md`](./docs/adr/0001-hybrid-layered-with-co-location.md) — keputusan arsitektur (ADR).
- [`app/slices/MANIFEST.md`](./app/slices/MANIFEST.md) — manifest 6 slice domain.
- [`app/features/README.md`](./app/features/README.md) — konvensi vertical slice untuk fitur baru.
- [`progress.md`](./progress.md) — status implementasi per checkpoint & fase arsitektur.
