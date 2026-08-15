/**
 * Seed kalender libur nasional Indonesia (idempotent).
 *
 * Memasukkan tanggal libur nasional ke tabel `holidays` agar tarif weekend
 * otomatis berlaku pada tanggal merah (tanpa input manual per tanggal).
 * Daftar ini statis untuk tahun 2026; tambahkan tahun berikutnya di sini.
 *
 * Aman: menolak database non-lokal (localhost/127.0.0.1) kecuali di-force
 * SILAYUR_DEMO_ALLOW_REMOTE=1.
 *
 * Penggunaan:
 *   node scripts/db-seed-holidays.mjs
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Libur nasional Indonesia 2026 (tanggal tetap + cuti bersama utama). */
const HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "Tahun Baru Masehi" },
  { date: "2026-01-19", name: "Isra Mikraj" },
  { date: "2026-02-17", name: "Tahun Baru Imlek" },
  { date: "2026-03-19", name: "Hari Raya Nyepi" },
  { date: "2026-03-20", name: "Cuti bersama Nyepi" },
  { date: "2026-03-21", name: "Wafat Isa Al-Masih" },
  { date: "2026-04-03", name: "Wafat Isa Al-Masih" },
  { date: "2026-05-01", name: "Hari Buruh" },
  { date: "2026-05-21", name: "Hari Raya Waisak" },
  { date: "2026-05-27", name: "Kenaikan Isa Al-Masih" },
  { date: "2026-06-01", name: "Hari Lahir Pancasila" },
  { date: "2026-08-17", name: "HUT Kemerdekaan RI" },
  { date: "2026-12-25", name: "Hari Raya Natal" },
];

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

function isLocalHost(url) {
  return /localhost|127\.0\.0\.1|::1/i.test(url);
}

async function main() {
  await loadDotEnv();
  const url = process.env.DATABASE_URL?.trim() || "";
  if (!url) throw new Error("DATABASE_URL is required (postgres://...).");

  if (!isLocalHost(url)) {
    const allow = process.env.SILAYUR_DEMO_ALLOW_REMOTE?.trim() === "1";
    if (!allow) {
      throw new Error(
        "Menolak seed libur nasional ke database non-lokal. " +
          "Set SILAYUR_DEMO_ALLOW_REMOTE=1 hanya dengan otorisasi owner.",
      );
    }
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  let inserted = 0;
  let existing = 0;
  try {
    await client.query("BEGIN");
    for (const holiday of HOLIDAYS_2026) {
      const result = await client.query(
        `INSERT INTO holidays (id, date, name, created_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (date) DO NOTHING`,
        [
          `hol-nasional-${holiday.date}`,
          holiday.date,
          holiday.name,
          "admin-resepsionis",
        ],
      );
      if (result.rowCount === 1) inserted += 1;
      else existing += 1;
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }

  console.log(
    JSON.stringify(
      { ok: true, action: "seed-holidays", inserted, existing, year: 2026 },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
