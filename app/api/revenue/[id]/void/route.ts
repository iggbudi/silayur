/**
 * API batalkan pemasukan non-tiket (void).
 * Thin handler: auth + RBAC finance manage. Logika di features/finance.
 */
import { AuthenticationError, requireRequestUser } from "../../../../../db/auth-repo";
import { assertCanManageFinance } from "../../../../../db/config-repo";
import { getRequestDb } from "../../../../../db/get-db";
import { assertSameOrigin, jsonError, jsonOk } from "../../../../../db/http";
import { voidRevenueEntry } from "../../../../features/finance/repo";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  if (
    message.includes("tidak ditemukan") ||
    message.includes("tidak valid") ||
    message.includes("aktif")
  ) {
    return 400;
  }
  return 500;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageFinance(db, actor.id);
    const { id } = await context.params;
    const entry = await voidRevenueEntry(db, id, actor.id);
    return jsonOk(entry, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
