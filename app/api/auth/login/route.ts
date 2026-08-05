import { getRoleAccessMap } from "../../../../shared/access";
import {
  authenticateWithPassword,
  AuthenticationError,
  createAuthSession,
  requireRequestUser,
  sessionCookie,
} from "../../../../db/auth-repo";
import { loadConfigSnapshot } from "../../../../db/config-repo";
import { getRequestDb } from "../../../../db/get-db";
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  readJsonBody,
} from "../../../../db/http";

export const dynamic = "force-dynamic";

type LoginBody = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = getRequestDb();
    const body = await readJsonBody<LoginBody>(request);
    const user = await authenticateWithPassword(
      db,
      body.username ?? "",
      body.password ?? "",
    );
    if (!user) {
      return jsonError("Username atau password tidak valid.", 401, {
        checkpoint: "9",
      });
    }

    const token = await createAuthSession(db, user.id);
    const config = await loadConfigSnapshot(db);
    return jsonOk(
      {
        ok: true,
        checkpoint: "9",
        user,
        role:
          config.roles.find((role) => role.key === user.role) ?? null,
        access: getRoleAccessMap(config.permissions, user.role),
        modules: config.modules,
      },
      {
        headers: {
          "set-cookie": sessionCookie(token, request.url),
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    const status =
      error instanceof Error && error.message.includes("lintas origin")
        ? 403
        : 503;
    return jsonError(error, status, { checkpoint: "11" });
  }
}

export async function GET(request: Request) {
  try {
    const db = getRequestDb();
    const user = await requireRequestUser(db, request);
    const config = await loadConfigSnapshot(db);
    return jsonOk(
      {
        ok: true,
        checkpoint: "11",
        user,
        role:
          config.roles.find((role) => role.key === user.role) ?? null,
        access: getRoleAccessMap(config.permissions, user.role),
        modules: config.modules,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const status =
      error instanceof AuthenticationError ? error.status : 503;
    return jsonError(error, status, { checkpoint: "11" });
  }
}
