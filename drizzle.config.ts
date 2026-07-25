import { defineConfig } from "drizzle-kit";

/**
 * Turso/libSQL via Drizzle Kit.
 * Defaults to a local file so `db:generate` / migrate work without cloud credentials.
 * For remote Turso, set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in `.env`.
 */
const url = process.env.TURSO_DATABASE_URL?.trim() || "file:./.data/silayur.db";
const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url,
    authToken,
  },
});
