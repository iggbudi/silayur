# Rencana — Pengaturan Jam Operasional & Jam Kerja (Shift)

Status: **SELESAI DIIMPLEMENTASIKAN** (2026-08-16)
Tanggal audit: 2026-08-16

> Catatan implementasi: dieksekusi sebagai satu unit kerja kohesif
> (satu commit) karena perubahan schema `$type`, config repo, dan
> konsumennya saling bergantung. Tidak ada migration SQL yang
> diperlukan — perubahan `$type<...>()` hanya berdampak compile-time;
> section baru disuplai lewat seed idempotent.

## 1. Hasil Pengecekan (kondisi saat ini)

### Jam operasional taman — ❌ BELUM bisa diubah
- Tabel `config_items` punya section `hours`, tetapi section ini sudah
  direpurpose menjadi **"Daftar tugas harian"** (checklist buka-tutup) di
  halaman Pengaturan (`app/pengaturan/page.tsx` key `hours`).
- Jam buka "Senin–Minggu · 08.00-16.00" hanya **teks bebas** di kolom
  `detail` seed (`db/seed-data.json`), dipakai sebagai info read-only di
  halaman `/operasional`. Tidak ada UI khusus untuk mengatur jam buka/tutup,
  dan tidak ada validasi format jam.
- Referensi: `app/features/operations/MANIFEST.md`, `progress.md:595`.

### Jam kerja / shift karyawan — ❌ BELUM bisa diubah
- Shift **hardcoded** di `app/features/jadwal-karyawan/constants.ts`
  (`SHIFTS`: Shift Pagi 06.00–14.00, Shift Sore 14.00–22.00) dan di
  `app/jadwal-karyawan/page.tsx` (teks "06.00 - 14.00" / "14.00 - 22.00"
  pada metric card).
- Tipe `ShiftKey = "morning" | "evening"` rigid — menambah/mengubah shift
  berarti edit kode.
- Tidak ada section Pengaturan untuk jam kerja.

## 2. Sasaran

1. Admin (`settings = manage`) dapat mengubah **jam operasional taman**
   (reguler / akhir pekan / hari libur khusus) dari halaman Pengaturan.
2. Admin dapat mengubah **jam kerja shift karyawan** (label + rentang jam,
   aktif/nonaktif) dari halaman Pengaturan, tanpa deploy kode.
3. Data jadwal lama (`employee_schedules.shift` = `morning`/`evening`)
   tetap kompatibel — tidak ada migrasi data historis.

## 3. Desain: reuse pola `config_items` (tanpa tabel baru)

Kedua pengaturan berbentuk item `config_items` — konsisten dengan pola
existing (tickets/hours/facilities/revenue), transaksi atomik
`saveConfigPatch`, dan RBAC `assertCanManageSettings` yang sudah ada di
`app/api/config/route.ts`. Tidak perlu tabel atau route API baru.

### Section baru 1: `operating-hours` — "Jam buka taman"
- 1 item = 1 aturan jadwal. `name` = jenis jadwal (mis. "Jadwal reguler",
  "Akhir pekan", "Hari libur khusus"), `detail` = rentang jam
  (`HH.mm-HH.mm`), `active` = dipakai/tidak.
- Ditampilkan read-only di `/operasional` (panel jadwal) & dashboard.

### Section baru 2: `shifts` — "Jam kerja karyawan"
- 1 item = 1 shift. **`id` wajib stabil** (`shift-morning`, `shift-evening`)
  karena kolom `employee_schedules.shift` menyimpan id tsb; id tidak boleh
  diubah dari UI.
- `name` = label shift, `detail` = rentang jam, `active` = shift ditawarkan
  saat membuat jadwal baru.
- Minimal 1 shift aktif (divalidasi di repo).

## 4. Langkah Implementasi

| # | File | Perubahan |
|---|------|-----------|
| 1 | `shared/config.ts` | Tambah `"operating-hours" \| "shifts"` ke `ConfigSectionKey` + `CONFIG_SECTION_KEYS` |
| 2 | `db/schema.ts` | Perluas union `$type` kolom `config_items.section`; `npm run db:generate` → migration + snapshot (satu commit bersama kode) |
| 3 | `db/seed-data.json` | Seed idempotent: item `operating-hours` (dari nilai jam di item `hours` lama) + item `shifts` (dari `SHIFTS` hardcoded). Hanya menambah, tidak menimpa |
| 4 | `db/config-repo.ts` | Pastikan `saveConfigItems` menangani section baru; tambah validasi: format jam `HH.mm-HH.mm`, minimal 1 shift aktif, larangan ubah `id` shift |
| 5 | `app/lib/settings-items.ts` | `SettingsSectionKey` otomatis mengikuti `ConfigSectionKey` |
| 6 | `app/pengaturan/page.tsx` | Dua section card baru: "Jam buka taman" (eyebrow Operasional) & "Jam kerja karyawan" (eyebrow Jadwal); label bahasa awam; edit/toggle/add memakai pola item existing |
| 7 | `app/features/jadwal-karyawan/` | `constants.ts` → `DEFAULT_SHIFTS` fallback; repo baca shift aktif dari config; `ShiftKey` dilonggarkan jadi `string` tervalidasi; `JadwalSummary` digeneralisasi (`shiftCounts: { key, label, time, count }[]`) menggantikan `morningShift`/`eveningShift` |
| 8 | `app/jadwal-karyawan/page.tsx` | Metric card shift ambil jam dari data config (hapus teks hardcoded) |
| 9 | `app/features/operations/` + dashboard | Panel "Jadwal operasional" di `/operasional` baca dari section `operating-hours` (bukan lagi item checklist `hours`) |
| 10 | Tests co-located | Logic-level: validasi format jam, minimal 1 shift aktif, fallback default shift saat config kosong, kompatibilitas jadwal lama (`morning`/`evening`) |
| 11 | Docs | `progress.md`, `docs/folder-map.md`, MANIFEST `jadwal-karyawan` & `operations`, `README.md` |

## 5. Keamanan & Batasan

- Mutasi tetap lewat `POST /api/config` (sudah punya `assertSameOrigin` +
  `requireRequestUser` + `assertCanManageSettings`) — tidak ada route baru.
- Migration hanya di-generate lokal; **eksekusi ke Postgres produksi butuh
  otorisasi eksplisit owner** (aturan AGENTS.md).
- Jadwal historis yang menunjuk shift yang sudah nonaktif tetap dirender
  dengan label fallback dari `DEFAULT_SHIFTS`.

## 6. Urutan Pengerjaan (3 unit kerja / commit)

1. `feat(settings): section jam operasional` — langkah 1–6 (bagian
   operating-hours) + seed + tests + docs.
2. `feat(jadwal-karyawan): shift dari konfigurasi` — langkah 7–8 + tests + docs.
3. `refactor(operations): jam operasional dari section baru` — langkah 9 + docs.

Setiap unit kerja wajib lolos `npm run type-check`, `npm run lint`,
`npm test` sebelum commit.
