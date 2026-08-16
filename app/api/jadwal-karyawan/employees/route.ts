/**
 * API Jadwal Karyawan — GET/POST daftar karyawan.
 */

import { AuthenticationError, requireRequestUser } from "../../../../db/auth-repo";
import {
  assertCanManageJadwalKaryawan,
  assertCanViewJadwalKaryawan,
} from "../../../../db/config-repo";
import { getRequestDb } from "../../../../db/get-db";
import { assertSameOrigin, jsonError, jsonOk, readJsonBody } from "../../../../db/http";
import {
  createEmployee,
  listEmployees,
} from "../../../features/jadwal-karyawan/repo";
import { createEmployeeSchema } from "../../../features/jadwal-karyawan/validation";

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

    const list = await listEmployees(db);
    return jsonOk({ employees: list }, { headers: { "cache-control": "no-store" } });
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

    const input = createEmployeeSchema.parse(await readJsonBody(request));
    const result = await createEmployee(db, input);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
