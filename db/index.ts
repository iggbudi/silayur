/**
 * Database entrypoint for SILAYUR (PostgreSQL).
 *
 * - API routes: `getRequestDb()` dari `./get-db`.
 * - Scripts/tests Node: `createDb()` / `getDb()` dari `./client`.
 */
export { createDb, getDb, type AppDatabase, type DbBundle } from "./client";
export { resolveDbEnv, type DbEnv } from "./env";
export * from "./schema";
