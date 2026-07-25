/**
 * Database entrypoint for SILAYUR.
 *
 * Prefer:
 * - `createDb()` / `getDb()` from `./client` in Node scripts and Node runtimes
 * - `createWebDb()` from `./client-web` on Cloudflare Workers / edge
 *
 * Schema is Turso/libSQL (SQLite dialect). Cloudflare D1 is not used.
 */
export { createDb, getDb, type AppDatabase, type DbBundle } from "./client";
export { createWebDb, type AppWebDatabase, type WebDbBundle } from "./client-web";
export {
  resolveTursoEnv,
  localDbFilePath,
  DEFAULT_LOCAL_URL,
  type TursoEnv,
} from "./env";
export * from "./schema";
