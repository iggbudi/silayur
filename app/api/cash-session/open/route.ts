/**
 * API untuk membuka shift kas (keuangan).
 */
import { AuthenticationError, requireRequestUser } from "../../../../db/auth-repo";
import { assertCanManageFinance } from "../../../../db/config-repo";
import { getRequestDb } from "../../../../db/get-db";
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
} from "../../../../db/http";
import { openCashSession } from "../../../features/finance/repo";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  if (message.includes("sudah")) return 400;
  return 500;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageFinance(db, actor.id);
    const session = await openCashSession(db, actor.id);
    return jsonOk(session, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
