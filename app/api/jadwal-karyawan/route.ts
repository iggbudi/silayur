/**
 * API Jadwal Karyawan — GET (daftar + ringkasan) & POST (buat jadwal).
 */

import { AuthenticationError, requireRequestUser } from "../../../db/auth-repo";
import {
  assertCanManageJadwalKaryawan,
  assertCanViewJadwalKaryawan,
} from "../../../db/config-repo";
import { getRequestDb } from "../../../db/get-db";
import { assertSameOrigin, jsonError, jsonOk, readJsonBody } from "../../../db/http";
import { todayIsoDate } from "../../../shared/date";
import {
  createSchedule,
  listJadwal,
} from "../../features/jadwal-karyawan/repo";
import { createScheduleSchema } from "../../features/jadwal-karyawan/validation";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  if (message.includes("wajib") || message.includes("tidak valid")) return 400;
  return 500;
}

export async function GET(request: Request) {
  try {
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanViewJadwalKaryawan(db, actor.id);

    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? todayIsoDate();
    const data = await listJadwal(db, date);

    return jsonOk(data, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageJadwalKaryawan(db, actor.id);

    const body = await readJsonBody<{ action: string; data: unknown }>(request);

    if (body?.action === "createSchedule") {
      const input = createScheduleSchema.parse(body.data);
      const result = await createSchedule(db, input);
      return jsonOk(result);
    }

    throw new Error("Aksi tidak dikenali.");
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
