# Rencana Implementasi — Void Transaksi Penjualan Tiket (dengan Persetujuan)

> Dibuat: **13 Agustus 2026** · Author: agent · Reviewer: owner DIGITAMA
> Workflow mengikuti [`AGENTS.md`](../AGENTS.md): kerjakan → test lokal → update docs → commit.
> Status: **Selesai diimplementasi** (13 Agustus 2026) — lihat `progress.md` & `app/features/ticket-sales/MANIFEST.md`.

## 1. Ringkasan

Menambahkan kemampuan **membatalkan (void) transaksi penjualan tiket** tanpa
menghapus data. Berbeda dengan `delete`, void hanya menandai status transaksi dan
mencatat pelaku, waktu, serta alasan.

Alur baru yang disepakati (dua langkah dengan persetujuan):

1. **Permintaan pembatalan** — petugas loket (atau siapa pun ber-akses `visitors`)
   klik "Batalkan" dan **wajib mengisi alasan**. Transaksi berstatus **`void_pending`**
   (menunggu persetujuan).
2. **Persetujuan** — **Manajer, Supervisor, atau Super Admin** menyetujui dengan
   **memasukkan password-nya**. Transaksi menjadi **`voided`** (batal efektif).

Manajer / Super Admin dapat membatalkan langsung (satu langkah), tetap dengan
konfirmasi password.

## 2. Kondisi Saat Ini

- Kolom `sales.status` bertipe enum `"completed" | "voided"` (default `completed`).
- `todaySummary()` mengecualikan transaksi `voided` dari `count`/`visitors`/`revenue`.
- `listSalesByDate()` menampilkan semua (termasuk `voided`).
- `loadSaleById()` tersedia.
- `verifyPassword` / `authenticateWithPassword` tersedia (PBKDF2) untuk verifikasi password.
- **Belum ada**: kolom audit void, status `void_pending`, endpoint, dan UI.

## 3. Desain Solusi

### 3.1 Schema (migration baru `0005_*`)

Tambahkan kolom pada tabel `sales`:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `void_reason` | TEXT NOT NULL DEFAULT '' | Alasan (wajib, diisi saat permintaan) |
| `void_requested_at` | TEXT (ISO UTC) | Waktu permintaan; NULL = belum diminta |
| `void_requested_by` | TEXT → users.id | Pemohon; NULL = belum diminta |
| `voided_at` | TEXT (ISO UTC) | Waktu persetujuan; NULL = belum disetujui |
| `voided_by` | TEXT → users.id | Penyetuju; NULL = belum disetujui |

Ubah enum `status` menjadi `["completed", "void_pending", "voided"]`.

### 3.2 Alur & otoritas persetujuan

- **Pemohon**: pengguna terautentikasi dengan `visitors: view` (atau lebih).
- **Penyetuju**: role ∈ `{"super_admin", "manager", "supervisor"}`, dibuktikan dengan
  verifikasi password (`authenticateWithPassword`).
- Helper baru di `shared/access.ts`:

```ts
export const VOID_APPROVER_ROLES = ["super_admin", "manager", "supervisor"];
export function canApproveVoid(role: RoleKey): boolean;
```

> **Catatan penting**: otoritas persetujuan memakai **daftar role**, bukan level
> `visitors: manage`, karena di seed `ticket_officer` = `visitors: manage` — jika
> memakai level permission, petugas loket justru bisa menyetujui sendiri.

### 3.3 Repo (`app/features/ticket-sales/repo.ts`)

```ts
export async function requestVoid(db, saleId, actorId, reason): Promise<Sale>
// validasi: transaksi ada, status "completed", alasan wajib (min 3 karakter)

export async function approveVoid(db, saleId, approverId): Promise<Sale>
// validasi: transaksi ada, status "void_pending"
```

- `requestVoid` → set `void_pending`, `void_reason`, `void_requested_at/by`.
- `approveVoid` → set `voided`, `voided_at/by`.
- `todaySummary()` diubah dari `eq(status,"completed")` menjadi `ne(status,"voided")`
  — transaksi `void_pending` **tetap dihitung** sampai disetujui (uang masih di kasir).
- `loadSaleById` / `listSalesByDate` menyertakan field void baru.

### 3.4 API

- `POST /api/sales/[id]/void` — permintaan. Auth `visitors: view`; body `{ reason }`
  (wajib). → `requestVoid`.
- `POST /api/sales/[id]/void/approve` — persetujuan. Auth role penyetuju +
  verifikasi password; body `{ password }`. → `approveVoid`.

Thin handler mengikuti pola `app/api/sales/route.ts` (same-origin, auth, RBAC).

### 3.5 UI

`SaleHistory.tsx` + `app/penjualan/page.tsx`:

- Baris `completed`: tombol **"Batalkan"** → dialog alasan (wajib). Jika pengguna
  penyetuju, sekaligus minta password → void langsung. Jika bukan → `void_pending`.
- Baris `void_pending`: badge "Menunggu persetujuan"; bagi penyetuju tampil tombol
  **"Setujui"** (minta password).
- Baris `voided`: tampil dicoret / badge merah, tanpa tombol.
- Setelah aksi apa pun: **refetch** riwayat & ringkasan (`listTodaySales()`).

### 3.6 Konsistensi ringkasan

`todaySummary` tetap mengecualikan `voided`, tapi menghitung `void_pending` (lihat 3.3).
Setelah void/approve, refetch ringkasan (tidak menebak angka lokal).

---

## 4. Keputusan yang Disepakati

1. **Alur void**: permintaan → persetujuan manajer/supervisor (password). ✅
2. **Alasan wajib diisi**. ✅
3. **Penyetuju**: Manajer, Supervisor, Super Admin. ✅
4. **Manajer/Super Admin** dapat membatalkan langsung (satu langkah). ✅
5. **Un-void & refund** tetap **di-defer** (out of scope sprint ini).

---

## 5. Scope & Non-scope

**Dalam scope:**

- Migration kolom void + status `void_pending`.
- `requestVoid` + `approveVoid` repo + validasi.
- 2 endpoint + RBAC / verifikasi password.
- UI permintaan + persetujuan + refetch.
- Test repo & API.
- Update docs (`MANIFEST`, `progress.md`).

**Di luar scope (future):**

- Un-void / reopen.
- Refund & rekap kas (keuangan).
- Riwayat audit terpisah / log perubahan lengkap.
- Menampilkan alasan void di laporan.

---

## 6. Rencana Langkah Kerja

1. `db/schema.ts` — kolom void + enum `void_pending`.
2. `npm run db:generate` → migration `0005_*`.
3. `shared/access.ts` — `VOID_APPROVER_ROLES` + `canApproveVoid`.
4. `app/features/ticket-sales/types.ts` — field void pada `Sale` + `SaleStatus`.
5. `repo.ts` — `requestVoid`, `approveVoid`, update `todaySummary` + loader.
6. `app/api/sales/[id]/void/route.ts` + `.../void/approve/route.ts`.
7. `api.ts` + `index.ts` — client wrapper.
8. `SaleHistory.tsx` + `app/penjualan/page.tsx` — UI.
9. Test repo + API.
10. Update docs + commit.

---

## 7. Rencana Test

**Repo (`app/features/ticket-sales/__tests__/repo.test.ts`):**

- `requestVoid`: status → `void_pending`, alasan & pemohon tercatat.
- `requestVoid` tanpa alasan / alasan < 3 karakter → error.
- `approveVoid`: `void_pending` → `voided`, penyetuju & waktu tercatat.
- `approveVoid` pada status selain `void_pending` → error.
- `todaySummary`: `void_pending` tetap dihitung, `voided` dikecualikan.

**API (`app/api/__tests__/`):**

- Permintaan: anonymous 401; tanpa `visitors` 403; sukses → `void_pending`.
- Persetujuan: role non-penyetuju 403; password salah 401; sukses → `voided`.
- Void ganda → 400.

---

## 8. Definition of Done

- [ ] `npm run type-check` hijau.
- [ ] `npm run lint` hijau (tanpa warning/error baru).
- [ ] `npm test` hijau (termasuk test void baru).
- [ ] Migration `0005_*` ter-generate & ter-track di git.
- [ ] Docs sinkron: `MANIFEST.md` slice + `progress.md`.
- [ ] Commit conventional commits.
- [ ] **Tidak** menyentuh Turso remote / Sites tanpa otorisasi.

---

## 9. Risiko & Catatan

- **Risiko rendah–sedang**: mengubah enum `status` (tambah `void_pending`) dan filter
  `todaySummary` — wajib disertai test.
- Otoritas persetujuan = daftar role, bukan level permission (lihat 3.2).
- Password penyetuju diverifikasi server-side; tidak disimpan/dicatat di log.
- Void tidak membebaskan nomor receipt (standar audit).
- Perubahan kolom/status memengaruhi tipe `Sale` dan `SaleStatus` di `types.ts`
  serta komponen `SaleHistory`/`TodaySummary` — pastikan type-check hijau.