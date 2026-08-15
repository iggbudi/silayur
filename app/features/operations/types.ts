/**
 * Tipe domain modul Operasional (checklist harian).
 * Sumber checklist: config_items section `hours` (item jadwal aktif).
 * Status per item per hari kalender WIB di `operations_checklist`.
 */

/** Satu item checklist operasional + statusnya pada satu tanggal. */
export type OperationsChecklistItem = {
  id: string;
  checklistId: string;
  /** Nama item dari config (mis. "Jadwal reguler"). */
  name: string;
  /** Detail item dari config (mis. "Senin-Minggu · 08.00-16.00"). */
  detail: string;
  done: boolean;
  note: string;
  recordedBy: string;
  recordedByName?: string;
  /** Kapan terakhir dicatat pada tanggal itu (null bila belum dicatat). */
  recordedAt: string | null;
};

export type OperationsChecklistInput = {
  checklistId: string;
  done: boolean;
  note?: string;
};

/** Ringkasan checklist hari ini (halaman & dashboard). */
export type OperationsStatus = {
  items: OperationsChecklistItem[];
  doneCount: number;
  totalCount: number;
  updatedAt: string | null;
};
