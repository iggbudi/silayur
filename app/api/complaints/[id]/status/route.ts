/**
 * API ubah status komplain (POST /api/complaints/:id/status).
 */
import { AuthenticationError, requireRequestUser } from "../../../../../db/auth-repo";
import { assertCanManageComplaints } from "../../../../../db/config-repo";
import { getRequestDb } from "../../../../../db/get-db";
import { assertSameOrigin, jsonError, jsonOk, readJsonBody } from "../../../../../db/http";
import { updateComplaintStatus } from "../../../../features/complaints/repo";
import type { ComplaintStatus } from "../../../../features/complaints/types";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  if (message.includes("tidak valid") || message.includes("tidak ditemukan")) {
    return 400;
  }
  return 500;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageComplaints(db, actor.id);
    const { id } = await context.params;
    const body = await readJsonBody<{ status?: ComplaintStatus }>(request);
    if (!body.status) throw new Error("Status komplain tidak valid.");
    const complaint = await updateComplaintStatus(db, id, body.status, actor.id);
    return jsonOk(complaint);
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
