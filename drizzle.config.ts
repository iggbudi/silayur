import { defineConfig } from "drizzle-kit";

/**
 * PostgreSQL via Drizzle Kit.
 * Butuh DATABASE_URL (postgres://...) — lihat `.env`.
 */
const url =
  process.env.DATABASE_URL?.trim() ||
  "postgres://postgres:postgres@127.0.0.1:5432/silayur";

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
