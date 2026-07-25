import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
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

  const url =
    process.env.TURSO_DATABASE_URL?.trim() || "file:./.data/silayur.db";
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
  const client = createClient({
    url: url.startsWith("file:")
      ? `file:${path.resolve(root, url.slice("file:".length))}`
      : url,
    authToken,
  });
  const passwordHash = await hashPassword(password);
  const result = await client.execute({
    sql: `UPDATE users
          SET password_hash = ?, updated_at = datetime('now')
          WHERE username = ?`,
    args: [passwordHash, username],
  });
  client.close();
  if (result.rowsAffected !== 1) {
    throw new Error(`Pengguna tidak ditemukan: ${username}`);
  }
  console.log(JSON.stringify({ ok: true, username }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
