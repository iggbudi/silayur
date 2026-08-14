/**
 * Data access untuk laporan rekap rentang tanggal.
 * Membaca langsung tabel `sales`, `revenue_entries`, `expenses`, dan
 * `cash_sessions` (bukan via slice lain) sesuai aturan AGENTS.md.
 *
 * Semantik waktu konsisten dengan modul existing:
 * - `sales.sold_at` (ISO UTC) difilter dengan window UTC WIB dan
 *   dikelompokkan per hari memakai `utcIsoToLocalDate`.
 * - `revenue_entries.entry_date` / `expenses.entry_date` adalah string
 *   `YYYY-MM-DD` (WIB) → filter `between`.
 * - Penjualan `voided` dikecualikan dari total tapi dilaporkan terpisah;
 *   pengeluaran hanya `approved` dihitung sebagai uang keluar (sama seperti
 *   `computeSystemCash` di modul keuangan).
 */

import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import type { AppDb } from "../../../db/get-db";
import {
  cashSessions,
  expenses,
  revenueEntries,
  sales,
  users,
} from "../../../db/schema";
import {
  dayTypeFor,
  eachDateInRange,
  localUtcRange,
  utcIsoToLocalDate,
} from "../../../shared/date";
import type {
  ReportCashTotals,
  ReportDailyRow,
  ReportExpenseTotals,
  ReportRange,
  ReportRevenueTotals,
  ReportSalesTotals,
  ReportSessionRow,
} from "./types";

type SaleRow = {
  id: string;
  soldAt: string;
  totalAmount: number;
  totalQuantity: number;
  status: "completed" | "void_pending" | "voided";
};

function emptySalesTotals(): ReportSalesTotals {
  return { count: 0, visitors: 0, revenue: 0, voidedCount: 0, voidedAmount: 0 };
}

function emptyExpenseTotals(): ReportExpenseTotals {
  return { count: 0, approvedCount: 0, pendingCount: 0, approvedAmount: 0 };
}

/**
 * Rekap satu rentang tanggal kalender WIB (inklusif).
 * `from`/`to` diharapkan sudah tervalidasi (`isValidDateIso`, `from <= to`).
 */
export async function rangeReport(
  db: AppDb,
  from: string,
  to: string,
): Promise<ReportRange> {
  const { startIso, endIso } = localUtcRange(from, to);

  const [saleRows, revenueRows, expenseRows, sessionRows] = await Promise.all([
    db
      .select({
        id: sales.id,
        soldAt: sales.soldAt,
        totalAmount: sales.totalAmount,
        totalQuantity: sales.totalQuantity,
        status: sales.status,
      })
      .from(sales)
      .where(and(gte(sales.soldAt, startIso), lt(sales.soldAt, endIso))),
    db
      .select({
        id: revenueEntries.id,
        amount: revenueEntries.amount,
        entryDate: revenueEntries.entryDate,
      })
      .from(revenueEntries)
      .where(
        and(
          gte(revenueEntries.entryDate, from),
          lte(revenueEntries.entryDate, to),
        ),
      ),
    db
      .select({
        id: expenses.id,
        amount: expenses.amount,
        entryDate: expenses.entryDate,
        status: expenses.status,
      })
      .from(expenses)
      .where(
        and(
          gte(expenses.entryDate, from),
          lte(expenses.entryDate, to),
        ),
      ),
    db
      .select({
        id: cashSessions.id,
        openedAt: cashSessions.openedAt,
        openedBy: cashSessions.openedBy,
        openedByName: users.name,
        closedAt: cashSessions.closedAt,
        closedBy: cashSessions.closedBy,
        closedByName: sql<string | null>`${users.name}`,
        status: cashSessions.status,
        declaredCash: cashSessions.declaredCash,
        systemCash: cashSessions.systemCash,
        difference: cashSessions.difference,
      })
      .from(cashSessions)
      .leftJoin(users, eq(users.id, cashSessions.openedBy))
      .where(
        and(gte(cashSessions.openedAt, startIso), lt(cashSessions.openedAt, endIso)),
      )
      .orderBy(desc(cashSessions.openedAt)),
  ]);

  const days = eachDateInRange(from, to);
  const dailyById = new Map<string, ReportDailyRow>();
  for (const date of days) {
    dailyById.set(date, {
      date,
      dayType: dayTypeFor(date),
      salesCount: 0,
      visitors: 0,
      ticketRevenue: 0,
      otherRevenue: 0,
      approvedExpenses: 0,
      netCash: 0,
    });
  }

  const salesTotals = emptySalesTotals();
  for (const row of saleRows as SaleRow[]) {
    const date = utcIsoToLocalDate(row.soldAt);
    const daily = dailyById.get(date);
    if (row.status === "voided") {
      salesTotals.voidedCount += 1;
      salesTotals.voidedAmount += row.totalAmount;
      continue;
    }
    salesTotals.count += 1;
    salesTotals.visitors += row.totalQuantity;
    salesTotals.revenue += row.totalAmount;
    if (daily) {
      daily.salesCount += 1;
      daily.visitors += row.totalQuantity;
      daily.ticketRevenue += row.totalAmount;
    }
  }

  const revenueTotals: ReportRevenueTotals = { count: 0, amount: 0 };
  for (const row of revenueRows) {
    revenueTotals.count += 1;
    revenueTotals.amount += row.amount;
    const daily = dailyById.get(row.entryDate);
    if (daily) {
      daily.otherRevenue += row.amount;
    }
  }

  const expenseTotals = emptyExpenseTotals();
  for (const row of expenseRows) {
    expenseTotals.count += 1;
    if (row.status === "approved") {
      expenseTotals.approvedCount += 1;
      expenseTotals.approvedAmount += row.amount;
      const daily = dailyById.get(row.entryDate);
      if (daily) {
        daily.approvedExpenses += row.amount;
      }
    } else {
      expenseTotals.pendingCount += 1;
    }
  }

  const sessions: ReportSessionRow[] = sessionRows.map((row) => ({
    id: row.id,
    openedAt: row.openedAt,
    openedBy: row.openedBy,
    openedByName: row.openedByName ?? undefined,
    closedAt: row.closedAt,
    closedBy: row.closedBy,
    closedByName: row.closedByName ?? undefined,
    status: row.status,
    declaredCash: row.declaredCash,
    systemCash: row.systemCash,
    difference: row.difference,
  }));

  const cashTotals: ReportCashTotals = {
    systemCash: 0,
    declaredCash: 0,
    difference: 0,
    openCount: 0,
  };
  for (const row of sessionRows) {
    if (row.status !== "closed") {
      cashTotals.openCount += 1;
      continue;
    }
    cashTotals.systemCash += row.systemCash ?? 0;
    cashTotals.declaredCash += row.declaredCash ?? 0;
    cashTotals.difference += row.difference ?? 0;
  }

  const daily = Array.from(dailyById.values());
  for (const row of daily) {
    row.netCash = row.ticketRevenue + row.otherRevenue - row.approvedExpenses;
  }

  return {
    from,
    to,
    days: days.length,
    sales: salesTotals,
    revenue: revenueTotals,
    expenses: expenseTotals,
    sessions,
    cashTotals,
    daily,
  };
}
