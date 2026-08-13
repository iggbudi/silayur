import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

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
  const fromEnv = process.env.TURSO_DATABASE_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : "file:./.data/silayur.db";
}

async function main() {
  await loadDotEnv();
  const url = resolveUrl();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
  const mode =
    url.startsWith("libsql://") || url.startsWith("https://")
      ? "remote"
      : "local-file";

  if (mode === "remote" && !authToken) {
    throw new Error("Remote Turso URL requires TURSO_AUTH_TOKEN.");
  }

  const client = createClient({
    url: url.startsWith("file:")
      ? `file:${path.resolve(root, url.slice("file:".length))}`
      : url,
    authToken,
  });

  const tables = [
    "modules",
    "roles",
    "role_permissions",
    "users",
    "ticket_products",
    "ticket_prices",
    "config_items",
    "auth_sessions",
    "schema_version",
    "sales",
    "sale_items",
    "receipt_counters",
    "revenue_entries",
    "expenses",
    "cash_sessions",
  ];
  const counts = {};
  for (const table of tables) {
    const result = await client.execute(`SELECT COUNT(*) AS c FROM ${table}`);
    counts[table] = Number(result.rows[0].c);
  }

  const sampleUsers = await client.execute(
    `SELECT id, name, username, role_key, active FROM users ORDER BY username LIMIT 10`,
  );

  client.close();

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: "check",
        mode,
        counts,
        sampleUsers: sampleUsers.rows,
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
