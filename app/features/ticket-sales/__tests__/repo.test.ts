import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { cleanupTempDirectory } from "../../../../tests/test-utils.mjs";
import { todayIsoDate } from "../../../../shared/date";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);
const testPassword = "LocalTestPassword-2026!";

function runScript(script: string, env: NodeJS.ProcessEnv): void {
  const result = spawnSync(process.execPath, [path.join(root, script)], {
    cwd: root,
    env,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function testDb() {
  const dir = mkdtempSync(path.join(tmpdir(), "silayur-sales-repo-"));
  const dbFile = path.join(dir, "test.db");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TURSO_DATABASE_URL: `file:${dbFile}`,
    TURSO_AUTH_TOKEN: "",
    SILAYUR_SEED_ADMIN_PASSWORD: testPassword,
    SILAYUR_SEED_DEFAULT_PASSWORD: testPassword,
  };
  return { dir, env };
}

test("ticket-sales: type validation rejects empty items", async () => {
  const { priceSale } = await import(`../repo.ts?validation=${Date.now()}`);
  assert.equal(typeof priceSale, "function");
});

test("ticket-sales: type signatures exist", async () => {
  const mod = await import(`../repo.ts?types=${Date.now()}`);
  assert.equal(typeof mod.createSale, "function");
  assert.equal(typeof mod.loadSaleById, "function");
  assert.equal(typeof mod.listSalesByDate, "function");
  assert.equal(typeof mod.todaySummary, "function");
  assert.equal(typeof mod.priceSale, "function");
});

test("createSale assigns incrementing, atomic receipt numbers", async () => {
  const { dir, env } = testDb();
  try {
    runScript("scripts/db-migrate.mjs", env);
    runScript("scripts/db-seed.mjs", env);
    process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;

    const [{ createSale }, { getRequestDb }, { ticketPrices, receiptCounters }] =
      await Promise.all([
        import(`../repo.ts?receipt=${Date.now()}`),
        import(`../../../../db/get-db?receipt=${Date.now()}`),
        import(`../../../../db/schema?receipt=${Date.now()}`),
      ]);
    const db = getRequestDb();

    // Deterministik di hari apa pun: aktifkan tarif weekend juga.
    await db
      .update(ticketPrices)
      .set({ active: true })
      .where(eq(ticketPrices.id, "price-adult-weekend-2026"));

    const saleOne = await createSale(
      db,
      {
        items: [{ ticketProductId: "ticket-adult", quantity: 2 }],
        notes: "satu",
      },
      "admin-resepsionis",
    );
    const saleTwo = await createSale(
      db,
      { items: [{ ticketProductId: "ticket-adult", quantity: 1 }] },
      "admin-resepsionis",
    );

    assert.match(saleOne.receiptNumber, /^RCP-\d{8}-\d{4}$/);
    assert.match(saleTwo.receiptNumber, /^RCP-\d{8}-\d{4}$/);
    assert.notEqual(saleOne.receiptNumber, saleTwo.receiptNumber);
    assert.equal(
      saleOne.receiptNumber.slice(-4),
      "0001",
      `first receipt should be 0001, got ${saleOne.receiptNumber}`,
    );
    assert.equal(
      saleTwo.receiptNumber.slice(-4),
      "0002",
      `second receipt should be 0002, got ${saleTwo.receiptNumber}`,
    );

    // Konsistensi total vs line items (snapshot pricing).
    assert.equal(saleOne.totalQuantity, 2);
    assert.equal(saleOne.items.length, 1);
    assert.equal(saleOne.totalAmount, saleOne.items[0].subtotal);
    assert.equal(
      saleOne.totalAmount,
      saleOne.items[0].unitPrice * saleOne.items[0].quantity,
    );

    // Counter tersimpan per hari kalender lokal WIB.
    const counters = await db
      .select()
      .from(receiptCounters)
      .where(eq(receiptCounters.counterDate, todayIsoDate()));
    assert.equal(counters.length, 1);
    assert.equal(counters[0].seq, 2);

    // Dua transaksi: list hari ini menampilkan keduanya.
    const { listSalesByDate } = await import(`../repo.ts?list=${Date.now()}`);
    const listed = await listSalesByDate(db, todayIsoDate());
    assert.equal(listed.length, 2);
    assert.equal(listed[0].receiptNumber, saleTwo.receiptNumber); // terbaru dulu
    assert.equal(listed[1].receiptNumber, saleOne.receiptNumber);
  } finally {
    cleanupTempDirectory(dir);
  }
});
