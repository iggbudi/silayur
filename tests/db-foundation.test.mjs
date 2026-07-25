import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { cleanupTempDirectory } from "./test-utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testPassword = "LocalTestPassword-2026!";

function runScript(script, env) {
  const result = spawnSync(process.execPath, [path.join(root, script)], {
    cwd: root,
    env,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

test("migrations and seed create a secure, non-destructive foundation", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "silayur-db-"));
  const dbFile = path.join(dir, "test.db");
  const url = `file:${dbFile}`;
  const env = {
    ...process.env,
    TURSO_DATABASE_URL: url,
    TURSO_AUTH_TOKEN: "",
    SILAYUR_SEED_ADMIN_PASSWORD: testPassword,
    SILAYUR_SEED_DEFAULT_PASSWORD: testPassword,
  };

  try {
    assert.match(runScript("scripts/db-migrate.mjs", env), /"ok": true/);
    assert.match(runScript("scripts/db-seed.mjs", env), /"ok": true/);

    const client = createClient({ url });
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    const names = new Set(tables.rows.map((row) => String(row.name)));
    for (const name of [
      "modules",
      "roles",
      "role_permissions",
      "users",
      "config_items",
      "auth_sessions",
      "schema_version",
    ]) {
      assert.ok(names.has(name), `missing table ${name}`);
    }

    const password = await client.execute(
      "SELECT password_hash FROM users WHERE username = 'admin.resepsionis'",
    );
    assert.match(
      String(password.rows[0]?.password_hash),
      /^pbkdf2-sha256\$210000\$/,
    );

    const configCount = await client.execute(
      "SELECT COUNT(*) AS c FROM config_items",
    );
    assert.equal(Number(configCount.rows[0].c), 12);

    await client.execute(
      "UPDATE modules SET active = 0 WHERE key = 'complaints'",
    );
    await client.execute(
      "UPDATE users SET name = 'Nama Operasional' WHERE id = 'admin-resepsionis'",
    );
    client.close();

    runScript("scripts/db-seed.mjs", env);

    const after = createClient({ url });
    const preservedModule = await after.execute(
      "SELECT active FROM modules WHERE key = 'complaints'",
    );
    assert.equal(Number(preservedModule.rows[0].active), 0);
    const preservedUser = await after.execute(
      "SELECT name FROM users WHERE id = 'admin-resepsionis'",
    );
    assert.equal(preservedUser.rows[0].name, "Nama Operasional");
    const versions = await after.execute(
      "SELECT COUNT(*) AS c FROM schema_version WHERE label = 'checkpoint-9-secure-persistence'",
    );
    assert.equal(Number(versions.rows[0].c), 1);
    after.close();
  } finally {
    cleanupTempDirectory(dir);
  }
});
