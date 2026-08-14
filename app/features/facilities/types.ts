/**
 * Tipe domain modul Fasilitas (status harian).
 * Sumber fasilitas: config_items section `facilities`.
 * Status per fasilitas per hari kalender WIB.
 */

export type FacilityStatusValue = "operational" | "needs_attention" | "closed";

export type FacilityStatusRow = {
  id: string;
  facilityId: string;
  date: string; // WIB YYYY-MM-DD
  status: FacilityStatusValue;
  note: string;
  recordedBy: string;
  recordedByName?: string;
  recordedAt: string; // ISO UTC
};

/** Fasilitas (dari config) + status hari ini (default operational). */
export type FacilityWithStatus = {
  id: string;
  name: string;
  detail: string;
  status: FacilityStatusValue;
  /** Kapan terakhir dicatat hari ini (null bila belum dicatat). */
  recordedAt: string | null;
};

export type FacilityStatusInput = {
  facilityId: string;
  status: FacilityStatusValue;
  note?: string;
};

export type FacilityStatusCounts = {
  operational: number;
  needsAttention: number;
  closed: number;
};

export type FacilityStatusSummary = {
  facilities: FacilityWithStatus[];
  counts: FacilityStatusCounts;
  updatedAt: string | null;
};
