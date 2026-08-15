/**
 * Tipe domain kalender hari libur (modul tarif).
 * Hari libur membuat tanggal weekday memakai tarif weekend.
 */

export type Holiday = {
  id: string;
  /** Tanggal kalender WIB (YYYY-MM-DD), unik. */
  date: string;
  /** Nama hari libur (mis. "Tahun Baru"). */
  name: string;
  createdBy: string;
  createdAt: string;
};

export type HolidayInput = {
  date: string;
  name?: string;
};
