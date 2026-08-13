import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
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

test("void flow: officer requests, manager approves with password", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "silayur-sales-void-"));
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

    const [
      loginRoute,
      salesRoute,
      voidRoute,
      approveRoute,
      { createSale },
      { getRequestDb },
      { ticketPrices },
    ] = await Promise.all([
      import("../auth/login/route.ts"),
      import("../sales/route.ts"),
      import("../sales/void/route.ts"),
      import("../sales/void/approve/route.ts"),
      import("../../features/ticket-sales/repo.ts"),
      import("../../../db/get-db"),
      import("../../../db/schema"),
    ]);
    const db = getRequestDb();

    // Deterministik: aktifkan tarif weekend agar sale bisa dibuat kapan pun.
    await db
      .update(ticketPrices)
      .set({ active: true })
      .where(eq(ticketPrices.id, "price-adult-weekend-2026"));

    const request = (pathname, init = {}) => {
      const incoming = new Request(`http://localhost${pathname}`, init);
      if (pathname === "/api/auth/login") {
        return incoming.method === "POST"
          ? loginRoute.POST(incoming)
          : loginRoute.GET(incoming);
      }
      if (pathname === "/api/sales") {
        return incoming.method === "POST"
          ? salesRoute.POST(incoming)
          : salesRoute.GET(incoming);
      }
      if (pathname === "/api/sales/void") return voidRoute.POST(incoming);
      if (pathname === "/api/sales/void/approve") {
        return approveRoute.POST(incoming);
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

    const officerCookie = await login("siti.tiket");
    const managerCookie = await login("manajer.operasional");

    // Anonymous → 401.
    const anon = await request("/api/sales/void", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ saleId: "x", reason: "test" }),
    });
    assert.equal(anon.status, 401);

    // Petugas membuat transaksi (lewat repo agar deterministik).
    const sale = await createSale(
      db,
      { items: [{ ticketProductId: "ticket-adult", quantity: 1 }] },
      "siti-tiket",
    );

    // Petugas mengajukan pembatalan → void_pending.
    const reqVoid = await request("/api/sales/void", {
      method: "POST",
      headers: { cookie: officerCookie, "content-type": "application/json" },
      body: JSON.stringify({ saleId: sale.id, reason: "Salah input" }),
    });
    assert.equal(reqVoid.status, 200, await reqVoid.clone().text());
    const pending = await reqVoid.json();
    assert.equal(pending.status, "void_pending");

    // Petugas (bukan role penyetuju) tidak boleh menyetujui → 403.
    const officerApprove = await request("/api/sales/void/approve", {
      method: "POST",
      headers: { cookie: officerCookie, "content-type": "application/json" },
      body: JSON.stringify({ saleId: sale.id, password: testPassword }),
    });
    assert.equal(officerApprove.status, 403);

    // Manajer password salah → 401.
    const wrongPass = await request("/api/sales/void/approve", {
      method: "POST",
      headers: { cookie: managerCookie, "content-type": "application/json" },
      body: JSON.stringify({ saleId: sale.id, password: "salah-password" }),
    });
    assert.equal(wrongPass.status, 401);

    // Manajer password benar → voided.
    const approved = await request("/api/sales/void/approve", {
      method: "POST",
      headers: { cookie: managerCookie, "content-type": "application/json" },
      body: JSON.stringify({ saleId: sale.id, password: testPassword }),
    });
    assert.equal(approved.status, 200, await approved.clone().text());
    const voided = await approved.json();
    assert.equal(voided.status, "voided");
    assert.equal(voided.voidedBy, "manajer-operasional");

    // Ringkasan mengecualikan voided, tapi riwayat tetap menampilkan.
    const after = await request("/api/sales", {
      headers: { cookie: officerCookie },
    });
    const listed = await after.json();
    assert.equal(listed.count, 0);
    assert.equal(listed.sales.length, 1);
    assert.equal(listed.sales[0].status, "voided");
  } finally {
    cleanupTempDirectory(dir);
  }
});
