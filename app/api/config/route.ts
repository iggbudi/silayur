import {
  assertCanManageSettings,
  assertCanViewSettings,
  loadConfigSnapshot,
  saveConfigPatch,
  type ConfigPatch,
} from "../../../db/config-repo";
import {
  AuthenticationError,
  requireRequestUser,
} from "../../../db/auth-repo";
import { getRequestDb } from "../../../db/get-db";
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  readJsonBody,
} from "../../../db/http";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("izin") || message.includes("lintas origin")) return 403;
  if (
    message.includes("wajib") ||
    message.includes("required") ||
    message.includes("Invalid") ||
    message.includes("Duplicate") ||
    message.includes("Unknown") ||
    message.includes("tidak valid") ||
    message.includes("Minimal")
  ) {
    return 400;
  }
  return 500;
}

export async function GET(request: Request) {
  try {
    const db = getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanViewSettings(db, actor.id);
    const config = await loadConfigSnapshot(db);
    return jsonOk(
      { ok: true, ...config },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error, statusFor(error), { checkpoint: "9" });
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const db = getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageSettings(db, actor.id);
    const patch = await readJsonBody<ConfigPatch>(request);
    const config = await saveConfigPatch(db, patch);
    return jsonOk({ ok: true, ...config });
  } catch (error) {
    return jsonError(error, statusFor(error), { checkpoint: "9" });
  }
}
