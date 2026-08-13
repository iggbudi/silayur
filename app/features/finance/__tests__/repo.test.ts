import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { cleanupTempDirectory } from "../../../../tests/test-utils.mjs";

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
  const dir = mkdtempSync(path.join(tmpdir(), "silayur-finance-repo-"));
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

test("finance: revenue entries and todayRevenueSummary", async () => {
  const { dir, env } = testDb();
  try {
    runScript("scripts/db-migrate.mjs", env);
    runScript("scripts/db-seed.mjs", env);
    process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;

    const [
      { createRevenueEntry, todayRevenueSummary },
      { createSale },
      { getRequestDb },
      { ticketPrices },
    ] = await Promise.all([
      import(`../repo.ts?rev=${Date.now()}`),
      import(`../../ticket-sales/repo.ts?rev=${Date.now()}`),
      import(`../../../../db/get-db?rev=${Date.now()}`),
      import(`../../../../db/schema?rev=${Date.now()}`),
    ]);
    const db = getRequestDb();

    // Deterministik: aktifkan tarif weekend agar sale bisa dibuat.
    await db
      .update(ticketPrices)
      .set({ active: true })
      .where(eq(ticketPrices.id, "price-adult-weekend-2026"));

    // Validasi nominal & sumber.
    await assert.rejects(
      createRevenueEntry(
        db,
        { sourceKey: "revenue-parking", sourceName: "Parkir", amount: 0 },
        "admin-resepsionis",
      ),
      /tidak valid/,
    );
    await assert.rejects(
      createRevenueEntry(
        db,
        { sourceKey: "x", sourceName: "   ", amount: 1000 },
        "admin-resepsionis",
      ),
      /wajib diisi/,
    );

    await createRevenueEntry(
      db,
      { sourceKey: "revenue-parking", sourceName: "Parkir", amount: 25000 },
      "admin-resepsionis",
    );

    const sale = await createSale(
      db,
      { items: [{ ticketProductId: "ticket-adult", quantity: 1 }] },
      "admin-resepsionis",
    );

    const summary = await todayRevenueSummary(db);
    assert.equal(summary.ticketRevenue, sale.totalAmount);
    assert.equal(summary.otherRevenue, 25000);
    assert.equal(summary.totalRevenue, sale.totalAmount + 25000);
  } finally {
    cleanupTempDirectory(dir);
  }
});

test("finance: expenses approval and cash session reconciliation", async () => {
  const { dir, env } = testDb();
  try {
    runScript("scripts/db-migrate.mjs", env);
    runScript("scripts/db-seed.mjs", env);
    process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;

    const [
      {
        approveExpense,
        closeCashSession,
        createExpense,
        createRevenueEntry,
        openCashSession,
      },
      { createSale },
      { getRequestDb },
      { ticketPrices },
    ] = await Promise.all([
      import(`../repo.ts?cash=${Date.now()}`),
      import(`../../ticket-sales/repo.ts?cash=${Date.now()}`),
      import(`../../../../db/get-db?cash=${Date.now()}`),
      import(`../../../../db/schema?cash=${Date.now()}`),
    ]);
    const db = getRequestDb();

    await db
      .update(ticketPrices)
      .set({ active: true })
      .where(eq(ticketPrices.id, "price-adult-weekend-2026"));

    // Buka shift.
    const opened = await openCashSession(db, "admin-resepsionis");
    assert.equal(opened.status, "open");
    await assert.rejects(
      openCashSession(db, "admin-resepsionis"),
      /sudah aktif/,
    );

    // Transaksi selama shift.
    const sale = await createSale(
      db,
      { items: [{ ticketProductId: "ticket-adult", quantity: 1 }] },
      "admin-resepsionis",
    );
    await createRevenueEntry(
      db,
      { sourceKey: "revenue-parking", sourceName: "Parkir", amount: 25000 },
      "admin-resepsionis",
    );
    const expense = await createExpense(
      db,
      { description: "Beli perlengkapan", amount: 5000 },
      "admin-resepsionis",
    );
    assert.equal(expense.status, "pending");
    const approved = await approveExpense(
      db,
      expense.id,
      "manajer-operasional",
    );
    assert.equal(approved.status, "approved");
    await assert.rejects(
      approveExpense(db, expense.id, "manajer-operasional"),
      /pending/,
    );

    // Tutup shift: systemCash = tiket + non-tiket - pengeluaran.
    const closed = await closeCashSession(db, opened.id, "admin-resepsionis", 0);
    assert.equal(closed.status, "closed");
    assert.equal(closed.systemCash, sale.totalAmount + 25000 - 5000);
    assert.equal(closed.difference, 0 - closed.systemCash!);
  } finally {
    cleanupTempDirectory(dir);
  }
});
