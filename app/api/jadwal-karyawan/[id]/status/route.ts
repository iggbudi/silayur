/**
 * API Jadwal Karyawan — POST update status kehadiran jadwal.
 * Route: /api/jadwal-karyawan/[id]/status
 */

import { AuthenticationError, requireRequestUser } from "../../../../../db/auth-repo";
import { assertCanManageJadwalKaryawan } from "../../../../../db/config-repo";
import { getRequestDb } from "../../../../../db/get-db";
import { assertSameOrigin, jsonError, jsonOk, readJsonBody } from "../../../../../db/http";
import { updateScheduleStatus } from "../../../../features/jadwal-karyawan/repo";
import { updateScheduleStatusSchema } from "../../../../features/jadwal-karyawan/validation";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  if (message.includes("wajib") || message.includes("tidak valid") || message.includes("tidak ditemukan")) return 400;
  return 500;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageJadwalKaryawan(db, actor.id);

    const { id } = await params;
    const input = updateScheduleStatusSchema.parse(await readJsonBody(request));
    const result = await updateScheduleStatus(db, id, input);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
