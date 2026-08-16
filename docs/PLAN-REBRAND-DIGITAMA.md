# Rencana Rebrand & Penyempurnaan DIGITAMA

> Dokumen ini mencatat **rencana lanjutan (1–4)** pasca-eksekusi rebrand
> **SILAYUR → DIGITAMA** dan penambahan fitur **«Nama Taman Wisata»**
> (Pengaturan → Identitas taman).
>
> Status tiap item ditandai `[ ]` (belum) / `[~]` (berjalan) / `[x]` (selesai).
> Untuk konteks teknis perubahan yang sudah dilakukan, lihat `progress.md`
> dan `docs/folder-map.md`.

---

## Rekap singkat (sudah dikerjakan)

- Teks brand di UI (`app/`) dan dokumen inti diganti ke **DIGITAMA**.
- Fitur nama taman: section `config_items` = `identity`, helper `getParkName()`
  (fallback `Taman Wisata`), editor di **Pengaturan → Identitas taman**, dan
  endpoint publik `/api/config/identity` untuk halaman pra-login.
- Cookie sesi `digitama_session`; env var `DIGITAMA_SEED_*`,
  `DIGITAMA_NEW_PASSWORD`, `DIGITAMA_DEMO_ALLOW_REMOTE`.
- Verifikasi: `type-check` hijau, ESLint bersih (kecuali warning pre-existing),
  build sukses, test murni 6/6 dan test integrasi `config-api` pass.

---

## Rencana 1 — Commit perubahan saat ini

- [ ] Review `git diff` (pastikan pekerjaan user yang tidak terkait tetap utuh).
- [ ] Jangan commit rahasia (`.env`, `.dev.vars`, dll. sudah di-ignore).
- [ ] Pesan commit terpilih (conventional commits):

  ```
  feat: rebrand ke DIGITAMA dan tambah pengaturan nama taman (identitas)
  ```

  Atau bila ingin diperinci per scope:

  ```
  feat(branding): ubah SILAYUR menjadi DIGITAMA di UI dan dokumen inti
  feat(settings): tambah seksi identitas untuk nama taman wisata
  chore(env): rename SILAYUR_* ke DIGITAMA_*
  ```

- [ ] Satu commit per unit kerja; jangan campur dengan perubahan lain.

---

## Rencana 2 — Perbarui dokumen historis secara selektif

Dokumen di `docs/*` dan ADR masih memuat kata "SILAYUR". Sebagian besar bersifat
**historis** atau merujuk **identitas infrastruktur**, sehingga tidak diubah
massal agar tidak menulis ulang riwayat dan tidak merusak referensi yang benar.

Tujuan: mengganti **label produk** saja, tanpa menyentuh identitas teknis.

- [ ] Identifikasi refeferensi **label produk** (mis. judul, narasi "SILAYUR
      Dashboard") di: `docs/DEPLOY-CHECKLIST.md`, `docs/ENV-AUDIT.md`,
      `docs/RUNBOOK-DEMO.md`, `docs/TARIFF-ACTIVATION.md`,
      `docs/ASESMEN-FITUR-UI-UX.md`, `docs/PLAN-*.md`,
      `docs/REKAP-ARSITEKTUR.md`, `docs/adr/*`.
- [ ] Ganti ke **DIGITAMA** hanya pada bagian yang menyebut produk, bukan
      padainfra.
- [ ] **JANGAN** mengganti: URL Turso `silayur-nayantaka`, file
      `.data/silayur.db`, atau nama DB Postgres `silayur`/`silayur_test`
      (identitas infrastruktur — lihat Rencana 3).
- [ ] Sinkronkan ulang `docs/folder-map.md` bila ada slice/boundary berubah.

---

## Rencana 3 — Identitas infrastruktur (dibiarkan apa adanya)

Identitas berikut **sengaja dipertahankan** karena menggantinya berisiko
memutus sistem yang berjalan dan tidak terlihat pengguna:

- Nama database PostgreSQL: `silayur` / `silayur_test`
  (`drizzle.config.ts`, `.env.example`, `.env`, `.dev.vars`).
- URL Turso (legacy): `libsql://silayur-nayantaka...` (di docs).
- File SQLite lokal (legacy): `.data/silayur.db`, `.data/demo-silayur.db`.

Keputusan (**16 Agustus 2026**): **biarkan saja** — nama DB Postgres `silayur` /
`silayur_test` dipertahankan (nama DB tidak terlihat pengguna, 0 risiko).
Artefak Turso/libSQL hanya legacy & tidak aktif di runtime (project murni
PostgreSQL: `drizzle.config` dialect `postgresql`, client `pg`).

- [x] **Tetap** (diputuskan): biarkan seperti sekarang.
- [ ] **Opsional** (kalau di masa depan ingin bersih): buat DB baru `digitama` /
      `digitama_test`, pindahkan data, lalu ubah `DATABASE_URL` + `drizzle.config`.
      ⚠️ Perlu otorisasi owner & backup sebelum menjalankan apa pun.

---

## Rencana 4 — Sinkronisasi env var & deploy produksi

Runtime produksi memakai `DATABASE_URL` **Postgres** (dibaca `worker/index.ts`
lewat `exposeDbEnv` → `process.env.DATABASE_URL`). Project di-publish ke GitHub
(`git push origin main`) dan **deploy dijalankan owner di server sendiri** (bukan
ChatGPT Sites tooling).

Wajib diset di env produksi:
- `DATABASE_URL` (Postgres) — runtime wajib.
- `DIGITAMA_SEED_ADMIN_PASSWORD`, `DIGITAMA_SEED_DEFAULT_PASSWORD` — bila
  re-seed produksi (idempotent, hanya menambah).
- `DIGITAMA_NEW_PASSWORD` — bila reset password admin.
- `DIGITAMA_DEMO_ALLOW_REMOTE` — jangan di-set di produksi (guard demo).

Lebih detail:
- Set env di `.env` / environment server owner (bukan file lokal developer;
  `.env`/`.dev.vars` developer tidak ter-baca di produksi).
- `npm run build` → hasil `dist/`.
- Jalankan produksi di server owner: `npm run start` (Node >=22.13).
- Sesi lama (`silayur_session`) otomatis tidak berlaku usai deploy; pengguna
  perlu login ulang dengan cookie `digitama_session`.

Status: `[ ]` — menunggu owner men-set `DATABASE_URL` Postgres + env `DIGITAMA_*`
di server produksinya sendiri dan men-deploy (otorisasi pemilik sudah diberikan,
16 Agt 2026).

---

## Status ringkas

| # | Rencana | Status |
|---|---|---|
| 1 | Commit perubahan saat ini | `[ ]` |
| 2 | Perbarui dokumen historis (selektif) | `[ ]` |
| 3 | Identitas infrastruktur (biarkan / opsional bersihkan) | `[x]` biarkan `silayur`/`silayur_test` (16 Agt 2026) |
| 4 | Sinkronisasi env var di produksi | `[ ]` (perlu deploy) |
