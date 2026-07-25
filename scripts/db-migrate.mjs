import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

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
  const fromEnv = process.env.TURSO_DATABASE_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : "file:./.data/silayur.db";
}

async function ensureLocalDir(url) {
  if (!url.startsWith("file:")) return;
  const filePath = path.resolve(root, url.slice("file:".length));
  await mkdir(path.dirname(filePath), { recursive: true });
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

  await ensureLocalDir(url);

  const client = createClient({
    url: url.startsWith("file:")
      ? `file:${path.resolve(root, url.slice("file:".length))}`
      : url,
    authToken,
  });

  const db = drizzle(client);
  const migrationsFolder = path.join(root, "drizzle");
  await migrate(db, { migrationsFolder });
  client.close();

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: "migrate",
        mode,
        url: mode === "remote" ? url : path.resolve(root, url.slice("file:".length)),
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
