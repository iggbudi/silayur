import { loadConfigSnapshot } from "../../../../db/config-repo";
import { getRequestDb } from "../../../../db/get-db";
import { assertSameOrigin, jsonError, jsonOk } from "../../../../db/http";
import { getParkName } from "../../../../shared/config";

export const dynamic = "force-dynamic";

/**
 * Endpoint publik (tanpa autentikasi) yang hanya mengembalikan nama tampilan
 * tempat wisata — cukup agar halaman login (pra-login) bisa menampilkannya.
 * Tidak membocorkan konfigurasi lain.
 */
export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const db = await getRequestDb();
    const config = await loadConfigSnapshot(db);
    return jsonOk(
      { ok: true, parkName: getParkName(config.configItems) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error, 500, { checkpoint: "11" });
  }
}
