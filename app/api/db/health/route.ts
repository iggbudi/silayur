import { sql } from "drizzle-orm";
import {
  AuthenticationError,
  requireRequestUser,
} from "../../../../db/auth-repo";
import { assertCanManageSettings } from "../../../../db/config-repo";
import { getRequestDb, type AppDb } from "../../../../db/get-db";
import {
  authSessions,
  configItems,
  modules,
  rolePermissions,
  roles,
  schemaVersion,
  ticketPrices,
  ticketProducts,
  users,
} from "../../../../db/schema";
import { jsonError, jsonOk } from "../../../../db/http";

export const dynamic = "force-dynamic";

async function tableCount(
  db: AppDb,
  table:
    | typeof modules
    | typeof roles
    | typeof rolePermissions
    | typeof users
    | typeof ticketProducts
    | typeof ticketPrices
    | typeof configItems
    | typeof authSessions
    | typeof schemaVersion,
): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`count(*)` })
    .from(table);
  return Number(rows[0]?.value ?? 0);
}

export async function GET(request: Request): Promise<Response> {
  try {
    const db = await getRequestDb();
    const actor = await requireRequestUser(db, request);
    await assertCanManageSettings(db, actor.id);

    const values = await Promise.all([
      tableCount(db, modules),
      tableCount(db, roles),
      tableCount(db, rolePermissions),
      tableCount(db, users),
      tableCount(db, ticketProducts),
      tableCount(db, ticketPrices),
      tableCount(db, configItems),
      tableCount(db, authSessions),
      tableCount(db, schemaVersion),
    ]);
    const counts = Object.fromEntries(
      [
        "modules",
        "roles",
        "role_permissions",
        "users",
        "ticket_products",
        "ticket_prices",
        "config_items",
        "auth_sessions",
        "schema_version",
      ].map((name, index) => [name, values[index]]),
    );

    return jsonOk({
      ok: true,
      checkpoint: "11",
      configured: true,
      driver: "turso-libsql",
      counts,
    });
  } catch (error) {
    const status =
      error instanceof AuthenticationError
        ? error.status
        : error instanceof Error && error.message.includes("izin")
          ? 403
          : 503;
    return jsonError(error, status, { checkpoint: "11" });
  }
}
