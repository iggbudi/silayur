/**
 * API untuk pengeluaran operasional (keuangan).
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
  createExpense,
  listExpenses,
} from "../../features/finance/repo";
import type { ExpenseInput } from "../../features/finance/types";

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
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanViewFinance(db, actor.id);
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? todayIsoDate();
    const items = await listExpenses(db, date);
    return jsonOk(items, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageFinance(db, actor.id);
    const input = await readJsonBody<ExpenseInput>(request);
    const item = await createExpense(db, input, actor.id);
    return jsonOk(item, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
