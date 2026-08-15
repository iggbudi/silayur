/**
 * Migrasi password hash user dari DB Turso/libSQL lokal ke PostgreSQL.
 *
 * Data operasional Turso (transaksi) tidak ada; yang berguna hanya password
 * hash users agar akun yang sama bisa login di Postgres. Master data lain
 * sudah tersedia via seed.
 *
 * Penggunaan:
 *   set TURSO_DATABASE_URL=file:./.data/silayur.db
 *   set DATABASE_URL=postgres://...
 *   node scripts/migrate-passwords-turso-to-pg.mjs
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { Client } from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

async function main() {
  await loadDotEnv();
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  const pgUrl = process.env.DATABASE_URL?.trim();
  if (!tursoUrl || !pgUrl) {
    throw new Error("Butuh TURSO_DATABASE_URL dan DATABASE_URL.");
  }
  if (!tursoUrl.startsWith("file:")) {
    throw new Error("TURSO_DATABASE_URL harus file: (DB Turso lokal).");
  }

  const tursoClient = createClient({
    url: tursoUrl.startsWith("file:")
      ? `file:${path.resolve(root, tursoUrl.slice("file:".length))}`
      : tursoUrl,
  });
  const users = await tursoClient.execute(
    "SELECT username, password_hash FROM users WHERE password_hash IS NOT NULL AND password_hash != ''",
  );
  tursoClient.close();

  const pgClient = new Client({ connectionString: pgUrl });
  await pgClient.connect();

  let updated = 0;
  let skipped = 0;
  try {
    await pgClient.query("BEGIN");
    for (const row of users.rows) {
      const username = String(row.username);
      const hash = String(row.password_hash);
      const result = await pgClient.query(
        `UPDATE users SET password_hash = $1 WHERE username = $2 AND password_hash IS DISTINCT FROM $1`,
        [hash, username],
      );
      if (result.rowCount === 1) {
        updated += 1;
        console.log(`- ${username}: hash diperbarui`);
      } else {
        skipped += 1;
      }
    }
    await pgClient.query("COMMIT");
  } catch (error) {
    await pgClient.query("ROLLBACK");
    throw error;
  } finally {
    await pgClient.end();
  }

  console.log(JSON.stringify({ ok: true, action: "migrate-passwords", updated, skipped }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
