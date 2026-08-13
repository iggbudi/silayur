/**
 * One-off: dump semua data dari database (remote/local) ke file JSON.
 * Dipakai sebagai pengganti `turso db snapshot` saat Cloud CLI tidak tersedia.
 * Jalankan: node --env-file=.env scripts/backup-remote.mjs
 */
import { createClient } from "@libsql/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
if (!url) throw new Error("TURSO_DATABASE_URL required.");

const client = createClient({ url, authToken });
const tables = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'libsql_%' ORDER BY name",
);
const dump = {};
for (const row of tables.rows) {
  const name = row.name;
  const res = await client.execute(`SELECT * FROM "${name}"`);
  dump[name] = { columns: res.columns, rows: res.rows };
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = path.join(root, ".data", `backup-pre-finance-${stamp}.json`);
await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, JSON.stringify(dump, null, 2));
console.log(`OK backup → ${outFile} (${tables.rows.length} tabel)`);
client.close();
