/**
 * API rekap laporan rentang tanggal (halaman /laporan).
 * Thin handler: parsing, autentikasi, RBAC. Logika di features/reports.
 */
import { AuthenticationError, requireRequestUser } from "../../../db/auth-repo";
import { assertCanViewReports } from "../../../db/config-repo";
import { getRequestDb } from "../../../db/get-db";
import { jsonError, jsonOk } from "../../../db/http";
import { isValidDateIso, todayIsoDate } from "../../../shared/date";
import { rangeReport } from "../../features/reports/repo";

export const dynamic = "force-dynamic";

const MAX_REPORT_DAYS = 366;

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  if (message.includes("tidak valid")) return 400;
  return 500;
}

export async function GET(request: Request) {
  try {
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanViewReports(db, actor.id);

    const url = new URL(request.url);
    const from = url.searchParams.get("from") ?? todayIsoDate();
    const to = url.searchParams.get("to") ?? todayIsoDate();

    if (!isValidDateIso(from) || !isValidDateIso(to)) {
      throw new Error("Rentang tanggal tidak valid.");
    }
    if (from > to) {
      throw new Error("Rentang tanggal tidak valid.");
    }
    const fromMs = new Date(`${from}T00:00:00.000Z`).getTime();
    const toMs = new Date(`${to}T00:00:00.000Z`).getTime();
    const daySpan = Math.round((toMs - fromMs) / 86_400_000) + 1;
    if (daySpan > MAX_REPORT_DAYS) {
      throw new Error("Rentang tanggal tidak valid.");
    }

    const report = await rangeReport(db, from, to);
    return jsonOk(report, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
