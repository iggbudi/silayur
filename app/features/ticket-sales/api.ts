/**
 * Client API untuk transaksi penjualan tiket.
 * Wrapper tipis di atas fetch() — tidak ada logika di sini.
 */

import type { DaySummary, Sale, SaleInput } from "./types";

export type CreateSaleResponse = Sale;

export type ListSalesResponse = DaySummary & {
  sales: Sale[];
};

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Permintaan gagal (${response.status})`);
  }
  return data;
}

export async function createSale(input: SaleInput): Promise<CreateSaleResponse> {
  const response = await fetch("/api/sales", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  return parseJson<CreateSaleResponse>(response);
}

export async function listTodaySales(): Promise<ListSalesResponse> {
  const response = await fetch("/api/sales", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJson<ListSalesResponse>(response);
}

export async function requestVoid(
  saleId: string,
  reason: string,
): Promise<Sale> {
  const response = await fetch("/api/sales/void", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ saleId, reason }),
  });
  return parseJson<Sale>(response);
}

export async function approveVoid(
  saleId: string,
  password: string,
): Promise<Sale> {
  const response = await fetch("/api/sales/void/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ saleId, password }),
  });
  return parseJson<Sale>(response);
}
