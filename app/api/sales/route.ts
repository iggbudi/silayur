/**
 * API endpoint untuk transaksi penjualan tiket.
 * Thin handler: import logic dari slice "ticket-sales".
 */

import { requireRequestUser, AuthenticationError } from "../../../db/auth-repo";
import { assertCanViewVisitors } from "../../../db/config-repo";
import { getRequestDb } from "../../../db/get-db";
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  readJsonBody,
} from "../../../db/http";
import {
  createSale,
  listSalesByDate,
  todaySummary,
} from "../../features/ticket-sales/repo";
import type { SaleInput } from "../../features/ticket-sales/types";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  if (
    message.includes("wajib") ||
    message.includes("tidak valid") ||
    message.includes("tidak ditemukan") ||
    message.includes("belum dikonfigurasi")
  ) {
    return 400;
  }
  return 500;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanViewVisitors(db, actor.id);
    const input = await readJsonBody<SaleInput>(request);
    const sale = await createSale(db, input, actor.id);
    return jsonOk(sale, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}

export async function GET(request: Request) {
  try {
    const db = getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanViewVisitors(db, actor.id);
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? undefined;
    const sales = await listSalesByDate(
      db,
      date ?? new Date().toISOString().slice(0, 10),
    );
    const summary = await todaySummary(db, date);
    return jsonOk(
      { ...summary, sales },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
