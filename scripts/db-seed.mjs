import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import seedData from "../db/seed-data.json" with { type: "json" };
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
  const adminPassword = process.env.SILAYUR_SEED_ADMIN_PASSWORD?.trim();
  const defaultPassword = process.env.SILAYUR_SEED_DEFAULT_PASSWORD?.trim();

  try {
    await client.query("BEGIN");

    for (const item of seedData.modules) {
      await client.query(
        `INSERT INTO modules (key, label, description, active, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT(key) DO NOTHING`,
        [item.key, item.label, item.description, item.active],
      );
    }

    for (const role of seedData.roles) {
      await client.query(
        `INSERT INTO roles
         (key, label, description, active, system, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, now(), now())
         ON CONFLICT(key) DO NOTHING`,
        [
          role.key,
          role.label,
          role.description,
          role.active,
          role.system,
        ],
      );
    }

    for (const [roleKey, accessMap] of Object.entries(seedData.permissions)) {
      for (const [moduleKey, access] of Object.entries(accessMap)) {
        await client.query(
          `INSERT INTO role_permissions
           (role_key, module_key, access, updated_at)
           VALUES ($1, $2, $3, now())
           ON CONFLICT(role_key, module_key) DO NOTHING`,
          [roleKey, moduleKey, access],
        );
      }
    }

    for (const user of seedData.users) {
      const password =
        user.role === "super_admin" ? adminPassword : defaultPassword;
      const passwordHash = password ? await hashPassword(password) : null;
      await client.query(
        `INSERT INTO users
         (id, name, username, role_key, active, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now(), now())
         ON CONFLICT(id) DO UPDATE SET
           password_hash = CASE
             WHEN users.password_hash IS NULL AND EXCLUDED.password_hash IS NOT NULL
             THEN EXCLUDED.password_hash
             ELSE users.password_hash
           END`,
        [
          user.id,
          user.name,
          user.username,
          user.role,
          user.active,
          passwordHash,
        ],
      );
    }

    for (const product of seedData.ticketProducts) {
      await client.query(
        `INSERT INTO ticket_products
         (id, code, name, visitor_category, validity_mode, description, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
         ON CONFLICT(id) DO NOTHING`,
        [
          product.id,
          product.code,
          product.name,
          product.visitorCategory,
          product.validityMode,
          product.description,
          product.active,
        ],
      );
    }

    for (const price of seedData.ticketPrices) {
      await client.query(
        `INSERT INTO ticket_prices
         (id, ticket_product_id, day_type, price, valid_from, valid_until, active, created_at, updated_at)
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

    for (const item of seedData.configItems) {
      await client.query(
        `INSERT INTO config_items
         (id, section, name, detail, active, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now(), now())
         ON CONFLICT(id) DO NOTHING`,
        [
          item.id,
          item.section,
          item.name,
          item.detail,
          item.active,
          item.sortOrder,
        ],
      );
    }

    for (const emp of seedData.employees || []) {
      await client.query(
        `INSERT INTO employees
         (id, name, position, area, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, now(), now())
         ON CONFLICT(id) DO NOTHING`,
        [emp.id, emp.name, emp.position, emp.area || null, emp.active],
      );
    }

    for (const version of [
      {
        label: "checkpoint-9-secure-persistence",
        notes: "Secure sessions and persisted operational configuration.",
      },
      {
        label: "checkpoint-11-ticket-master",
        notes: "Structured admission ticket products and effective tariffs.",
      },
    ]) {
      await client.query(
        `INSERT INTO schema_version (label, applied_at, notes)
         SELECT $1, now(), $2
         WHERE NOT EXISTS (
           SELECT 1 FROM schema_version WHERE label = $1
         )`,
        [version.label, version.notes],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  const counts = {};
  for (const table of [
    "modules",
    "roles",
    "role_permissions",
    "users",
    "ticket_products",
    "ticket_prices",
    "config_items",
    "employees",
    "auth_sessions",
  ]) {
    const result = await client.query(`SELECT COUNT(*) AS c FROM ${table}`);
    counts[table] = Number(result.rows[0].c);
  }
  await client.end();

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: "seed",
        counts,
        adminPasswordConfigured: Boolean(adminPassword),
        defaultPasswordConfigured: Boolean(defaultPassword),
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
