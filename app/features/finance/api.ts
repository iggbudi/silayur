/**
 * Client API untuk modul keuangan (Sprint 3).
 * Wrapper tipis di atas fetch() — tidak ada logika di sini.
 */

import type {
  CashSession,
  Expense,
  ExpenseInput,
  FinanceSummary,
  RevenueEntry,
  RevenueEntryInput,
} from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Permintaan gagal (${response.status})`);
  }
  return data;
}

export async function listRevenue(dateIso: string): Promise<RevenueEntry[]> {
  const response = await fetch(`/api/revenue?date=${dateIso}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<RevenueEntry[]>(response);
}

export async function createRevenueEntry(
  input: RevenueEntryInput,
): Promise<RevenueEntry> {
  const response = await fetch("/api/revenue", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return parseJson<RevenueEntry>(response);
}

export async function financeSummary(): Promise<FinanceSummary> {
  const response = await fetch("/api/finance/summary", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<FinanceSummary>(response);
}

export async function listExpenses(dateIso: string): Promise<Expense[]> {
  const response = await fetch(`/api/expenses?date=${dateIso}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<Expense[]>(response);
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const response = await fetch("/api/expenses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return parseJson<Expense>(response);
}

export async function approveExpense(expenseId: string): Promise<Expense> {
  const response = await fetch("/api/expenses/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ id: expenseId }),
  });
  return parseJson<Expense>(response);
}

export async function cashSession(): Promise<CashSession | null> {
  const response = await fetch("/api/cash-session", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<CashSession | null>(response);
}

export async function openCashSession(): Promise<CashSession> {
  const response = await fetch("/api/cash-session/open", {
    method: "POST",
    credentials: "same-origin",
  });
  return parseJson<CashSession>(response);
}

export async function closeCashSession(
  declaredCash: number,
): Promise<CashSession> {
  const response = await fetch("/api/cash-session/close", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ declaredCash }),
  });
  return parseJson<CashSession>(response);
}
