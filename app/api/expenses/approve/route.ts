/**
 * API untuk menyetujui pengeluaran (keuangan).
 */
import { AuthenticationError, requireRequestUser } from "../../../../db/auth-repo";
import { assertCanManageFinance } from "../../../../db/config-repo";
import { getRequestDb } from "../../../../db/get-db";
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  readJsonBody,
} from "../../../../db/http";
import { approveExpense } from "../../../features/finance/repo";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  if (
    message.includes("wajib") ||
    message.includes("tidak valid") ||
    message.includes("tidak ditemukan") ||
    message.includes("pending")
  ) {
    return 400;
  }
  return 500;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageFinance(db, actor.id);
    const body = await readJsonBody<{ id: string }>(request);
    const expense = await approveExpense(db, body?.id ?? "", actor.id);
    return jsonOk(expense, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
