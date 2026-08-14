# MANIFEST — Slice `app/features/complaints/`

## Tanggung jawab

Modul Komplain end-to-end (pilot dead-link slice): pencatatan keluhan
pengunjung, perubahan status, dan ringkasan terbuka. Menjadi sumber data
panel "Komplain terbaru" + KPI "Komplain terbuka" di dashboard.

## Asumsi bisnis

- **Siklus hidup**: `open` (Baru) → `assigned` (Ditugaskan) →
  `processing` (Diproses) → `resolved` (Selesai); `reopened` untuk komplain
  yang dibuka lagi. Transisi diverifikasi server-side
  (`ALLOWED_TRANSITIONS`); transisi tak valid ditolak.
- **Kategori**: bebas (string); UI menawarkan pilihan dari
  `config_items` section `facilities` (Kolam Renang, Playground, Area
  Parkir, Camping Ground). Nilai di-snapshot ke kolom `category`.
- **Prioritas**: `low` | `medium` | `high` (default `medium`).
- **RBAC**:
  - Lihat: `complaints` ≥ `view`.
  - Buat & ubah status: `complaints` = `manage`.
- **Tanggal**: `date` = WIB `YYYY-MM-DD` (default `todayIsoDate()`);
  `reportedAt`/`updatedAt` = ISO UTC.

## Anggota slice

| File | Peran |
|------|-------|
| `types.ts` | Tipe domain (Complaint, status, priority, input, list). |
| `repo.ts` | `createComplaint`, `listComplaintsByDate`, `listRecentComplaints`, `countOpenComplaints`, `listComplaints`, `updateComplaintStatus` + transisi. |
| `api.ts` | Client wrapper: `listComplaints`, `createComplaint`, `updateComplaintStatus`, `recentComplaints`. |
| `index.ts` | Public API (satu-satunya pintu impor dari luar). |
| `__tests__/repo.test.ts` | Test logic-level (create, list, transisi, count). |

## Wire-up eksternal

- Tabel: `db/schema.ts` → `complaints` + migration
  `drizzle/0007_checkpoint_16_complaints.sql`.
- RBAC: `assertCanViewComplaints` / `assertCanManageComplaints`
  (`db/config-repo.ts`).
- Route: `app/api/complaints/route.ts` (GET/POST),
  `app/api/complaints/recent/route.ts` (GET),
  `app/api/complaints/[id]/status/route.ts` (POST).
- Halaman: `app/complaints/page.tsx`; nav "Komplain" diaktifkan
  (`sidebar-navigation.tsx`).
- Dashboard: panel "Komplain terbaru" (recent) + KPI "Komplain terbuka"
  (openCount) di `app/page.tsx`.

## Status implementasi

- [x] Schema + migration 0007 (lokal; rollout remote menunggu otorisasi).
- [x] Slice lengkap (types, repo, api, index) + test logic-level.
- [x] Route + RBAC + halaman + nav + wire dashboard.
- [ ] Riwayat transisi status (tabel `complaint_history`) — future.
- [ ] Lampiran foto / kategori kustom — future.
