/**
 * API untuk pemasukan non-tiket (keuangan).
 */
import { AuthenticationError, requireRequestUser } from "../../../db/auth-repo";
import {
  assertCanManageFinance,
  assertCanViewFinance,
} from "../../../db/config-repo";
import { getRequestDb } from "../../../db/get-db";
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  readJsonBody,
} from "../../../db/http";
import { todayIsoDate } from "../../../shared/date";
import {
  createRevenueEntry,
  listRevenueEntries,
} from "../../features/finance/repo";
import type { RevenueEntryInput } from "../../features/finance/types";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  if (
    message.includes("wajib") ||
    message.includes("tidak valid") ||
    message.includes("tidak ditemukan")
  ) {
    return 400;
  }
  return 500;
}

export async function GET(request: Request) {
  try {
    const db = getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanViewFinance(db, actor.id);
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? todayIsoDate();
    const entries = await listRevenueEntries(db, date);
    return jsonOk(entries, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageFinance(db, actor.id);
    const input = await readJsonBody<RevenueEntryInput>(request);
    const entry = await createRevenueEntry(db, input, actor.id);
    return jsonOk(entry, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
