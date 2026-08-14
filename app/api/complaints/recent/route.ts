/**
 * API komplain terbaru (lintas tanggal) untuk dashboard.
 */
import { AuthenticationError, requireRequestUser } from "../../../../db/auth-repo";
import { assertCanViewComplaints } from "../../../../db/config-repo";
import { getRequestDb } from "../../../../db/get-db";
import { jsonError, jsonOk } from "../../../../db/http";
import { countOpenComplaints, listRecentComplaints } from "../../../features/complaints/repo";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("izin")) return 403;
  return 500;
}

export async function GET(request: Request) {
  try {
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanViewComplaints(db, actor.id);
    const [complaints, openCount] = await Promise.all([
      listRecentComplaints(db, 5),
      countOpenComplaints(db),
    ]);
    return jsonOk({ complaints, openCount }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
