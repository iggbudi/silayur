/**
 * API riwayat transisi status komplain.
 * Thin handler: auth + RBAC complaints view. Logika di features/complaints.
 */
import { AuthenticationError, requireRequestUser } from "../../../../../db/auth-repo";
import { assertCanViewComplaints } from "../../../../../db/config-repo";
import { getRequestDb } from "../../../../../db/get-db";
import { jsonError, jsonOk } from "../../../../../db/http";
import { listComplaintHistory } from "../../../../features/complaints/repo";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("izin")) return 403;
  return 500;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanViewComplaints(db, actor.id);
    const { id } = await context.params;
    const history = await listComplaintHistory(db, id);
    return jsonOk({ history }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
