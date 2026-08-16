import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  connectTestDb,
  loadDotEnv,
  truncateAllTables,
} from "../../tests/test-utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const testPassword = "LocalTestPassword-2026!";

function runScript(script, env, args = []) {
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], {
    cwd: root,
    env,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

test("migrations and seed create a secure, non-destructive foundation", async () => {
  loadDotEnv();
  const env = {
    ...process.env,
    DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    SILAYUR_SEED_ADMIN_PASSWORD: testPassword,
    SILAYUR_SEED_DEFAULT_PASSWORD: testPassword,
  };
  const client = await connectTestDb();

  try {
    assert.match(runScript("scripts/db-migrate.mjs", env), /"ok": true/);
    assert.match(runScript("scripts/db-seed.mjs", env), /"ok": true/);

    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    const names = new Set(tables.rows.map((row) => String(row.table_name)));
    for (const name of [
      "modules",
      "roles",
      "role_permissions",
      "users",
      "ticket_products",
      "ticket_prices",
      "config_items",
      "auth_sessions",
      "schema_version",
    ]) {
      assert.ok(names.has(name), `missing table ${name}`);
    }

    const password = await client.query(
      "SELECT password_hash FROM users WHERE username = 'admin.resepsionis'",
    );
    assert.match(
      String(password.rows[0]?.password_hash),
      /^pbkdf2-sha256\$100000\$/,
    );

    const configCount = await client.query(
      "SELECT COUNT(*) AS c FROM config_items",
    );
    assert.equal(Number(configCount.rows[0].c), 14);

    const ticketProducts = await client.query(
      "SELECT code, visitor_category, validity_mode FROM ticket_products ORDER BY visitor_category",
    );
    assert.equal(ticketProducts.rows.length, 2);
    assert.deepEqual(
      ticketProducts.rows.map((row) => String(row.visitor_category)),
      ["adult", "child"],
    );
    const ticketPrices = await client.query(
      "SELECT day_type, price FROM ticket_prices ORDER BY day_type",
    );
    assert.equal(ticketPrices.rows.length, 2);
    assert.equal(Number(ticketPrices.rows[0].price), 15000);

    await client.query(
      `INSERT INTO auth_sessions
        (token_hash, user_id, created_at, expires_at, last_seen_at)
        VALUES ($1, $2, now(), now() + interval '1 hour', now())`,
      ["test-session", "admin-resepsionis"],
    );
    const resetPassword = "ResetPassword-2026!";
    assert.match(
      runScript(
        "scripts/auth-set-password.mjs",
        { ...env, SILAYUR_NEW_PASSWORD: resetPassword },
        ["admin.resepsionis"],
      ),
      /"sessionsRevoked": true/,
    );
    const afterReset = await client.query(
      "SELECT password_hash FROM users WHERE username = 'admin.resepsionis'",
    );
    assert.notEqual(
      afterReset.rows[0]?.password_hash,
      password.rows[0]?.password_hash,
    );
    const sessionsAfterReset = await client.query(
      "SELECT COUNT(*) AS c FROM auth_sessions WHERE user_id = 'admin-resepsionis'",
    );
    assert.equal(Number(sessionsAfterReset.rows[0].c), 0);

    await client.query(
      "UPDATE modules SET active = false WHERE key = 'complaints'",
    );
    await client.query(
      "UPDATE users SET name = 'Nama Operasional' WHERE id = 'admin-resepsionis'",
    );

    runScript("scripts/db-seed.mjs", env);

    const preservedModule = await client.query(
      "SELECT active FROM modules WHERE key = 'complaints'",
    );
    assert.equal(preservedModule.rows[0].active, false);
    const preservedUser = await client.query(
      "SELECT name FROM users WHERE id = 'admin-resepsionis'",
    );
    assert.equal(preservedUser.rows[0].name, "Nama Operasional");
    const versions = await client.query(
      "SELECT COUNT(*) AS c FROM schema_version WHERE label IN ('checkpoint-9-secure-persistence', 'checkpoint-11-ticket-master')",
    );
    assert.equal(Number(versions.rows[0].c), 2);

    await truncateAllTables(client);
  } finally {
    await client.end();
  }
});
