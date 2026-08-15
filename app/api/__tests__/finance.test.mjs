import assert from "node:assert/strict";
import test from "node:test";
import { prepareTestEnv, resetTestDb } from "../../../tests/test-utils.mjs";

const testPassword = "LocalTestPassword-2026!";

function cookieFrom(response) {
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

test("finance API enforces RBAC and records revenue and cash session", async () => {
  await resetTestDb();
  prepareTestEnv();

  const [loginRoute, revenueRoute, summaryRoute, sessionRoute, openRoute, closeRoute] =
    await Promise.all([
      import("../auth/login/route.ts"),
      import("../revenue/route.ts"),
      import("../finance/summary/route.ts"),
      import("../cash-session/route.ts"),
      import("../cash-session/open/route.ts"),
      import("../cash-session/close/route.ts"),
    ]);

  const request = (pathname, init = {}) => {
    const incoming = new Request(`http://localhost${pathname}`, init);
    if (pathname === "/api/auth/login") {
      return incoming.method === "POST"
        ? loginRoute.POST(incoming)
        : loginRoute.GET(incoming);
    }
    if (pathname === "/api/revenue") {
      return incoming.method === "POST"
        ? revenueRoute.POST(incoming)
        : revenueRoute.GET(incoming);
    }
    if (pathname === "/api/finance/summary") return summaryRoute.GET(incoming);
    if (pathname === "/api/cash-session") return sessionRoute.GET(incoming);
    if (pathname === "/api/cash-session/open") return openRoute.POST(incoming);
    if (pathname === "/api/cash-session/close") {
      return closeRoute.POST(incoming);
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

  // Anonymous → 401.
  const anon = await request("/api/revenue");
  assert.equal(anon.status, 401);

  // Viewer (finance: none) → 403.
  const viewerCookie = await login("pimpinan.viewer");
  const viewer = await request("/api/revenue", {
    headers: { cookie: viewerCookie },
  });
  assert.equal(viewer.status, 403);

  // Manajer (finance: manage) boleh mencatat pemasukan.
  const managerCookie = await login("manajer.operasional");
  const created = await request("/api/revenue", {
    method: "POST",
    headers: { cookie: managerCookie, "content-type": "application/json" },
    body: JSON.stringify({
      sourceKey: "revenue-parking",
      sourceName: "Parkir",
      amount: 15000,
    }),
  });
  assert.equal(created.status, 200, await created.clone().text());
  const entry = await created.json();
  assert.equal(entry.sourceName, "Parkir");
  assert.equal(entry.amount, 15000);

  // Ringkasan mencerminkan pemasukan non-tiket.
  const summary = await request("/api/finance/summary", {
    headers: { cookie: managerCookie },
  });
  assert.equal(summary.status, 200);
  const summaryBody = await summary.json();
  assert.equal(summaryBody.otherRevenue, 15000);
  assert.equal(summaryBody.totalRevenue, 15000);

  // Buka & tutup shift kas.
  const opened = await request("/api/cash-session/open", {
    method: "POST",
    headers: { cookie: managerCookie },
  });
  assert.equal(opened.status, 200, await opened.clone().text());
  const openedBody = await opened.json();
  assert.equal(openedBody.status, "open");

  const closed = await request("/api/cash-session/close", {
    method: "POST",
    headers: { cookie: managerCookie, "content-type": "application/json" },
    body: JSON.stringify({ declaredCash: 15000 }),
  });
  assert.equal(closed.status, 200, await closed.clone().text());
  const closedBody = await closed.json();
  assert.equal(closedBody.status, "closed");
});
