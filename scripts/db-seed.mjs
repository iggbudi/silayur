import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
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
  return process.env.TURSO_DATABASE_URL?.trim() || "file:./.data/silayur.db";
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

  const client = createClient({
    url: url.startsWith("file:")
      ? `file:${path.resolve(root, url.slice("file:".length))}`
      : url,
    authToken,
  });
  const adminPassword = process.env.SILAYUR_SEED_ADMIN_PASSWORD?.trim();
  const defaultPassword = process.env.SILAYUR_SEED_DEFAULT_PASSWORD?.trim();

  const tx = await client.transaction("write");
  try {
    for (const item of seedData.modules) {
      await tx.execute({
        sql: `INSERT INTO modules (key, label, description, active, updated_at)
              VALUES (?, ?, ?, ?, datetime('now'))
              ON CONFLICT(key) DO NOTHING`,
        args: [item.key, item.label, item.description, item.active ? 1 : 0],
      });
    }

    for (const role of seedData.roles) {
      await tx.execute({
        sql: `INSERT INTO roles
              (key, label, description, active, system, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
              ON CONFLICT(key) DO NOTHING`,
        args: [
          role.key,
          role.label,
          role.description,
          role.active ? 1 : 0,
          role.system ? 1 : 0,
        ],
      });
    }

    for (const [roleKey, accessMap] of Object.entries(seedData.permissions)) {
      for (const [moduleKey, access] of Object.entries(accessMap)) {
        await tx.execute({
          sql: `INSERT INTO role_permissions
                (role_key, module_key, access, updated_at)
                VALUES (?, ?, ?, datetime('now'))
                ON CONFLICT(role_key, module_key) DO NOTHING`,
          args: [roleKey, moduleKey, access],
        });
      }
    }

    for (const user of seedData.users) {
      const password =
        user.role === "super_admin" ? adminPassword : defaultPassword;
      const passwordHash = password ? await hashPassword(password) : null;
      await tx.execute({
        sql: `INSERT INTO users
              (id, name, username, role_key, active, password_hash, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
              ON CONFLICT(id) DO UPDATE SET
                password_hash = CASE
                  WHEN users.password_hash IS NULL AND excluded.password_hash IS NOT NULL
                  THEN excluded.password_hash
                  ELSE users.password_hash
                END`,
        args: [
          user.id,
          user.name,
          user.username,
          user.role,
          user.active ? 1 : 0,
          passwordHash,
        ],
      });
    }

    for (const product of seedData.ticketProducts) {
      await tx.execute({
        sql: `INSERT INTO ticket_products
              (id, code, name, visitor_category, validity_mode, description, active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
              ON CONFLICT(id) DO NOTHING`,
        args: [
          product.id,
          product.code,
          product.name,
          product.visitorCategory,
          product.validityMode,
          product.description,
          product.active ? 1 : 0,
        ],
      });
    }

    for (const price of seedData.ticketPrices) {
      await tx.execute({
        sql: `INSERT INTO ticket_prices
              (id, ticket_product_id, day_type, price, valid_from, valid_until, active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
              ON CONFLICT(id) DO NOTHING`,
        args: [
          price.id,
          price.ticketProductId,
          price.dayType,
          price.price,
          price.validFrom,
          price.validUntil,
          price.active ? 1 : 0,
        ],
      });
    }

    for (const item of seedData.configItems) {
      await tx.execute({
        sql: `INSERT INTO config_items
              (id, section, name, detail, active, sort_order, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
              ON CONFLICT(id) DO NOTHING`,
        args: [
          item.id,
          item.section,
          item.name,
          item.detail,
          item.active ? 1 : 0,
          item.sortOrder,
        ],
      });
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
      await tx.execute({
        sql: `INSERT INTO schema_version (label, applied_at, notes)
              SELECT ?, datetime('now'), ?
              WHERE NOT EXISTS (
                SELECT 1 FROM schema_version WHERE label = ?
              )`,
        args: [version.label, version.notes, version.label],
      });
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
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
    "auth_sessions",
  ]) {
    const result = await client.execute(`SELECT COUNT(*) AS c FROM ${table}`);
    counts[table] = Number(result.rows[0].c);
  }
  client.close();

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: "seed",
        mode,
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
