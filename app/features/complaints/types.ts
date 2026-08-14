/**
 * Tipe domain modul Komplain (pilot dead-link slice).
 * Siklus hidup: open → assigned → processing → resolved (atau reopened).
 */

export type ComplaintStatus =
  | "open"
  | "assigned"
  | "processing"
  | "resolved"
  | "reopened";

export type ComplaintPriority = "low" | "medium" | "high";

export type Complaint = {
  id: string;
  title: string;
  description: string;
  /** Kategori (snapshot; umumnya nama config_items.facilities). */
  category: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  /** Tanggal kalender WIB (YYYY-MM-DD) untuk pengelompokan harian. */
  date: string;
  reportedBy: string;
  reportedByName?: string;
  reportedAt: string; // ISO UTC
  updatedBy: string;
  updatedByName?: string;
  updatedAt: string; // ISO UTC
};

export type ComplaintInput = {
  title: string;
  description?: string;
  category?: string;
  priority?: ComplaintPriority;
};

export type ComplaintList = {
  complaints: Complaint[];
  /** Jumlah komplain berstatus terbuka (open/assigned/processing). */
  openCount: number;
};
