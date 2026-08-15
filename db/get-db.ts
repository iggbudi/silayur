import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { getRuntimeCredentials } from "./runtime-env";

export type AppDb = NodePgDatabase<typeof schema>;

let pool: Pool | null = null;
let db: AppDb | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const creds = getRuntimeCredentials();
  if (!creds.ok) {
    throw new Error(creds.error);
  }
  pool = new Pool({ connectionString: creds.url });
  return pool;
}

/** Database handle untuk API routes (PostgreSQL via node-postgres). */
export async function getRequestDb(): Promise<AppDb> {
  if (!db) {
    db = drizzle(getPool(), { schema }) as unknown as AppDb;
  }
  return db;
}
