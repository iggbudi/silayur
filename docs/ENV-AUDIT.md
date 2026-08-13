# Environment Audit — CP12 Deploy Readiness

> **Dibuat**: 29 Juli 2026 · **Auditor**: agent (Fase B) · **Tujuan**:
> inventaris environment variables, secrets, dan konfigurasi yang
> dibutuhkan untuk deploy ke Cloudflare Sites.

---

## 📁 File Konfigurasi yang Terlibat

| File | Purpose | Tracked by Git? |
|---|---|---|
| `.env` | Local environment untuk Node scripts (`db:migrate`, `db:seed`, `db:check`, `auth:set-password`) | ❌ No (di `.gitignore`) |
| `.env.example` | Template `.env` (no secrets) | ✅ Yes |
| `.dev.vars` | Local environment untuk **Wrangler dev** (simulasi env Cloudflare Worker) | ❌ No (di `.gitignore`) |
| `.openai/hosting.json` | Metadata Sites (project_id) | ✅ Yes (no secrets) |
| `worker/index.ts` | Entry point Cloudflare Worker, baca env via `interface Env` | ✅ Yes |
| `wrangler.toml` (jika ada) | Konfigurasi Cloudflare Worker | N/A (tidak ada di repo saat ini) |

---

## 🔐 Secrets & Credentials

### Status per 29 Juli 2026

| Secret | Local (.env) | Sites (Cloudflare) | Status |
|---|---|---|---|
| `TURSO_DATABASE_URL` | `libsql://silayur-nayantaka.aws-us-east-1.turso.io` | (perlu inject) | ⚠️ Sama dengan env, harus sama di Sites |
| `TURSO_AUTH_TOKEN` | `eyJ...` (JWT) | (perlu inject) | ⚠️ Kredensial yang sama |
| `SILAYUR_SEED_ADMIN_PASSWORD` | (kosong/tidak ada) | (tidak perlu — admin sudah di-set) | ✅ Tidak perlu untuk re-deploy |
| `SILAYUR_NEW_PASSWORD` | (env-only, tidak di-commit) | N/A | ✅ Env-only |

### ⚠️ Temuan

1. **`.env` aktif menggunakan Turso remote**, bukan file lokal. Ini berarti
   setiap kali `npm run db:migrate` / `db:seed` / `db:check` dijalankan,
   ia akan **menyentuh Turso remote** — bukan DB lokal.

   **Rekomendasi untuk development safety**:
   - Saat develop fitur, comment `TURSO_DATABASE_URL` di `.env` ke
     `file:./.data/silayur.db` agar migrate/seed tidak ganggu remote.
   - Hanya uncomment saat owner yang menjalankan untuk sync ke remote.

2. **`.dev.vars` untuk Wrangler** = sama dengan `.env`. Saat `vinext dev`
   dijalankan, env akan ter-inject ke `process.env` via `exposeTursoEnv`
   di `worker/index.ts` line 31-41.
   Atau via Sites UI yang mengelola `project_id` di `.openai/hosting.json`.

---

## 🌐 Sites Metadata (`.openai/hosting.json`)

```json
{
  "project_id": "appgprj_6a61ceb6ee18819192df17f590744025",
  "d1": null,
  "r2": null
}
```

- **`project_id`**: identifier unik project di ChatGPT Sites
- **`d1: null`**: tidak menggunakan Cloudflare D1 (pakai Turso/libSQL eksternal)
- **`r2: null`**: tidak menggunakan Cloudflare R2 (pakai Turso untuk storage)

**Tidak ada perubahan** yang dibutuhkan di file ini untuk CP12.

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
# SILAYUR_SEED_ADMIN_PASSWORD=
# SILAYUR_NEW_PASSWORD=
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
   update `.env`, `.dev.vars`, dan Sites env var **bersamaan**.
   Tanpa sinkron, app di Sites akan 500 dengan auth error.

3. **Backup `.env` ke secret manager** — untuk production, idealnya
   `.env` di-rotate ke Secrets Manager (1Password, Bitwarden, AWS SSM, dll).
   Saat ini masih plain file di workstation owner.

4. **Tidak ada `wrangler.toml`** — Vinext/Vite mungkin generate otomatis
   saat build, atau Sites handle konfigurasi via UI. Tidak ada yang perlu
   ditambahkan untuk CP12.

---

## 📞 Untuk Owner

Saat deploy pertama kali ke Sites:
1. Pastikan env vars di Sites = sama dengan di `.env`
2. Build & deploy
3. Smoke test (lihat `DEPLOY-CHECKLIST.md`)
4. Jika ada perbedaan DB schema antara local & remote → migrate remote
   dulu (lihat `DEPLOY-CHECKLIST.md` step 1)

Saat env rotation:
1. Update `.env` (lokal)
2. Update Sites env vars
3. Update `.dev.vars` (untuk `vinext dev`)
4. Restart local dev server
5. Re-deploy Sites (untuk memastikan env baru aktif)

---

## 📝 Catatan Versi

- **v1** (29 Juli 2026) — initial environment audit
- Author: agent (Fase B)
- Reviewer: owner SILAYUR


### Yang Terjadi Saat Request Masuk
1. `exposeTursoEnv(env)` → copy `TURSO_DATABASE_URL` & `TURSO_AUTH_TOKEN` dari
   Worker bindings ke `process.env` (line 31-41).
2. Path `/_vinext/image` → handle image optimization.
3. Path lain → delegate ke `vinext/server/app-router-entry` (handler Next.js).

### Catatan untuk Deploy
- Worker HARUS bisa baca `TURSO_DATABASE_URL` & `TURSO_AUTH_TOKEN` dari
  env di runtime. Sites harus menyediakannya.
- Tanpa env ini, request ke route yang butuh DB (mis. `/api/sales`) akan
  error "TURSO_DATABASE_URL required".

---

## 📋 Verifikasi Environment Sites

Sebelum deploy, owner perlu verifikasi:

- [ ] Sites project untuk `appgprj_6a61ceb6ee18819192df17f590744025` sudah ada
- [ ] Sites environment variables:
  - [ ] `TURSO_DATABASE_URL` = `libsql://silayur-nayantaka.aws-us-east-1.turso.io`
  - [ ] `TURSO_AUTH_TOKEN` = (sama dengan di `.env`)
- [ ] Build command Sites: `npm run build` (sesuai `package.json` script)
- [ ] Output directory Sites: `dist/` (lihat `vite.config.ts`)
- [ ] Worker entry: `worker/index.ts` (atau auto-detect oleh Sites)
- [ ] Database Turso target sudah di-migrate ke CP12 (lihat `DEPLOY-CHECKLIST.md` step 1)

---


3. **Sites harus di-set env vars** via Sites dashboard / wrangler secret
   (tergantung tooling yang mengelola deploy):
   ```bash
   # Contoh via wrangler (tidak digunakan saat ini)
   wrangler secret put TURSO_DATABASE_URL
   wrangler secret put TURSO_AUTH_TOKEN
   ```
   Atau via Sites UI yang mengelola `project_id` di `.openai/hosting.json`.
