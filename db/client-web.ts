import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { resolveTursoEnv, type TursoEnv } from "./env";

export type AppWebDatabase = LibSQLDatabase<typeof schema>;

export type WebDbBundle = {
  db: AppWebDatabase;
  env: TursoEnv;
};

/**
 * Edge/Workers-safe Turso client using fetch-based libSQL.
 * Local `file:` URLs are not supported in Workers — use remote Turso there.
 */
export function createWebDb(
  envSource: Record<string, string | undefined> = process.env,
): WebDbBundle {
  const env = resolveTursoEnv(envSource);

  if (env.mode === "local-file") {
    throw new Error(
      "Local file databases are not available in the Workers runtime. Set TURSO_DATABASE_URL to a libsql:// remote URL and provide TURSO_AUTH_TOKEN.",
    );
  }

  if (!env.authToken) {
    throw new Error("TURSO_AUTH_TOKEN is required for remote Turso access.");
  }

  const client = createClient({
    url: env.url,
    authToken: env.authToken,
  });

  return {
    db: drizzle(client, { schema }),
    env,
  };
}
