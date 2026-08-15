/**
 * Types untuk slice finance (Sprint 3): pemasukan non-tiket, pengeluaran,
 * dan rekap kas shift.
 */

export type RevenueEntryStatus = "active" | "voided";

export type RevenueEntry = {
  id: string;
  sourceKey: string;
  sourceName: string;
  amount: number;
  note: string;
  entryDate: string;
  recordedBy: string;
  recordedByName?: string;
  recordedAt: string;
  status: RevenueEntryStatus;
  voidedBy: string | null;
  voidedAt: string | null;
  voidReason: string;
};

export type RevenueEntryInput = {
  sourceKey: string;
  sourceName: string;
  amount: number;
  note?: string;
};

export type ExpenseStatus = "pending" | "approved" | "voided";

export type Expense = {
  id: string;
  description: string;
  amount: number;
  note: string;
  entryDate: string;
  recordedBy: string;
  recordedByName?: string;
  recordedAt: string;
  status: ExpenseStatus;
  approvedBy: string | null;
  approvedAt: string | null;
};

export type ExpenseInput = {
  description: string;
  amount: number;
  note?: string;
};

export type CashSession = {
  id: string;
  openedBy: string;
  openedAt: string;
  closedBy: string | null;
  closedAt: string | null;
  declaredCash: number | null;
  systemCash: number | null;
  difference: number | null;
  status: "open" | "closed";
};

/** Ringkasan pendapatan harian: tiket + non-tiket. */
export type FinanceSummary = {
  date: string;
  ticketRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
};
