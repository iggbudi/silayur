import assert from "node:assert/strict";
import test from "node:test";
import { prepareTestEnv, resetTestDb } from "../../../tests/test-utils.mjs";

const testPassword = "LocalTestPassword-2026!";

function cookieFrom(response) {
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

test("API enforces password sessions, RBAC, atomic updates, and persistence", async () => {
  await resetTestDb();
  prepareTestEnv();

  const [loginRoute, logoutRoute, configRoute, healthRoute] =
    await Promise.all([
      import("../auth/login/route.ts"),
      import("../auth/logout/route.ts"),
      import("../config/route.ts"),
      import("../db/health/route.ts"),
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
    headers: { "x-digitama-user-id": "admin-resepsionis" },
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
  assert.match(adminCookie, /^digitama_session=/);
  assert.match(adminLogin.headers.get("set-cookie") ?? "", /HttpOnly/i);
  assert.doesNotMatch(await adminLogin.clone().text(), /passwordHash/i);

  const adminConfig = await request("/api/config", {
    headers: { cookie: adminCookie },
  });
  assert.equal(adminConfig.status, 200);
  const before = await adminConfig.json();
  assert.equal(before.checkpoint, "11");
  assert.equal(before.configItems.tickets.length, 0);
  assert.equal(before.ticketProducts.length, 2);
  assert.deepEqual(
    before.ticketProducts.map((product) => product.visitorCategory).sort(),
    ["adult", "child"],
  );

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

  const overlapping = structuredClone(before.ticketProducts);
  const adultForOverlap = overlapping.find(
    (product) => product.visitorCategory === "adult",
  );
  adultForOverlap.prices.push({
    ...adultForOverlap.prices.find((price) => price.dayType === "weekday"),
    id: "overlapping-weekday-price",
    price: 18000,
  });
  const rejectedOverlap = await request("/api/config", {
    method: "PUT",
    headers: {
      cookie: adminCookie,
      "content-type": "application/json",
    },
    body: JSON.stringify({ ticketProducts: overlapping }),
  });
  assert.equal(rejectedOverlap.status, 400);

  const nextTicketProducts = structuredClone(before.ticketProducts);
  const adult = nextTicketProducts.find(
    (product) => product.visitorCategory === "adult",
  );
  adult.name = "Tiket Dewasa Tersimpan";
  adult.prices.find((price) => price.dayType === "weekday").price = 17500;
  const persisted = await request("/api/config", {
    method: "PUT",
    headers: {
      cookie: adminCookie,
      "content-type": "application/json",
    },
    body: JSON.stringify({ ticketProducts: nextTicketProducts }),
  });
  assert.equal(persisted.status, 200);
  const persistedBody = await persisted.json();
  assert.equal(
    persistedBody.ticketProducts.find(
      (product) => product.visitorCategory === "adult",
    ).name,
    "Tiket Dewasa Tersimpan",
  );
  assert.equal(
    persistedBody.ticketProducts
      .find((product) => product.visitorCategory === "adult")
      .prices.find((price) => price.dayType === "weekday").price,
    17500,
  );

  const health = await request("/api/db/health", {
    headers: { cookie: adminCookie },
  });
  assert.equal(health.status, 200);
  const healthBody = await health.json();
  assert.equal(healthBody.checkpoint, "11");
  assert.equal(healthBody.counts.config_items, 19);
  assert.equal(healthBody.counts.ticket_products, 2);
  assert.equal(healthBody.counts.ticket_prices, 2);

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
});
