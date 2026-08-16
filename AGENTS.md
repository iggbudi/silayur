# AGENTS.md — Pedoman Agent untuk SILAYUR Dashboard

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
  Sites tanpa otorisasi eksplisit dari owner.** Validasi lokal TIDAK sama
  dengan izin produksi.
- **Jangan percaya identitas dari header client.** Identitas & permission
  selalu ditentukan server-side dari sesi (cookie `HttpOnly`).
- **Jangan commit** `.env` / `.dev.vars` (di-ignore, berisi rahasia lokal)
  dan jangan meletakkan password/token di kode.
- **Jangan edit file migration yang sudah di-commit.** Perubahan schema
  = migration baru via `npm run db:generate`.

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
