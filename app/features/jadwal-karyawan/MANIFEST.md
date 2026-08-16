# MANIFEST — Slice `app/features/jadwal-karyawan/`

## Tanggung jawab

Modul Jadwal Karyawan & PIC end-to-end: master data karyawan, penjadwalan
shift harian, penugasan PIC per area, dan ringkasan kehadiran. Halaman
`/jadwal-karyawan` menampilkan rekap harian, kartu metrik (total terjadwal,
shift pagi/sore aktif, tidak hadir, PIC), form atur jadwal/assign PIC/tambah
karyawan, dan tabel jadwal.

## Asumsi bisnis

- **Shift**: `morning` (Shift Pagi 06.00–14.00) | `evening` (Shift Sore
  14.00–22.00).
- **Status kehadiran**: `hadir` | `izin` | `libur` | `tidak_hadir`
  (default `hadir`).
- **PIC area**: `Operasional` | `Tiket` | `Fasilitas` | `Kebersihan` |
  `Parkir`.
- **Upsert jadwal**: satu baris per `(employee_id, date)` — membuat jadwal
  untuk karyawan+tanggal yang sama memperbarui shift/status/catatan yang
  ada.
- **Upsert PIC**: satu baris per `(employee_id, date, area)` — karyawan
  bisa jadi PIC di beberapa area sekaligus di hari yang sama.
- **Ringkasan**: `morningShift`/`eveningShift` menghitung karyawan terjadwal
  yang **bukan** `tidak_hadir`/`libur`; `absent` hanya menghitung
  `tidak_hadir`.
- **RBAC**:
  - Lihat: `jadwalKaryawan` ≥ `view`.
  - Buat jadwal, assign PIC, tambah karyawan, update status:
    `jadwalKaryawan` = `manage`.
- **Tanggal**: `date` = WIB `YYYY-MM-DD` (default `todayIsoDate()`);
  `createdAt`/`updatedAt` = ISO UTC.

## Anggota slice

| File | Peran |
|------|-------|
| `types.ts` | Tipe domain (Employee, ScheduleShift, PicAssignment, input, summary, response). |
| `constants.ts` | Konstanta shift, area, status; helper label & class badge. |
| `repo.ts` | `listEmployees`, `createEmployee`, `listSchedulesByDate`, `createSchedule`, `updateScheduleStatus`, `listPicsByDate`, `assignPic`, `getJadwalSummary`, `listJadwal`. |
| `validation.ts` | Skema Zod untuk semua input mutasi. |
| `api.ts` | Client wrapper: `fetchJadwal`, `createSchedule`, `updateScheduleStatus`, `assignPic`, `fetchEmployees`, `createEmployee`. |
| `index.ts` | Public API (satu-satunya pintu impor dari luar). |
| `__tests__/repo.test.ts` | Test logic-level (create, upsert, list, summary, PIC). |

## Wire-up eksternal

- Tabel: `db/schema.ts` → `employees`, `schedule_shifts`, `pic_assignments`
  + migration `drizzle/0003_jadwal_karyawan.sql`.
- RBAC: `assertCanViewJadwalKaryawan` / `assertCanManageJadwalKaryawan`
  (`db/config-repo.ts`).
- Route:
  - `app/api/jadwal-karyawan/route.ts` (GET list+summary, POST create schedule).
  - `app/api/jadwal-karyawan/employees/route.ts` (GET/POST employees).
  - `app/api/jadwal-karyawan/pic/route.ts` (POST assign PIC).
  - `app/api/jadwal-karyawan/[id]/status/route.ts` (POST update status).
- Halaman: `app/jadwal-karyawan/page.tsx`; nav "Tim & Jadwal" diaktifkan
  (`sidebar-navigation.tsx`).
- Seed: 7 karyawan awal di `db/seed-data.json` + entri permission
  `jadwalKaryawan` per role.

## Status implementasi

- [x] Schema + migration 0003 (lokal; rollout remote menunggu otorisasi).
- [x] Slice lengkap (types, constants, repo, validation, api, index) + test logic-level.
- [x] Route + RBAC + halaman + nav + seed.
- [ ] Integrasi panel/KPI dashboard — future.
