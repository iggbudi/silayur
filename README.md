# SILAYUR Dashboard

Dashboard operasional Silayur Park berbasis React/vinext, Turso/libSQL, dan
Drizzle ORM. Checkpoint 9 memusatkan konfigurasi di database dan menggunakan
sesi autentikasi server-side.

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

Untuk mengganti password tanpa mengirimkannya sebagai argumen command line:

```bash
# set SILAYUR_NEW_PASSWORD di environment terlebih dahulu
npm run auth:set-password -- admin.resepsionis
```

## Arsitektur

- `app/` — halaman, komponen, hooks, dan route API.
- `shared/` — kontrak domain, RBAC, serta primitive password/session.
- `db/schema.ts` — schema Drizzle.
- `db/config-repo.ts` — transaksi konfigurasi.
- `db/auth-repo.ts` — password login dan sesi cookie.
- `db/seed-data.json` — satu-satunya sumber default/seed.
- `drizzle/` — migration SQL.
- `worker/` — entry point Cloudflare Worker untuk vinext.

Data persisten mencakup modul, role, permission, pengguna, tiket/tarif, jam
operasional, fasilitas/wahana, dan sumber pendapatan.

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
