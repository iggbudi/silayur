/**
 * Server-side data access untuk modul keuangan (Sprint 3).
 * Mencakup pemasukan non-tiket, pengeluaran, dan rekap kas shift.
 */

import { and, desc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { localDayUtcRange, todayIsoDate } from "../../../shared/date";
import {
  cashSessions,
  expenses,
  revenueEntries,
  sales,
  users,
} from "../../../db/schema";
import type { AppDb } from "../../../db/get-db";
import type {
  CashSession,
  Expense,
  ExpenseInput,
  FinanceSummary,
  RevenueEntry,
  RevenueEntryInput,
} from "./types";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function mapRevenueEntry(row: {
  entry: typeof revenueEntries.$inferSelect;
  recordedByName: string | null;
}): RevenueEntry {
  return {
    id: row.entry.id,
    sourceKey: row.entry.sourceKey,
    sourceName: row.entry.sourceName,
    amount: row.entry.amount,
    note: row.entry.note,
    entryDate: row.entry.entryDate,
    recordedBy: row.entry.recordedBy,
    recordedByName: row.recordedByName ?? undefined,
    recordedAt: row.entry.recordedAt,
  };
}

function mapExpense(row: {
  expense: typeof expenses.$inferSelect;
  recordedByName: string | null;
}): Expense {
  return {
    id: row.expense.id,
    description: row.expense.description,
    amount: row.expense.amount,
    note: row.expense.note,
    entryDate: row.expense.entryDate,
    recordedBy: row.expense.recordedBy,
    recordedByName: row.recordedByName ?? undefined,
    recordedAt: row.expense.recordedAt,
    status: row.expense.status,
    approvedBy: row.expense.approvedBy,
    approvedAt: row.expense.approvedAt,
  };
}

function mapCashSession(row: typeof cashSessions.$inferSelect): CashSession {
  return {
    id: row.id,
    openedBy: row.openedBy,
    openedAt: row.openedAt,
    closedBy: row.closedBy,
    closedAt: row.closedAt,
    declaredCash: row.declaredCash,
    systemCash: row.systemCash,
    difference: row.difference,
    status: row.status,
  };
}

export async function createRevenueEntry(
  db: AppDb,
  input: RevenueEntryInput,
  actorId: string,
): Promise<RevenueEntry> {
  const amount = Number(input.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Nominal pemasukan tidak valid.");
  }
  const sourceName = input.sourceName.trim();
  if (!sourceName) throw new Error("Sumber pendapatan wajib diisi.");
  const id = newId("rev");
  await db.insert(revenueEntries).values({
    id,
    sourceKey: input.sourceKey.trim(),
    sourceName,
    amount,
    note: input.note?.trim() ?? "",
    entryDate: todayIsoDate(),
    recordedBy: actorId,
    recordedAt: new Date().toISOString(),
  });
  const rows = await db
    .select({ entry: revenueEntries, recordedByName: users.name })
    .from(revenueEntries)
    .innerJoin(users, eq(users.id, revenueEntries.recordedBy))
    .where(eq(revenueEntries.id, id))
    .limit(1);
  return mapRevenueEntry(rows[0]);
}

export async function listRevenueEntries(
  db: AppDb,
  dateIso: string,
): Promise<RevenueEntry[]> {
  const rows = await db
    .select({ entry: revenueEntries, recordedByName: users.name })
    .from(revenueEntries)
    .innerJoin(users, eq(users.id, revenueEntries.recordedBy))
    .where(eq(revenueEntries.entryDate, dateIso))
    .orderBy(desc(revenueEntries.recordedAt));
  return rows.map(mapRevenueEntry);
}

/** Total pendapatan hari ini: tiket (sales) + non-tiket (revenue_entries). */
export async function todayRevenueSummary(
  db: AppDb,
  dateIso?: string,
): Promise<FinanceSummary> {
  const date = dateIso ?? todayIsoDate();
  const { startIso, endIso } = localDayUtcRange(date);
  const [ticketRows, otherRows] = await Promise.all([
    db
      .select({ revenue: sql<number>`coalesce(sum(${sales.totalAmount}), 0)` })
      .from(sales)
      .where(
        and(
          ne(sales.status, "voided"),
          gte(sales.soldAt, startIso),
          lt(sales.soldAt, endIso),
        ),
      ),
    db
      .select({ revenue: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
      .from(revenueEntries)
      .where(eq(revenueEntries.entryDate, date)),
  ]);
  const ticketRevenue = Number(ticketRows[0]?.revenue ?? 0);
  const otherRevenue = Number(otherRows[0]?.revenue ?? 0);
  return {
    date,
    ticketRevenue,
    otherRevenue,
    totalRevenue: ticketRevenue + otherRevenue,
  };
}

export async function createExpense(
  db: AppDb,
  input: ExpenseInput,
  actorId: string,
): Promise<Expense> {
  const amount = Number(input.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Nominal pengeluaran tidak valid.");
  }
  const description = input.description.trim();
  if (!description) throw new Error("Keterangan pengeluaran wajib diisi.");
  const id = newId("exp");
  await db.insert(expenses).values({
    id,
    description,
    amount,
    note: input.note?.trim() ?? "",
    entryDate: todayIsoDate(),
    recordedBy: actorId,
    recordedAt: new Date().toISOString(),
    status: "pending",
  });
  return loadExpenseById(db, id);
}

export async function loadExpenseById(
  db: AppDb,
  expenseId: string,
): Promise<Expense> {
  const rows = await db
    .select({ expense: expenses, recordedByName: users.name })
    .from(expenses)
    .innerJoin(users, eq(users.id, expenses.recordedBy))
    .where(eq(expenses.id, expenseId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error(`Pengeluaran tidak ditemukan: ${expenseId}`);
  return mapExpense(row);
}

export async function approveExpense(
  db: AppDb,
  expenseId: string,
  approverId: string,
): Promise<Expense> {
  const existing = await loadExpenseById(db, expenseId);
  if (existing.status !== "pending") {
    throw new Error("Hanya pengeluaran pending yang bisa disetujui.");
  }
  await db
    .update(expenses)
    .set({
      status: "approved",
      approvedBy: approverId,
      approvedAt: new Date().toISOString(),
    })
    .where(eq(expenses.id, expenseId));
  return loadExpenseById(db, expenseId);
}

export async function listExpenses(
  db: AppDb,
  dateIso: string,
): Promise<Expense[]> {
  const rows = await db
    .select({ expense: expenses, recordedByName: users.name })
    .from(expenses)
    .innerJoin(users, eq(users.id, expenses.recordedBy))
    .where(eq(expenses.entryDate, dateIso))
    .orderBy(desc(expenses.recordedAt));
  return rows.map(mapExpense);
}

export async function activeCashSession(
  db: AppDb,
): Promise<CashSession | null> {
  const rows = await db
    .select()
    .from(cashSessions)
    .where(eq(cashSessions.status, "open"))
    .orderBy(desc(cashSessions.openedAt))
    .limit(1);
  return rows[0] ? mapCashSession(rows[0]) : null;
}

export async function openCashSession(
  db: AppDb,
  actorId: string,
): Promise<CashSession> {
  const active = await activeCashSession(db);
  if (active) throw new Error("Shift kas sudah aktif.");
  await db.insert(cashSessions).values({
    id: newId("cash"),
    openedBy: actorId,
    openedAt: new Date().toISOString(),
    status: "open",
  });
  const session = await activeCashSession(db);
  if (!session) throw new Error("Gagal membuka shift kas.");
  return session;
}

async function computeSystemCash(
  db: AppDb,
  fromIso: string,
  toIso: string,
): Promise<number> {
  const [ticketRows, otherRows, expenseRows] = await Promise.all([
    db
      .select({ v: sql<number>`coalesce(sum(${sales.totalAmount}), 0)` })
      .from(sales)
      .where(
        and(
          ne(sales.status, "voided"),
          gte(sales.soldAt, fromIso),
          lt(sales.soldAt, toIso),
        ),
      ),
    db
      .select({ v: sql<number>`coalesce(sum(${revenueEntries.amount}), 0)` })
      .from(revenueEntries)
      .where(
        and(
          gte(revenueEntries.recordedAt, fromIso),
          lt(revenueEntries.recordedAt, toIso),
        ),
      ),
    db
      .select({ v: sql<number>`coalesce(sum(${expenses.amount}), 0)` })
      .from(expenses)
      .where(
        and(
          eq(expenses.status, "approved"),
          gte(expenses.recordedAt, fromIso),
          lt(expenses.recordedAt, toIso),
        ),
      ),
  ]);
  return (
    Number(ticketRows[0]?.v ?? 0) +
    Number(otherRows[0]?.v ?? 0) -
    Number(expenseRows[0]?.v ?? 0)
  );
}

export async function closeCashSession(
  db: AppDb,
  sessionId: string,
  actorId: string,
  declaredCash: number,
): Promise<CashSession> {
  const declared = Number(declaredCash);
  if (!Number.isSafeInteger(declared) || declared < 0) {
    throw new Error("Nominal setoran kas tidak valid.");
  }
  const rows = await db
    .select()
    .from(cashSessions)
    .where(eq(cashSessions.id, sessionId))
    .limit(1);
  const session = rows[0];
  if (!session) throw new Error("Shift kas tidak ditemukan.");
  if (session.status !== "open") throw new Error("Shift kas sudah ditutup.");
  const closedAt = new Date().toISOString();
  const systemCash = await computeSystemCash(db, session.openedAt, closedAt);
  await db
    .update(cashSessions)
    .set({
      status: "closed",
      closedBy: actorId,
      closedAt,
      declaredCash: declared,
      systemCash,
      difference: declared - systemCash,
    })
    .where(eq(cashSessions.id, sessionId));
  const updated = await db
    .select()
    .from(cashSessions)
    .where(eq(cashSessions.id, sessionId))
    .limit(1);
  return mapCashSession(updated[0]);
}
