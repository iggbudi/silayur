import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
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
}

function cookieFrom(response) {
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

test("API enforces password sessions, RBAC, atomic updates, and persistence", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "silayur-api-"));
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
    runScript("scripts/db-migrate.mjs", env);
    runScript("scripts/db-seed.mjs", env);
    process.env.TURSO_DATABASE_URL = url;
    delete process.env.TURSO_AUTH_TOKEN;

    const [loginRoute, logoutRoute, configRoute, healthRoute] =
      await Promise.all([
        import("../app/api/auth/login/route.ts"),
        import("../app/api/auth/logout/route.ts"),
        import("../app/api/config/route.ts"),
        import("../app/api/db/health/route.ts"),
      ]);

    const request = (pathname, init = {}) => {
      const incoming = new Request(`http://localhost${pathname}`, init);
      if (pathname === "/api/auth/login") {
        return incoming.method === "POST"
          ? loginRoute.POST(incoming)
          : loginRoute.GET(incoming);
      }
      if (pathname === "/api/auth/logout") {
        return logoutRoute.POST(incoming);
      }
      if (pathname === "/api/config") {
        return incoming.method === "PUT"
          ? configRoute.PUT(incoming)
          : configRoute.GET(incoming);
      }
      if (pathname === "/api/db/health") {
        return healthRoute.GET(incoming);
      }
      throw new Error(`Unhandled test path: ${pathname}`);
    };

    const anonymousConfig = await request("/api/config", {
      headers: { "x-silayur-user-id": "admin-resepsionis" },
    });
    assert.equal(
      anonymousConfig.status,
      401,
      await anonymousConfig.clone().text(),
    );

    const badLogin = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "admin.resepsionis",
        password: "wrong-password",
      }),
    });
    assert.equal(badLogin.status, 401);

    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "admin.resepsionis",
        password: testPassword,
      }),
    });
    assert.equal(adminLogin.status, 200);
    const adminCookie = cookieFrom(adminLogin);
    assert.match(adminCookie, /^silayur_session=/);
    assert.match(adminLogin.headers.get("set-cookie") ?? "", /HttpOnly/i);
    assert.doesNotMatch(await adminLogin.clone().text(), /passwordHash/i);

    const adminConfig = await request("/api/config", {
      headers: { cookie: adminCookie },
    });
    assert.equal(adminConfig.status, 200);
    const before = await adminConfig.json();
    assert.equal(before.checkpoint, "9");
    assert.equal(before.configItems.tickets.length, 2);

    const crossOrigin = await request("/api/config", {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json",
        origin: "https://attacker.example",
      },
      body: JSON.stringify({ modules: before.modules }),
    });
    assert.equal(crossOrigin.status, 403);

    const viewerLogin = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "pimpinan.viewer",
        password: testPassword,
      }),
    });
    assert.equal(viewerLogin.status, 200);
    const viewerCookie = cookieFrom(viewerLogin);
    const viewerConfig = await request("/api/config", {
      headers: { cookie: viewerCookie },
    });
    assert.equal(viewerConfig.status, 403);

    const invalidPatch = await request("/api/config", {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        modules: { ...before.modules, finance: !before.modules.finance },
        users: [],
      }),
    });
    assert.equal(invalidPatch.status, 400);
    const afterRollback = await request("/api/config", {
      headers: { cookie: adminCookie },
    });
    assert.equal(
      (await afterRollback.json()).modules.finance,
      before.modules.finance,
      "module change must roll back when another patch member fails",
    );

    const nextConfigItems = structuredClone(before.configItems);
    nextConfigItems.tickets[0].name = "Tiket reguler tersimpan";
    const persisted = await request("/api/config", {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({ configItems: nextConfigItems }),
    });
    assert.equal(persisted.status, 200);
    assert.equal(
      (await persisted.json()).configItems.tickets[0].name,
      "Tiket reguler tersimpan",
    );

    const health = await request("/api/db/health", {
      headers: { cookie: adminCookie },
    });
    assert.equal(health.status, 200);
    assert.equal((await health.json()).counts.config_items, 12);

    const logout = await request("/api/auth/logout", {
      method: "POST",
      headers: { cookie: adminCookie },
    });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/i);
    const ended = await request("/api/auth/login", {
      headers: { cookie: adminCookie },
    });
    assert.equal(ended.status, 401);
  } finally {
    cleanupTempDirectory(dir);
  }
});
