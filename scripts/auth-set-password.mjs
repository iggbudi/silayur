import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { hashPassword } from "../shared/password.mjs";

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
    // Optional local configuration.
  }
}

async function main() {
  await loadDotEnv();
  const username = process.argv[2]?.trim().toLowerCase();
  const password = process.env.SILAYUR_NEW_PASSWORD;
  if (!username) {
    throw new Error("Usage: npm run auth:set-password -- <username>");
  }
  if (!password) {
    throw new Error("Set SILAYUR_NEW_PASSWORD before running this command.");
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required (postgres://...).");
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  const passwordHash = await hashPassword(password);
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE users
       SET password_hash = $1, updated_at = now()
       WHERE username = $2`,
      [passwordHash, username],
    );
    if (result.rowCount !== 1) {
      throw new Error(`Pengguna tidak ditemukan: ${username}`);
    }
    await client.query(
      `DELETE FROM auth_sessions
       WHERE user_id = (SELECT id FROM users WHERE username = $1)`,
      [username],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
  console.log(
    JSON.stringify({ ok: true, username, sessionsRevoked: true }, null, 2),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
