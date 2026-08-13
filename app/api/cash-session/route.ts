/**
 * API untuk status shift kas saat ini (keuangan).
 */
import { AuthenticationError, requireRequestUser } from "../../../db/auth-repo";
import { assertCanViewFinance } from "../../../db/config-repo";
import { getRequestDb } from "../../../db/get-db";
import { jsonError, jsonOk } from "../../../db/http";
import { activeCashSession } from "../../features/finance/repo";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  return 500;
}

export async function GET(request: Request) {
  try {
    const db = getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanViewFinance(db, actor.id);
    const session = await activeCashSession(db);
    return jsonOk(session, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
