/**
 * Tipe domain untuk laporan rekap rentang tanggal (Sprint Laporan).
 * Semua nominal adalah integer Rupiah; tanggal kalender `YYYY-MM-DD` WIB.
 */

import type { TicketDayType } from "../../../shared/config";

/** Ringkasan penjualan tiket pada rentang. Voided dilaporkan terpisah. */
export type ReportSalesTotals = {
  count: number;
  visitors: number;
  revenue: number;
  voidedCount: number;
  voidedAmount: number;
};

/** Ringkasan pemasukan non-tiket (tanpa status). */
export type ReportRevenueTotals = {
  count: number;
  amount: number;
};

/** Ringkasan pengeluaran. Hanya `approved` dihitung sebagai uang keluar. */
export type ReportExpenseTotals = {
  count: number;
  approvedCount: number;
  pendingCount: number;
  approvedAmount: number;
};

/** Baris sesi kas pada rentang. */
export type ReportSessionRow = {
  id: string;
  openedAt: string; // ISO UTC
  openedBy: string;
  openedByName?: string;
  closedAt: string | null;
  closedBy: string | null;
  closedByName?: string;
  status: "open" | "closed";
  declaredCash: number | null;
  systemCash: number | null;
  difference: number | null;
};

/** Total kas dari sesi yang sudah ditutup; sesi terbuka dihitung terpisah. */
export type ReportCashTotals = {
  systemCash: number;
  declaredCash: number;
  difference: number;
  openCount: number;
};

/** Baris rekap per hari kalender WIB pada rentang. */
export type ReportDailyRow = {
  date: string; // YYYY-MM-DD WIB
  dayType: TicketDayType;
  salesCount: number;
  visitors: number;
  ticketRevenue: number;
  otherRevenue: number;
  approvedExpenses: number;
  /** ticketRevenue + otherRevenue − approvedExpenses (net kas hari itu). */
  netCash: number;
};

/** Hasil rekap satu rentang tanggal. */
export type ReportRange = {
  from: string;
  to: string;
  days: number;
  sales: ReportSalesTotals;
  revenue: ReportRevenueTotals;
  expenses: ReportExpenseTotals;
  sessions: ReportSessionRow[];
  cashTotals: ReportCashTotals;
  daily: ReportDailyRow[];
};
