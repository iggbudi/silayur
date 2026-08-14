/**
 * API komplain: GET (list per tanggal) & POST (buat).
 * Thin handler: parsing, auth, RBAC, same-origin. Logika di features/complaints.
 */
import { AuthenticationError, requireRequestUser } from "../../../db/auth-repo";
import {
  assertCanManageComplaints,
  assertCanViewComplaints,
} from "../../../db/config-repo";
import { getRequestDb } from "../../../db/get-db";
import { assertSameOrigin, jsonError, jsonOk, readJsonBody } from "../../../db/http";
import { todayIsoDate } from "../../../shared/date";
import {
  createComplaint,
  listComplaints,
} from "../../features/complaints/repo";
import type { ComplaintInput } from "../../features/complaints/types";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  if (
    message.includes("wajib") ||
    message.includes("tidak valid") ||
    message.includes("pendek")
  ) {
    return 400;
  }
  return 500;
}

export async function GET(request: Request) {
  try {
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanViewComplaints(db, actor.id);
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? todayIsoDate();
    const list = await listComplaints(db, date);
    return jsonOk(list, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageComplaints(db, actor.id);
    const input = await readJsonBody<ComplaintInput>(request);
    const complaint = await createComplaint(db, input, actor.id);
    return jsonOk(complaint);
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
