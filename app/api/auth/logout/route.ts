import {
  clearedSessionCookie,
  revokeRequestSession,
} from "../../../../db/auth-repo";
import { getRequestDb } from "../../../../db/get-db";
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
} from "../../../../db/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = await getRequestDb();
    await revokeRequestSession(db, request);
    return jsonOk(
      { ok: true },
      {
        headers: {
          "set-cookie": clearedSessionCookie(request.url),
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    const status =
      error instanceof Error && error.message.includes("lintas origin")
        ? 403
        : 500;
    return jsonError(error, status);
  }
}
