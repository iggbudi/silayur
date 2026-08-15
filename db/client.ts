import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { getRuntimeCredentials } from "./runtime-env";

export type AppDatabase = NodePgDatabase<typeof schema>;

export type DbBundle = {
  client: Pool;
  db: AppDatabase;
  url: string;
};

/**
 * PostgreSQL-oriented client for scripts, tests, dan runtime Node.
 * Untuk API routes gunakan `getRequestDb()` dari `./get-db`.
 */
export function createDb(
  envSource: Record<string, string | undefined> = process.env,
): DbBundle {
  const url = envSource.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL (postgres://...).",
    );
  }
  const client = new Pool({ connectionString: url });
  const db = drizzle(client, { schema }) as unknown as AppDatabase;
  return { client, db, url };
}

/** Convenience helper dipakai scripts/tests ketika berjalan di Node. */
export function getDb(): AppDatabase {
  const creds = getRuntimeCredentials();
  if (!creds.ok) throw new Error(creds.error);
  const client = new Pool({ connectionString: creds.url });
  return drizzle(client, { schema }) as unknown as AppDatabase;
}
