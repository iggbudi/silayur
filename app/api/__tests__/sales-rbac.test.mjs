import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { cleanupTempDirectory } from "../../../tests/test-utils.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
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

test("sales API enforces authentication and visitors RBAC", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "silayur-sales-rbac-"));
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

    const [loginRoute, configRoute, salesRoute] = await Promise.all([
      import("../auth/login/route.ts"),
      import("../config/route.ts"),
      import("../sales/route.ts"),
    ]);

    const request = (pathname, init = {}) => {
      const incoming = new Request(`http://localhost${pathname}`, init);
      if (pathname === "/api/auth/login") {
        return incoming.method === "POST"
          ? loginRoute.POST(incoming)
          : loginRoute.GET(incoming);
      }
      if (pathname === "/api/config") {
        return incoming.method === "PUT"
          ? configRoute.PUT(incoming)
          : configRoute.GET(incoming);
      }
      if (pathname === "/api/sales") {
        return incoming.method === "POST"
          ? salesRoute.POST(incoming)
          : salesRoute.GET(incoming);
      }
      throw new Error(`Unhandled test path: ${pathname}`);
    };

    const login = async (username) => {
      const response = await request("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password: testPassword }),
      });
      assert.equal(response.status, 200, await response.clone().text());
      return cookieFrom(response);
    };

    // 1. Anonymous requests must be rejected (401) — GET and POST.
    const anonymousGet = await request("/api/sales");
    assert.equal(anonymousGet.status, 401);
    const anonymousPost = await request("/api/sales", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });
    assert.equal(anonymousPost.status, 401);

    // 2. Prepare deterministic pricing: activate the weekend tariff as admin
    //    so a POST succeeds regardless of the day the test runs.
    const adminCookie = await login("admin.resepsionis");
    const adminConfig = await request("/api/config", {
      headers: { cookie: adminCookie },
    });
    assert.equal(adminConfig.status, 200);
    const before = await adminConfig.json();
    const adultWithWeekend = structuredClone(before.ticketProducts).find(
      (product) => product.visitorCategory === "adult",
    );
    const weekendPrice = adultWithWeekend.prices.find(
      (price) => price.dayType === "weekend",
    );
    assert.ok(weekendPrice, "seed must contain an adult weekend price");
    weekendPrice.active = true;
    const activated = await request("/api/config", {
      method: "PUT",
      headers: {
        cookie: adminCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ticketProducts: structuredClone(before.ticketProducts).map((product) =>
          product.visitorCategory === "adult" ? adultWithWeekend : product,
        ),
      }),
    });
    assert.equal(activated.status, 200, await activated.clone().text());

    // 3. A viewer (visitors: none) must be denied — GET and POST.
    const viewerCookie = await login("pimpinan.viewer");
    const viewerGet = await request("/api/sales", {
      headers: { cookie: viewerCookie },
    });
    assert.equal(viewerGet.status, 403, await viewerGet.clone().text());
    const viewerPost = await request("/api/sales", {
      method: "POST",
      headers: {
        cookie: viewerCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        items: [{ ticketProductId: "ticket-adult", quantity: 1 }],
      }),
    });
    assert.equal(viewerPost.status, 403, await viewerPost.clone().text());
    const viewerPostBody = await viewerPost.json();
    assert.match(viewerPostBody.error, /izin/i);

    // 4. A ticket officer (visitors: manage) is allowed to list and sell.
    const officerCookie = await login("siti.tiket");
    const officerGet = await request("/api/sales", {
      headers: { cookie: officerCookie },
    });
    assert.equal(officerGet.status, 200, await officerGet.clone().text());
    const empty = await officerGet.json();
    assert.equal(empty.count, 0);
    assert.ok(Array.isArray(empty.sales));

    const emptyItems = await request("/api/sales", {
      method: "POST",
      headers: {
        cookie: officerCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({ items: [] }),
    });
    assert.equal(emptyItems.status, 400);

    const created = await request("/api/sales", {
      method: "POST",
      headers: {
        cookie: officerCookie,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        items: [{ ticketProductId: "ticket-adult", quantity: 1 }],
        notes: "test rbac officer",
      }),
    });
    assert.equal(created.status, 200, await created.clone().text());
    const sale = await created.json();
    assert.match(sale.receiptNumber, /^RCP-\d{8}-\d{4}$/);
    assert.equal(sale.status, "completed");
    assert.equal(sale.soldByName, "Siti Tiket");
    assert.equal(sale.totalQuantity, 1);
    assert.equal(sale.items.length, 1);
    assert.equal(sale.items[0].productName, "Tiket Masuk Dewasa");
    assert.equal(sale.items[0].visitorCategory, "adult");
    assert.equal(sale.items[0].quantity, 1);
    assert.equal(sale.totalAmount, sale.items[0].subtotal);
    assert.equal(
      sale.totalAmount,
      sale.items[0].unitPrice * sale.items[0].quantity,
    );

    // 5. The sale must be persisted and visible on the next listing.
    const afterSale = await request("/api/sales", {
      headers: { cookie: officerCookie },
    });
    assert.equal(afterSale.status, 200);
    const listed = await afterSale.json();
    assert.equal(listed.count, 1);
    assert.equal(listed.sales.length, 1);
    assert.equal(listed.sales[0].receiptNumber, sale.receiptNumber);
    assert.equal(listed.sales[0].totalAmount, sale.totalAmount);
  } finally {
    cleanupTempDirectory(dir);
  }
});
