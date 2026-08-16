# Deployment Runbook — CP12 (UI Penjualan + Master Tiket)

> ⚠️ **Dokumen era Turso (sebelum migrasi Postgres, dipertahankan sebagai
> catatan historis)**. Project sekarang memakai **PostgreSQL** via
> `DATABASE_URL` (lihat `db/get-db.ts`). Seluruh referensi
> `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, dan perintah `turso ...` di bawah
> **tidak berlaku lagi** — gunakan `npm run db:migrate` / `db:seed` /
> `db:check` dengan `.env` yang menunjuk target Postgres yang benar.

> **Tujuan**: mendeploy UI Checkpoint 10–12 ke Cloudflare Sites sehingga
> user (operator loket, admin) bisa mengakses menu **Penjualan** di
> sidebar dan fitur **Master Tiket & Tarif** dari `/pengaturan`.
>
> **Status saat dokumen ini ditulis (29 Juli 2026)**:
> - Kode UI sudah selesai & tervalidasi lokal (type-check ✅, lint ✅, 6/6 test ✅)
> - DB schema CP11 (master tiket) sudah ter-apply ke Turso target (lihat `progress.md`)
> - DB schema CP12 (sales + sale_items) **status belum pasti di remote**
> - Migration lokal **belum dijalankan** untuk CP11/CP12 di file `.data/*.db`
>
> **Tujuan runbook ini**: memberikan langkah terstruktur, **aman, dan
> reversible** untuk owner yang akan memvalidasi & mendeploy.

---

## ⚠️ Prinsip Keamanan

Sesuai `.serena/memories/task_completion.md`:

> Do not run remote Turso migrations or Sites deployment without task
> authorization; local validation alone does not authorize production
> mutation.

- **Jangan** jalankan `npm run db:migrate` terhadap Turso **remote/production**
  kecuali owner sudah memberi otorisasi eksplisit.
- **Jangan** deploy ke Sites tanpa smoke test lokal & staging pass.
- **Backup DB** sebelum migrate (lihat bagian "Rollback").
- **Password admin** disimpan di environment, **bukan** di commit.
- **`.env` dan `.dev.vars` TIDAK BOLEH** masuk ke git (cek `.gitignore`).

---

## 📋 Pre-Deploy Checklist

### A. Verifikasi Kode
- [ ] Branch `main` adalah target deploy
- [ ] Commit terbaru sudah termasuk perubahan Fase A (sidebar nav, summary update, MANIFEST)
- [ ] `npm run type-check` → hijau
- [ ] `npm run lint` → 0 error
- [ ] `npx tsx --test app/features/ticket-sales/__tests__/repo.test.ts` → 2/2 pass
- [ ] `git status` bersih (tidak ada uncommitted change yang akan ter-deploy)

### B. Verifikasi DB Lokal (Read-Only)
- [ ] Jalankan: `node scripts/db-check-local-fase-b.mjs`
- [ ] Pastikan file `.data/silayur.db` punya tabel `ticket_products`, `ticket_prices`, `sales`, `sale_items` (setelah migrate lokal)
- [ ] Jika belum, jalankan: `npm run db:migrate` (lokal) dan `npm run db:seed` (lokal)

### C. Verifikasi DB Remote
- [ ] Kredensial `TURSO_DATABASE_URL` & `TURSO_AUTH_TOKEN` di `.env` valid
  - Saat ini: `libsql://silayur-nayantaka.aws-us-east-1.turso.io`
- [ ] Cek tabel remote: `turso db shell silayur-nayantaka ".tables"`
- [ ] Pastikan tabel `sales`, `sale_items` sudah ada di remote (CP12)
- [ ] Jika belum, lihat bagian "Apply Migration ke Remote"

### D. Verifikasi Environment Sites
- [ ] `.openai/hosting.json` ada dan valid (cek `project_id`)
- [ ] Sites environment variables tersedia: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- [ ] `worker/index.ts` mereference env vars dengan benar

### E. Backup
- [ ] Backup DB remote sebelum migrate: `turso db snapshot silayur-nayantaka`
- [ ] Catat tag/commit yang akan di-deploy: `git rev-parse HEAD`

- [ ] Backup DB remote sebelum migrate: `turso db snapshot silayur-nayantaka`
- [ ] Catat tag/commit yang akan di-deploy: `git rev-parse HEAD`

---

## 🚀 Langkah Deployment

### 1. Apply Migration ke Remote (jika CP12 belum ada di Turso)

```bash
# Backup dulu
turso db snapshot silayur-nayantaka --tag pre-cp12-deploy

# Apply migration
npm run db:migrate

# Verify
node scripts/db-check-local-fase-b.mjs   # tapi override TURSO_DATABASE_URL=silayur-nayantaka
```

**Rollback** jika gagal:
```bash
turso db restore silayur-nayantaka --tag pre-cp12-deploy
```

### 2. Apply Seed ke Remote (idempotent, tidak overwrite)

```bash
npm run db:seed
```

Seed **tidak akan overwrite** konfigurasi operasional yang sudah ada
(lihat `db/seed-data.ts` + idempotent insert). Aman dijalankan berulang.

### 3. Verifikasi Database

```bash
# Via db:check (cek struktur & count)
node --env-file=.env scripts/db-check.mjs

# Atau manual via tursosh
turso db shell silayur-nayantaka "SELECT COUNT(*) FROM sales;"
turso db shell silayur-nayantaka "SELECT id, name, active FROM ticket_products;"
```

Expected:
- `sales` dan `sale_items` ada (count 0)
- `ticket_products` punya 2 row: `TKT-DEWASA`, `TKT-ANAK`
- `ticket_prices` mungkin masih kosong (perlu diaktifkan manual — lihat `TARIFF-ACTIVATION.md`)

### 4. Konfigurasi Password Admin (jika perlu)

Password Super Admin harus di-set di **target environment**, bukan di kode:

```bash
# Set DIGITAMA_NEW_PASSWORD di environment
export DIGITAMA_NEW_PASSWORD="password-rahasia-min-10-karakter"

# Apply ke user admin
npm run auth:set-password -- admin.resepsionis
```

**Atau** lewat UI `/pengaturan` → tab User → reset password.

Pergantian password **otomatis mencabut semua sesi lama** user tsb
(per `progress.md` Checkpoint 9).

### 5. Build & Deploy ke Sites

```bash
# 1. Build
npm run build

# 2. Deploy ke Sites (gunakan ChatGPT Sites tooling, bukan wrangler langsung)
#    Cek dokumentasi Sites internal untuk command persis
#    Umumnya: trigger lewat host platform yang mengelola project_id di .openai/hosting.json
```

**Catatan penting**:
- Sites otomatis inject `TURSO_DATABASE_URL` & `TURSO_AUTH_TOKEN` dari
  konfigurasi Sites (lihat `.openai/hosting.json`).
- **Tidak** commit `.env` atau `.dev.vars` — Sites tidak akan bisa baca
  kredensial dari file yang tidak ter-commit.
- Worker `worker/index.ts` baca env via `exposeTursoEnv(env)` (line 31-41)
  lalu set ke `process.env` untuk handler.

### 6. Post-Deploy Smoke Test

#### a. Cek halaman utama
```bash
curl -I https://silayur-dashboard.cakilbiru.chatgpt.site/
# Expected: 200 OK atau 302 ke /login
```

#### b. Login sebagai admin
- Buka `https://silayur-dashboard.cakilbiru.chatgpt.site/login`
- Login dengan `admin.resepsionis` + password yang sudah di-set
- Expected: redirect ke `/` (dashboard) tanpa splash

#### c. Cek nav "Penjualan"
- Sidebar kiri harus menampilkan item **Penjualan** (icon ₹)
- Klik → harus navigasi ke `/penjualan`
- URL `/penjualan` langsung harus accessible (bukan 404)

#### d. Cek Master Tiket
- Buka `/pengaturan` → tab "Tiket & Tarif"
- Expected: menampilkan 2 produk (Dewasa, Anak)
- Cek produk active/non-active sesuai konfigurasi

#### e. Cek API Sales
```bash
# List sales hari ini (perlu session cookie dari login)
curl -b "session=..." https://silayur-dashboard.cakilbiru.chatgpt.site/api/sales
# Expected: { date, count, revenue, sales: [] }
```

#### f. Input transaksi uji (jika tarif sudah diaktifkan)
- Di `/penjualan`, pilih produk, isi quantity, klik "Catat Penjualan"
- Expected: transaksi masuk history, summary count & revenue update
- Refresh halaman → transaksi masih ada (snapshot pricing stabil)

#### g. Cek hari libur
- Ubah system clock ke Sabtu/Minggu, lalu refresh `/penjualan`
- Cek harga di form: harusnya pakai tarif weekend (jika diaktifkan)

---

## 🆘 Rollback Plan

### Rollback Kode (Sites)

Sites umumnya punya mekanisme rollback ke deployment sebelumnya. Identifikasi deployment ID sebelumnya, lalu trigger rollback.

### Rollback DB (jika migration CP12 gagal)

```bash
# Sebelum migrate, snapshot selalu dibuat
turso db restore silayur-nayantaka --tag pre-cp12-deploy
```

### Rollback Per-Fase Kode

Sesuai `REKAP-ARSITEKTUR.md`:

```bash
# Rollback semua fase arsitektur
git revert 3386d3c 1f1552b 23e9a23 e8c7c3a 6b3cd7a 5737833

# Rollback spesifik Fase 5 (pilot slice)
git revert 5737833
```

---

## 🔍 Troubleshooting

### Symptom: "Tarif X untuk Y belum dikonfigurasi" saat input sale
- Master tarif belum diaktifkan. Lihat `TARIFF-ACTIVATION.md`.
- Atau ada produk non-aktif di `ticket_products`.

### Symptom: Sidebar tidak menampilkan "Penjualan"
- User tidak punya permission `visitors` ≥ `view`.
- Cek di `/pengaturan` → Role & Permission → role user.
- Atau user non-Super Admin belum di-grant akses `visitors`.

### Symptom: 500 di `/penjualan` setelah deploy
- Cek `turso db shell` untuk struktur tabel
- Pastikan migration 0003 sudah ter-apply
- Lihat logs Sites untuk stack trace

### Symptom: Login loop / tidak bisa login
- Password admin salah / belum di-set di environment target
- Cookie `Secure` flag konflik dengan HTTP (perlu HTTPS)
- Cek `process.env.TURSO_DATABASE_URL` di runtime worker

---

## 📞 Eskalasi

- **DB issues**: cek `progress.md` → "Status Database dan Deployment"
- **Sites deployment issues**: rujuk dokumentasi internal Sites
- **Kode/arsitektur**: lihat `docs/adr/0001-hybrid-layered-with-co-location.md`

---

## 📝 Catatan Versi

- **v1** (29 Juli 2026) — initial runbook untuk CP12 deploy
- Author: agent (Fase B)
- Reviewer: owner DIGITAMA
