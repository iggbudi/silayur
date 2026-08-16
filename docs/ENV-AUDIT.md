# Environment Audit — CP12 Deploy Readiness

> ⚠️ **Dokumen era Turso (sebelum migrasi Postgres, dipertahankan sebagai
> catatan historis)**. Project sekarang memakai **PostgreSQL** via
> `DATABASE_URL` (lihat `db/get-db.ts`). Referensi `TURSO_DATABASE_URL` /
> `TURSO_AUTH_TOKEN` di bawah **tidak berlaku lagi**; satu-satunya kredensial
> DB adalah `DATABASE_URL` (plus `TEST_DATABASE_URL` untuk test).

> **Dibuat**: 29 Juli 2026 · **Auditor**: agent (Fase B) · **Tujuan**:
> inventaris environment variables, secrets, dan konfigurasi yang
> dibutuhkan untuk deploy.
>
> **Catatan deploy saat ini**: project di-publish ke GitHub (`git push origin
> main`) dan **deploy tidak lagi menggunakan ChatGPT Sites tooling** — production
> dijalankan owner di server sendiri dengan `npm run build` + `npm run start`.
> Seluruh referensi "Sites", "`.openai/hosting.json`", dan "wrangler" di bawah
> adalah sisa catatan historis era Cloudflare/OpenAI-Sites dan **tidak berlaku**.

---

## 📁 File Konfigurasi yang Terlibat

| File | Purpose | Tracked by Git? |
|---|---|---|
| `.env` | Local environment untuk Node scripts (`db:migrate`, `db:seed`, `db:check`, `auth:set-password`) | ❌ No (di `.gitignore`) |
| `.env.example` | Template `.env` (no secrets) | ✅ Yes |
| `.dev.vars` | Local environment untuk **vinext dev** (simulasi env runtime) | ❌ No (di `.gitignore`) |
| `worker/index.ts` | Entry point worker, baca env via `interface Env` | ✅ Yes |
| `wrangler.toml` (jika ada) | Konfigurasi worker (historis, tidak dipakai sekarang) | N/A (tidak ada di repo saat ini) |

---

## 🔐 Secrets & Credentials

### Status per 29 Juli 2026

| Secret | Local (.env) | Server produksi | Status |
|---|---|---|---|
| `TURSO_DATABASE_URL` | `libsql://silayur-nayantaka.aws-us-east-1.turso.io` | (perlu inject, historis) | ⚠️ Era Turso — lihat catatan historis di atas |
| `TURSO_AUTH_TOKEN` | `eyJ...` (JWT) | (perlu inject) | ⚠️ Kredensial yang sama |
| `DIGITAMA_SEED_ADMIN_PASSWORD` | (kosong/tidak ada) | (tidak perlu — admin sudah di-set) | ✅ Tidak perlu untuk re-deploy |
| `DIGITAMA_NEW_PASSWORD` | (env-only, tidak di-commit) | N/A | ✅ Env-only |

### ⚠️ Temuan

1. **`.env` aktif menggunakan Turso remote**, bukan file lokal. Ini berarti
   setiap kali `npm run db:migrate` / `db:seed` / `db:check` dijalankan,
   ia akan **menyentuh Turso remote** — bukan DB lokal.

   **Rekomendasi untuk development safety**:
   - Saat develop fitur, comment `TURSO_DATABASE_URL` di `.env` ke
     `file:./.data/silayur.db` agar migrate/seed tidak ganggu remote.
   - Hanya uncomment saat owner yang menjalankan untuk sync ke remote.

2. **`.dev.vars` untuk vinext dev** = sama dengan `.env`. Saat `vinext dev`
   dijalankan, env akan ter-inject ke `process.env` via `exposeTursoEnv`
   di `worker/index.ts` line 31-41 (catatan historis era Turso).

---

## 🗂 Metadata Hosting (legacy — tidak berlaku)

Dokumen historis Cloudflare/OpenAI-Sites. Project kini **tidak lagi memakai
ChatGPT Sites tooling**; deploy dilakukan owner di server sendiri via
`npm run build` + `npm run start`.

```json
{
  "project_id": "appgprj_6a61ceb6ee18819192df17f590744025",
  "d1": null,
  "r2": null
}
```

File ini hanya disisakan agar `vite.config.ts` tetap bisa di-build seperti
sebelumnya; bukan penentu mekanisme deploy saat ini.

---

## 🧱 Worker Entry Point

File: `worker/index.ts`

### Interface `Env`
```ts
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  IMAGES: { input(...).transform(...).output(...) };
}
```
- [ ] Database Turso target sudah di-migrate ke CP12 (lihat `DEPLOY-CHECKLIST.md` step 1)

---

## 🔄 Diff `.env` vs `.env.example`

Per 29 Juli 2026, `.env` berisi:
```ini
TURSO_DATABASE_URL=libsql://silayur-nayantaka.aws-us-east-1.turso.io
TURSO_AUTH_TOKEN=eyJhbGc...  (JWT)
```

`.env.example` (template) berisi:
```ini
TURSO_DATABASE_URL=file:./.data/silayur.db
# TURSO_AUTH_TOKEN=
# DIGITAMA_SEED_ADMIN_PASSWORD=
# DIGITAMA_NEW_PASSWORD=
```

**Rekomendasi**:
- Saat onboard developer baru, minta mereka copy `.env.example` → `.env` dan
  isi kredensial Turso mereka sendiri (atau minta owner share dev DB).
- Untuk CI/CD atau testing, sediakan `.env.test` dengan `file:./.data/test.db`.

---

## 🚨 Risiko & Catatan

1. **Token JWT di-commit accidentally** — saat ini `.env` di-gitignore.
   Selalu cek `git status` sebelum commit. CI/CD harus redact `TURSO_AUTH_TOKEN`
   dari log.

2. **Token rotation** — Turso mendukung rotation. Jika di-rotate,
   update `.env`, `.dev.vars`, dan env server produksi **bersamaan**.
   Tanpa sinkron, aplikasi produksi akan 500 dengan auth error.

3. **Backup `.env` ke secret manager** — untuk production, idealnya
   `.env` di-rotate ke Secrets Manager (1Password, Bitwarden, AWS SSM, dll).
   Saat ini masih plain file di workstation owner.

4. **Tidak ada `wrangler.toml`** — Vinext/Vite mungkin generate otomatis
   saat build. Tidak ada yang perlu ditambahkan untuk CP12.

---

## 📋 Untuk Owner (deploy di server sendiri)

Saat deploy pertama kali ke server produksi:
1. Pastikan env vars di server = sama dengan di `.env`
2. Build & jalankan (`npm run build` + `npm run start`)
3. Smoke test (lihat `DEPLOY-CHECKLIST.md`)
4. Jika ada perbedaan DB schema antara local & remote → migrate remote
   dulu (lihat `DEPLOY-CHECKLIST.md` step 1)

Saat env rotation:
1. Update `.env` (lokal)
2. Update env server produksi
3. Update `.dev.vars` (untuk `vinext dev`)
4. Restart local dev server
5. Re-build & restart server produksi (agar env baru aktif)

---

## 📝 Catatan Versi

- **v1** (29 Juli 2026) — initial environment audit
- Author: agent (Fase B)
- Reviewer: owner DIGITAMA


### Yang Terjadi Saat Request Masuk
1. `exposeTursoEnv(env)` → copy `TURSO_DATABASE_URL` & `TURSO_AUTH_TOKEN` dari
   Worker bindings ke `process.env` (line 31-41).
2. Path `/_vinext/image` → handle image optimization.
3. Path lain → delegate ke `vinext/server/app-router-entry` (handler Next.js).

### Catatan untuk Deploy
- Worker HARUS bisa baca `DATABASE_URL` (Postgres) dari env di runtime;
  set di environment/`.env` server produksi milik owner.
- Env `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` di bawah hanya catatan historis
  era Turso dan tidak lagi berlaku.
- Tanpa env ini, request ke route yang butuh DB (mis. `/api/sales`) akan
  error "DATABASE_URL required".

---

## 📋 Verifikasi Environment Server Produksi

Sebelum deploy, owner perlu memverifikasi di server tujuan (Postgres):

- [ ] Env `DATABASE_URL` (Postgres) benar di environment/`.env` server produksi
  (bukan file developer yang ter-commit).
- [ ] Build command: `npm run build` (sesuai `package.json` script)
- [ ] Output directory: `dist/` (lihat `vite.config.ts`)
- [ ] Runtime: Node `>=22.13`
- [ ] Database target sudah di-migrate (lihat `DEPLOY-CHECKLIST.md` step 1)

---


3. **Set env vars** di environment/`.env` server produksi (bukan committable
   file). Contoh nilai yang perlu diset di target:

   ```bash
   # .env server produksi
   DATABASE_URL=postgres://user:pass@host:5432/silayur
   # DIGITAMA_SEED_ADMIN_PASSWORD, DIGITAMA_NEW_PASSWORD bila perlu reset/re-seed
   ```

   Perintah `wrangler secret put` dan "Sites UI" di bawah adalah sisa catatan
   historis era Cloudflare/OpenAI-Sites dan **tidak berlaku**.
