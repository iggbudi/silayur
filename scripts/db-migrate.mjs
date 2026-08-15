import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/** Load `.env` when not already provided via `node --env-file`. */
async function loadDotEnv() {
  try {
    const raw = await readFile(path.join(root, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

function resolveUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

async function main() {
  await loadDotEnv();
  const url = resolveUrl();
  if (!url) {
    throw new Error("DATABASE_URL is required (postgres://...).");
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  const migrationsFolder = path.join(root, "drizzle");
  await migrate(db, { migrationsFolder });
  await pool.end();

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: "migrate",
        url: url.replace(/:[^:@/]+@/, ":***@"),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
