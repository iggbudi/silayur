import { createRequire } from "node:module";
import { drizzle as drizzleNode } from "drizzle-orm/libsql";
import { drizzle as drizzleWeb } from "drizzle-orm/libsql/web";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { getTursoRuntimeCredentials } from "./runtime-env";

export type AppDb = LibSQLDatabase<typeof schema>;

type CreateClient = (config: {
  url: string;
  authToken?: string;
}) => {
  execute(sql: string): Promise<unknown>;
  transaction(mode: string): unknown;
  close(): void;
};

/**
 * Load the Node `@libsql/client` through `createRequire` so the native
 * `libsql` addon resolves via Node's own module system instead of being
 * bundled by Rolldown (which cannot expose `require` for native modules).
 * Only used in the local-file branch; Workers/edge always use the remote
 * web client and never reach this code path.
 */
function loadNodeCreateClient(): CreateClient {
  const requireFromHere = createRequire(import.meta.url);
  const mod = requireFromHere("@libsql/client") as {
    createClient: CreateClient;
  };
  return mod.createClient;
}

/**
 * Database handle for API routes.
 * - Remote Turso: fetch-based web client (Workers-safe).
 * - Local file: Node libsql client only.
 *
 * `@libsql/client` resolves to the web build under `workerd` conditional
 * exports (rejects `file:` URLs) and its Node build needs native `require`
 * for the bundled `libsql` addon. The local branch therefore loads the Node
 * client via `createRequire` at runtime so `dist/standalone` works with
 * local `file:` databases, while Workers/edge always use the remote web client.
 */
export async function getRequestDb(): Promise<AppDb> {
  const creds = getTursoRuntimeCredentials();
  if (!creds.ok) {
    throw new Error(creds.error);
  }

  if (creds.mode === "remote") {
    const { createClient } = await import("@libsql/client/web");
    const client = createClient({
      url: creds.url,
      authToken: creds.authToken,
    });
    return drizzleWeb(client, { schema }) as unknown as AppDb;
  }

  const createClient = loadNodeCreateClient();
  const client = createClient({
    url: creds.url,
    authToken: creds.authToken,
  });
  return drizzleNode(client as never, { schema });
}
