import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

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
  return process.env.DATABASE_URL?.trim() || "";
}

async function main() {
  await loadDotEnv();
  const url = resolveUrl();
  if (!url) {
    throw new Error("DATABASE_URL is required (postgres://...).");
  }

  const client = new Client({ connectionString: url });
  await client.connect();

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
    "complaints",
    "facility_status",
    "operations_checklist",
    "holidays",
    "employees",
    "schedule_shifts",
    "pic_assignments",
  ];
  const counts = {};
  for (const table of tables) {
    const result = await client.query(`SELECT COUNT(*) AS c FROM ${table}`);
    counts[table] = Number(result.rows[0].c);
  }

  const sampleUsers = await client.query(
    `SELECT id, name, username, role_key, active FROM users ORDER BY username LIMIT 10`,
  );

  await client.end();

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: "check",
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
