/**
 * Client API untuk halaman Laporan.
 * Wrapper tipis di atas fetch(); tidak ada logika di sini.
 * Rincian per hari memakai endpoint existing modul lain (sales/revenue/expenses).
 */

import type { Expense, RevenueEntry } from "../finance";
import type { ListSalesResponse } from "../ticket-sales";
import type { ReportRange } from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Permintaan gagal (${response.status})`);
  }
  return data;
}

export async function reportSummary(
  from: string,
  to: string,
): Promise<ReportRange> {
  const response = await fetch(`/api/reports?from=${from}&to=${to}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<ReportRange>(response);
}

export async function fetchDaySales(date: string): Promise<ListSalesResponse> {
  const response = await fetch(`/api/sales?date=${date}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<ListSalesResponse>(response);
}

export async function fetchDayRevenue(date: string): Promise<RevenueEntry[]> {
  const response = await fetch(`/api/revenue?date=${date}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<RevenueEntry[]>(response);
}

export async function fetchDayExpenses(date: string): Promise<Expense[]> {
  const response = await fetch(`/api/expenses?date=${date}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<Expense[]>(response);
}
