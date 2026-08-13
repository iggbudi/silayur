// One-shot read-only check untuk state DB lokal — fokus __drizzle_migrations
import { createClient } from "@libsql/client";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function check(file) {
  const dbPath = path.resolve(root, file);
  const url = `file:${dbPath}`;
  console.log(`\n========== ${file} ==========`);
  const client = createClient({ url });
  try {
    try {
      const r = await client.execute(
        "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id",
      );
      console.log("=== __drizzle_migrations ===");
      for (const row of r.rows) console.log(" ", JSON.stringify(row));
    } catch (e) {
      console.log("__drizzle_migrations: <missing>");
    }
  } finally {
    client.close();
  }
}

await check(".data/silayur.db");
await check(".data/silayur-checkpoint9.db");


