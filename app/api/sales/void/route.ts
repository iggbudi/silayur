/**
 * Endpoint untuk mengajukan pembatalan (void) transaksi penjualan tiket.
 * Petugas loket (visitors: view) dapat mengajukan; persetujuan terpisah.
 */
import { AuthenticationError, requireRequestUser } from "../../../../db/auth-repo";
import { assertCanViewVisitors } from "../../../../db/config-repo";
import { getRequestDb } from "../../../../db/get-db";
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  readJsonBody,
} from "../../../../db/http";
import { requestVoid } from "../../../features/ticket-sales/repo";

export const dynamic = "force-dynamic";

function statusFor(error: unknown): number {
  if (error instanceof AuthenticationError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lintas origin") || message.includes("izin")) return 403;
  if (
    message.includes("wajib") ||
    message.includes("tidak valid") ||
    message.includes("tidak ditemukan") ||
    message.includes("selesai") ||
    message.includes("menunggu")
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
    await assertCanViewVisitors(db, actor.id);
    const body = await readJsonBody<{ saleId: string; reason: string }>(
      request,
    );
    const sale = await requestVoid(
      db,
      body?.saleId ?? "",
      actor.id,
      body?.reason ?? "",
    );
    return jsonOk(sale, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return jsonError(error, statusFor(error));
  }
}
