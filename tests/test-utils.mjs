import { readFileSync } from "node:fs";
import { rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

export function cleanupTempDirectory(directory) {
  try {
    rmSync(directory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  } catch (error) {
    if (error?.code !== "EPERM") throw error;
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let envLoaded = false;

/** Load `.env` (hanya mengisi yang belum ada) agar DATABASE_URL tersedia. */
export function loadDotEnv() {
  if (envLoaded) return;
  envLoaded = true;
  try {
    const raw = readFileSync(path.join(root, ".env"), "utf8");
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
    // .env opsional
  }
}

/** URL database test: TEST_DATABASE_URL, fallback DATABASE_URL. */
export function testDatabaseUrl() {
  loadDotEnv();
  return process.env.TEST_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || "";
}

/**
 * Buka client PostgreSQL untuk database test.
 * Memanggilnya berarti test butuh Postgres jalan (lihat README).
 */
export async function connectTestDb() {
  const url = testDatabaseUrl();
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL (atau DATABASE_URL) belum diset — test butuh PostgreSQL.",
    );
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

/** Tabel master (dari seed) — dibiarkan agar test punya data seed. */
const MASTER_TABLES = [
  "modules",
  "roles",
  "role_permissions",
  "users",
  "ticket_products",
  "ticket_prices",
  "config_items",
  "schema_version",
];

/** Tabel data kerja (transaksi & catatan harian) — dibersihkan per test. */
const WORK_TABLES = [
  "auth_sessions",
  "holidays",
  "operations_checklist",
  "facility_status",
  "complaints",
  "cash_sessions",
  "expenses",
  "revenue_entries",
  "receipt_counters",
  "sale_items",
  "sales",
  "employees",
  "schedule_shifts",
  "pic_assignments",
];

/** Kosongkan semua tabel aplikasi (TRUNCATE ... RESTART IDENTITY CASCADE). */
export async function truncateAllTables(client) {
  const tables = [...MASTER_TABLES, ...WORK_TABLES];
  await client.query(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`);
}

const TEST_PASSWORD = "LocalTestPassword-2026!";

/**
 * Siapkan environment test PostgreSQL: set env dari TEST_DATABASE_URL,
 * jalankan migrate + seed (idempotent). Dipanggil di awal tiap test suite.
 */
export function prepareTestEnv() {
  loadDotEnv();
  const url = testDatabaseUrl();
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL (atau DATABASE_URL) belum diset — test butuh PostgreSQL.",
    );
  }
  const env = {
    ...process.env,
    DATABASE_URL: url,
    SILAYUR_SEED_ADMIN_PASSWORD: TEST_PASSWORD,
    SILAYUR_SEED_DEFAULT_PASSWORD: TEST_PASSWORD,
  };
  const run = (script) => {
    const result = spawnSync(
      process.execPath,
      [path.join(root, script)],
      { cwd: root, env, encoding: "utf8" },
    );
    if (result.status !== 0) {
      throw new Error(`${script} gagal: ${result.stderr || result.stdout}`);
    }
  };
  run("scripts/db-migrate.mjs");
  run("scripts/db-seed.mjs");
  process.env.DATABASE_URL = url;
  return { env };
}

/**
 * Bersihkan semua tabel aplikasi agar tiap test mulai dari state kosong.
 * Panggil SEBELUM prepareTestEnv() (yang migrate+seed mengisi master).
 * Client ditutup setelahnya.
 */
export async function resetTestDb() {
  const client = await connectTestDb();
  await truncateAllTables(client);
  await client.end();
}
