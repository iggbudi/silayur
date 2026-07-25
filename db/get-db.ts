import { createClient } from "@libsql/client";
import { createClient as createWebClient } from "@libsql/client/web";
import { drizzle as drizzleNode } from "drizzle-orm/libsql";
import { drizzle as drizzleWeb } from "drizzle-orm/libsql/web";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { getTursoRuntimeCredentials } from "./runtime-env";

export type AppDb = LibSQLDatabase<typeof schema>;

/**
 * Database handle for API routes.
 * - Remote Turso: prefer fetch-based web client (Workers-safe).
 * - Local file: Node libsql client only.
 */
export function getRequestDb(): AppDb {
  const creds = getTursoRuntimeCredentials();
  if (!creds.ok) {
    throw new Error(creds.error);
  }

  if (creds.mode === "remote") {
    const client = createWebClient({
      url: creds.url,
      authToken: creds.authToken,
    });
    return drizzleWeb(client, { schema }) as unknown as AppDb;
  }

  const client = createClient({
    url: creds.url,
    authToken: creds.authToken,
  });
  return drizzleNode(client, { schema });
}
