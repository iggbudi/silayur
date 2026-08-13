/**
 * Endpoint untuk menyetujui pembatalan (void) transaksi penjualan tiket.
 * Hanya role penyetuju (super_admin / manager / supervisor) dengan
 * verifikasi password-nya sendiri.
 */
import {
  AuthenticationError,
  authenticateWithPassword,
  requireRequestUser,
} from "../../../../../db/auth-repo";
import { getRequestDb } from "../../../../../db/get-db";
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  readJsonBody,
} from "../../../../../db/http";
import { canApproveVoid } from "../../../../../shared/access";
import { approveVoid } from "../../../../features/ticket-sales/repo";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  if (
    message.includes("wajib") ||
    message.includes("tidak valid") ||
    message.includes("tidak ditemukan") ||
    message.includes("menunggu")
  ) {
    return 400;
  }
  return 500;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = getRequestDb();
    const actor = await requireRequestUser(db, request);
    if (!canApproveVoid(actor.role)) {
      throw new Error("Anda tidak memiliki izin untuk menyetujui pembatalan.");
    }
    const body = await readJsonBody<{ saleId: string; password: string }>(
      request,
    );
    const password = body?.password ?? "";
    const verified = await authenticateWithPassword(
      db,
      actor.username,
      password,
    );
    if (!verified) {
      throw new AuthenticationError("Password tidak valid.", 401);
    }
    const sale = await approveVoid(db, body?.saleId ?? "", actor.id);
    return jsonOk(sale, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
