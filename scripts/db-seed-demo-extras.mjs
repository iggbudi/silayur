/**
 * Seed tambahan untuk demo lokal: melengkapi data yang tidak ada di seed dasar
 * supaya fitur yang sudah ada benar-benar bisa diuji end-to-end (PostgreSQL).
 *
 * Yang ditambahkan:
 *   1. Tarif tiket Anak (weekday Rp 10.000, weekend Rp 12.000).
 *   2. Aktivasi tarif Weekend Dewasa (Rp 20.000) yang di-seed nonaktif.
 *   3. User untuk role yang belum punya akun demo (finance_officer,
 *      supervisor, field_officer, customer_service) — password default demo.
 *
 * ✅ Aman: menolak database non-lokal (host selain localhost/127.0.0.1)
 *    kecuali di-force `SILAYUR_DEMO_ALLOW_REMOTE=1`.
 *    Idempotent: hanya menambah bila belum ada; aktivasi tarif via upsert
 *    `active=1` tidak mengubah harga master yang sudah dikonfigurasi.
 *
 * Penggunaan (setelah `db-migrate` + `db-seed` + `db-seed-demo`):
 *   node scripts/db-seed-demo-extras.mjs
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { hashPassword } from "../shared/password.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const EXTRA_TICKET_PRICES = [
  {
    id: "price-child-weekday-2026",
    ticketProductId: "ticket-child",
    dayType: "weekday",
    price: 10000,
    validFrom: "2026-07-25",
    validUntil: null,
    active: true,
  },
  {
    id: "price-child-weekend-2026",
    ticketProductId: "ticket-child",
    dayType: "weekend",
    price: 12000,
    validFrom: "2026-07-25",
    validUntil: null,
    active: true,
  },
];

/** Tarif seed yang sengaja nonaktif (Dewasa weekend Rp 20.000) → aktifkan. */
const ACTIVATE_PRICE_IDS = ["price-adult-weekend-2026"];

const EXTRA_USERS = [
  {
    id: "budi-keuangan",
    name: "Budi Keuangan",
    username: "budi.keuangan",
    role: "finance_officer",
  },
  {
    id: "ratna-supervisor",
    name: "Ratna Supervisor",
    username: "ratna.supervisor",
    role: "supervisor",
  },
  {
    id: "agus-lapangan",
    name: "Agus Lapangan",
    username: "agus.lapangan",
    role: "field_officer",
  },
  {
    id: "dewi-cs",
    name: "Dewi Customer Service",
    username: "dewi.cs",
    role: "customer_service",
  },
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
      // Jangan override env yang sudah eksplisit.
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Optional local configuration.
  }
}

function resolveUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

/** Apakah host DB menunjuk mesin lokal (localhost/127.0.0.1)? */
function isLocalHost(url) {
  return /localhost|127\.0\.0\.1|::1/i.test(url);
}

async function main() {
  await loadDotEnv();
  const url = resolveUrl();
  if (!url) throw new Error("DATABASE_URL is required (postgres://...).");

  const isLocal = isLocalHost(url);
  if (!isLocal) {
    const allow = process.env.SILAYUR_DEMO_ALLOW_REMOTE?.trim() === "1";
    if (!allow) {
      throw new Error(
        "Menolak men-seed data demo ke database non-lokal (" + url + ").\n" +
          "Demo hanya boleh masuk ke database lokal (localhost/127.0.0.1). " +
          "Untuk non-lokal, set SILAYUR_DEMO_ALLOW_REMOTE=1 hanya dengan otorisasi owner.",
      );
    }
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  await client.query(`SELECT COUNT(*) AS c FROM ticket_prices`);
  const defaultPassword =
    process.env.SILAYUR_SEED_DEFAULT_PASSWORD?.trim() || "silayur-demo";
  const passwordHash = await hashPassword(defaultPassword);

  try {
    await client.query("BEGIN");
    for (const price of EXTRA_TICKET_PRICES) {
      await client.query(
        `INSERT INTO ticket_prices
          (id, ticket_product_id, day_type, price, valid_from, valid_until,
           active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
          ON CONFLICT(id) DO NOTHING`,
        [
          price.id,
          price.ticketProductId,
          price.dayType,
          price.price,
          price.validFrom,
          price.validUntil,
          price.active,
        ],
      );
    }

    for (const priceId of ACTIVATE_PRICE_IDS) {
      await client.query(
        `UPDATE ticket_prices SET active = true, updated_at = now()
          WHERE id = $1 AND active = false`,
        [priceId],
      );
    }

    for (const user of EXTRA_USERS) {
      await client.query(
        `INSERT INTO users
          (id, name, username, role_key, active, password_hash, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, now(), now())
          ON CONFLICT(id) DO NOTHING`,
        [
          user.id,
          user.name,
          user.username,
          user.role,
          true,
          passwordHash,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  const counts = {};
  for (const table of ["users", "ticket_products", "ticket_prices"]) {
    const r = await client.query(`SELECT COUNT(*) AS c FROM ${table}`);
    counts[table] = Number(r.rows[0].c);
  }
  const activePrices = await client.query(
    `SELECT ticket_product_id, day_type, price, active
     FROM ticket_prices ORDER BY ticket_product_id, day_type`,
  );
  const usersByRole = await client.query(
    `SELECT role_key, COUNT(*) AS c FROM users GROUP BY role_key ORDER BY role_key`,
  );
  await client.end();

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: "seed-demo-extras",
        counts,
        activePrices: activePrices.rows,
        usersByRole: usersByRole.rows,
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
