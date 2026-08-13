/**
 * API ringkasan pendapatan harian (tiket + non-tiket) untuk dashboard.
 */
import { AuthenticationError, requireRequestUser } from "../../../../db/auth-repo";
import { assertCanViewFinance } from "../../../../db/config-repo";
import { getRequestDb } from "../../../../db/get-db";
import { jsonError, jsonOk } from "../../../../db/http";
import { todayIsoDate } from "../../../../shared/date";
import { todayRevenueSummary } from "../../../features/finance/repo";

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
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? todayIsoDate();
    const summary = await todayRevenueSummary(db, date);
    return jsonOk(summary, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
