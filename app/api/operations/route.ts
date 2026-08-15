/**
 * API operasional: GET ringkasan checklist per tanggal & POST catat/ubah item.
 * Thin handler: parsing, auth, RBAC. Logika di features/operations.
 */
import { AuthenticationError, requireRequestUser } from "../../../db/auth-repo";
import {
  assertCanManageOperations,
  assertCanViewOperations,
} from "../../../db/config-repo";
import { getRequestDb } from "../../../db/get-db";
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  readJsonBody,
} from "../../../db/http";
import { todayIsoDate } from "../../../shared/date";
import {
  operationsStatus,
  upsertOperationsChecklist,
} from "../../features/operations/repo";
import type { OperationsChecklistInput } from "../../features/operations/types";

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

export async function GET(request: Request) {
  try {
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanViewOperations(db, actor.id);
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? todayIsoDate();
    const status = await operationsStatus(db, date);
    return jsonOk(status, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageOperations(db, actor.id);
    const input = await readJsonBody<OperationsChecklistInput>(request);
    const item = await upsertOperationsChecklist(db, input, actor.id);
    return jsonOk(item);
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
