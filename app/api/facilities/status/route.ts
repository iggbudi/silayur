/**
 * API catat/ubah status fasilitas (POST /api/facilities/status).
 */
import { AuthenticationError, requireRequestUser } from "../../../../db/auth-repo";
import { assertCanManageFacilities } from "../../../../db/config-repo";
import { getRequestDb } from "../../../../db/get-db";
import { assertSameOrigin, jsonError, jsonOk, readJsonBody } from "../../../../db/http";
import { upsertFacilityStatus } from "../../../features/facilities/repo";
import type { FacilityStatusInput } from "../../../features/facilities/types";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  if (
    message.includes("wajib") ||
    message.includes("tidak valid") ||
    message.includes("tidak ditemukan") ||
    message.includes("nonaktif")
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
    await assertCanManageFacilities(db, actor.id);
    const input = await readJsonBody<FacilityStatusInput>(request);
    const row = await upsertFacilityStatus(db, input, actor.id);
    return jsonOk(row);
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
