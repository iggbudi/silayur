import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { resolveTursoEnv, type TursoEnv } from "./env";

export type AppDatabase = LibSQLDatabase<typeof schema>;

export type DbBundle = {
  client: Client;
  db: AppDatabase;
  env: TursoEnv;
};

/**
 * Node-oriented Turso/libSQL client (scripts, tests, Node runtimes).
 * For Workers/edge prefer `createWebDb()` from `./client-web`.
 */
export function createDb(
  envSource: Record<string, string | undefined> = process.env,
): DbBundle {
  const env = resolveTursoEnv(envSource);
  if (!env.configured) {
    throw new Error(
      "Database is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN, or use a local file URL (file:./.data/silayur.db).",
    );
  }

  if (env.mode === "remote" && !env.authToken) {
    throw new Error(
      "Remote Turso URL requires TURSO_AUTH_TOKEN (or LIBSQL_AUTH_TOKEN).",
    );
  }

  const client = createClient({
    url: env.url,
    authToken: env.authToken,
  });

  const db = drizzle(client, { schema });
  return { client, db, env };
}

/** Convenience helper used by API routes when running in Node. */
export function getDb(): AppDatabase {
  return createDb().db;
}
