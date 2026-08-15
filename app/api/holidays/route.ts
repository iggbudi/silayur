/**
 * API kalender hari libur: GET (daftar), POST (tambah), DELETE (hapus).
 * Thin handler: parsing, auth, RBAC. Logika di features/holidays.
 */
import { AuthenticationError, requireRequestUser } from "../../../db/auth-repo";
import { assertCanManageSettings } from "../../../db/config-repo";
import { getRequestDb } from "../../../db/get-db";
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  readJsonBody,
} from "../../../db/http";
import {
  deleteHoliday,
  listHolidays,
  upsertHoliday,
} from "../../features/holidays/repo";
import type { HolidayInput } from "../../features/holidays/types";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  if (message.includes("tidak valid") || message.includes("wajib")) return 400;
  return 500;
}

export async function GET(request: Request) {
  try {
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageSettings(db, actor.id);
    const holidays = await listHolidays(db);
    return jsonOk({ holidays }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageSettings(db, actor.id);
    const input = await readJsonBody<HolidayInput>(request);
    const holiday = await upsertHoliday(db, input, actor.id);
    return jsonOk(holiday);
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageSettings(db, actor.id);
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? "";
    await deleteHoliday(db, date);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
