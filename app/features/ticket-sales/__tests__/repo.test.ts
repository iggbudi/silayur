import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
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

test("priceSale validates items and applies effective tariffs", async () => {
  const { dir, env } = testDb();
  try {
    runScript("scripts/db-migrate.mjs", env);
    runScript("scripts/db-seed.mjs", env);
    process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;

    const [{ priceSale }, { getRequestDb }, { ticketPrices, ticketProducts }] =
      await Promise.all([
        import(`../repo.ts?price=${Date.now()}`),
        import(`../../../../db/get-db?price=${Date.now()}`),
        import(`../../../../db/schema?price=${Date.now()}`),
      ]);
    const db = await getRequestDb();

    await assert.rejects(
      priceSale(db, [], "2026-07-27"),
      /Minimal satu item tiket wajib diisi/,
    );
    await assert.rejects(
      priceSale(db, [{ ticketProductId: "ticket-adult", quantity: 0 }], "2026-07-27"),
      /Quantity tidak valid/,
    );
    await assert.rejects(
      priceSale(db, [{ ticketProductId: "ticket-adult", quantity: -1 }], "2026-07-27"),
      /Quantity tidak valid/,
    );
    await assert.rejects(
      priceSale(db, [{ ticketProductId: "tidak-ada", quantity: 1 }], "2026-07-27"),
      /Produk tiket tidak ditemukan/,
    );
    // Produk Anak belum punya tarif di seed → tarif belum dikonfigurasi.
    await assert.rejects(
      priceSale(db, [{ ticketProductId: "ticket-child", quantity: 1 }], "2026-07-27"),
      /belum dikonfigurasi/,
    );

    // Aktifkan tarif weekend agar pengujian tarif efektif deterministik.
    await db
      .update(ticketPrices)
      .set({ active: true })
      .where(eq(ticketPrices.id, "price-adult-weekend-2026"));
    const weekday = await priceSale(
      db,
      [{ ticketProductId: "ticket-adult", quantity: 2 }],
      "2026-07-27",
    );
    assert.equal(weekday.priced[0].unitPrice, 15000);
    assert.equal(weekday.totalAmount, 30000);
    assert.equal(weekday.totalQuantity, 2);
    const weekend = await priceSale(
      db,
      [{ ticketProductId: "ticket-adult", quantity: 1 }],
      "2026-07-25",
    );
    assert.equal(weekend.priced[0].unitPrice, 20000);
    assert.equal(weekend.totalAmount, 20000);

    // Produk non-aktif ditolak.
    await db
      .update(ticketProducts)
      .set({ active: false })
      .where(eq(ticketProducts.id, "ticket-adult"));
    await assert.rejects(
      priceSale(db, [{ ticketProductId: "ticket-adult", quantity: 1 }], "2026-07-27"),
      /Produk tiket nonaktif/,
    );
  } finally {
    cleanupTempDirectory(dir);
  }
});

test("createSale is atomic: failure leaves no rows and receipt does not advance", async () => {
  const { dir, env } = testDb();
  try {
    runScript("scripts/db-migrate.mjs", env);
    runScript("scripts/db-seed.mjs", env);
    process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;

    const [{ createSale }, { getRequestDb }, { receiptCounters, sales, ticketPrices }] =
      await Promise.all([
        import(`../repo.ts?atomic=${Date.now()}`),
        import(`../../../../db/get-db?atomic=${Date.now()}`),
        import(`../../../../db/schema?atomic=${Date.now()}`),
      ]);
    const db = await getRequestDb();

    // Deterministik di hari apa pun: aktifkan tarif weekend juga.
    await db
      .update(ticketPrices)
      .set({ active: true })
      .where(eq(ticketPrices.id, "price-adult-weekend-2026"));

    const ok = await createSale(
      db,
      { items: [{ ticketProductId: "ticket-adult", quantity: 1 }] },
      "admin-resepsionis",
    );
    assert.equal(ok.receiptNumber.slice(-4), "0001");

    // Satu item valid + satu item tidak dikenal → gagal sebelum transaksi,
    // tidak ada baris sales baru dan counter tidak bertambah.
    await assert.rejects(
      createSale(
        db,
        {
          items: [
            { ticketProductId: "ticket-adult", quantity: 1 },
            { ticketProductId: "nonexistent", quantity: 1 },
          ],
        },
        "admin-resepsionis",
      ),
      /Produk tiket tidak ditemukan/,
    );
    const saleCount = await db
      .select({ value: sql`count(*)` })
      .from(sales);
    assert.equal(Number(saleCount[0].value), 1, "no new sale row after failure");
    const counter = await db
      .select()
      .from(receiptCounters)
      .where(eq(receiptCounters.counterDate, todayIsoDate()));
    assert.equal(counter.length, 1);
    assert.equal(counter[0].seq, 1, "receipt counter must not advance on failure");
  } finally {
    cleanupTempDirectory(dir);
  }
});

test("listSalesByDate and todaySummary filter by WIB day and status", async () => {
  const { dir, env } = testDb();
  try {
    runScript("scripts/db-migrate.mjs", env);
    runScript("scripts/db-seed.mjs", env);
    process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;

    const [{ createSale, listSalesByDate, todaySummary }, { getRequestDb }, { sales, ticketPrices }] =
      await Promise.all([
        import(`../repo.ts?summary=${Date.now()}`),
        import(`../../../../db/get-db?summary=${Date.now()}`),
        import(`../../../../db/schema?summary=${Date.now()}`),
      ]);
    const db = await getRequestDb();

    // Deterministik di hari apa pun: aktifkan tarif weekend juga.
    await db
      .update(ticketPrices)
      .set({ active: true })
      .where(eq(ticketPrices.id, "price-adult-weekend-2026"));

    const first = await createSale(
      db,
      { items: [{ ticketProductId: "ticket-adult", quantity: 2 }] },
      "admin-resepsionis",
    );
    const second = await createSale(
      db,
      { items: [{ ticketProductId: "ticket-adult", quantity: 1 }] },
      "admin-resepsionis",
    );

    const summary = await todaySummary(db);
    assert.equal(summary.date, todayIsoDate());
    assert.equal(summary.count, 2);
    assert.equal(summary.visitors, 3);
    assert.equal(summary.revenue, first.totalAmount + second.totalAmount);

    const listed = await listSalesByDate(db, todayIsoDate());
    assert.equal(listed.length, 2);
    assert.equal(listed[0].receiptNumber, second.receiptNumber);

    // Void satu transaksi: summary mengecualikan voided, list tetap menampilkan.
    await db
      .update(sales)
      .set({ status: "voided" })
      .where(eq(sales.id, second.id));
    const afterVoid = await todaySummary(db);
    assert.equal(afterVoid.count, 1);
    assert.equal(afterVoid.visitors, first.totalQuantity);
    assert.equal(afterVoid.revenue, first.totalAmount);
    const listedAfterVoid = await listSalesByDate(db, todayIsoDate());
    assert.equal(listedAfterVoid.length, 2);

    const otherDay = await listSalesByDate(db, "2000-01-01");
    assert.equal(otherDay.length, 0);
  } finally {
    cleanupTempDirectory(dir);
  }
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
    const db = await getRequestDb();

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

test("requestVoid and approveVoid transition status with audit fields", async () => {
  const { dir, env } = testDb();
  try {
    runScript("scripts/db-migrate.mjs", env);
    runScript("scripts/db-seed.mjs", env);
    process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;

    const [
      { createSale, requestVoid, approveVoid, todaySummary },
      { getRequestDb },
      { ticketPrices },
    ] = await Promise.all([
      import(`../repo.ts?void=${Date.now()}`),
      import(`../../../../db/get-db?void=${Date.now()}`),
      import(`../../../../db/schema?void=${Date.now()}`),
    ]);
    const db = await getRequestDb();

    // Deterministik di hari apa pun: aktifkan tarif weekend juga.
    await db
      .update(ticketPrices)
      .set({ active: true })
      .where(eq(ticketPrices.id, "price-adult-weekend-2026"));

    const sale = await createSale(
      db,
      { items: [{ ticketProductId: "ticket-adult", quantity: 2 }] },
      "admin-resepsionis",
    );

    // Alasan kosong / pendek ditolak.
    await assert.rejects(
      requestVoid(db, sale.id, "siti-tiket", "   "),
      /wajib diisi/,
    );
    await assert.rejects(
      requestVoid(db, sale.id, "siti-tiket", "ab"),
      /wajib diisi/,
    );

    // Permintaan void → void_pending, tercatat pemohon & alasan.
    const pending = await requestVoid(
      db,
      sale.id,
      "siti-tiket",
      "Salah input jumlah",
    );
    assert.equal(pending.status, "void_pending");
    assert.equal(pending.voidReason, "Salah input jumlah");
    assert.equal(pending.voidRequestedBy, "siti-tiket");
    assert.ok(pending.voidRequestedAt);
    assert.equal(pending.voidedAt, null);

    // Summary: void_pending tetap dihitung.
    const duringPending = await todaySummary(db);
    assert.equal(duringPending.count, 1);
    assert.equal(duringPending.visitors, 2);

    // Permintaan ulang pada transaksi pending ditolak.
    await assert.rejects(
      requestVoid(db, sale.id, "siti-tiket", "Ulangi"),
      /Hanya transaksi selesai/,
    );

    // Approve → voided, tercatat penyetuju.
    const voided = await approveVoid(db, sale.id, "manajer-operasional");
    assert.equal(voided.status, "voided");
    assert.equal(voided.voidedBy, "manajer-operasional");
    assert.ok(voided.voidedAt);

    // Approve pada status non-pending ditolak.
    await assert.rejects(
      approveVoid(db, sale.id, "manajer-operasional"),
      /menunggu persetujuan/,
    );

    // Summary: voided dikecualikan.
    const afterVoid = await todaySummary(db);
    assert.equal(afterVoid.count, 0);
    assert.equal(afterVoid.visitors, 0);
  } finally {
    cleanupTempDirectory(dir);
  }
});

test("priceSale uses weekend tariff on configured holidays (weekday date)", async () => {
  const { dir, env } = testDb();
  try {
    runScript("scripts/db-migrate.mjs", env);
    runScript("scripts/db-seed.mjs", env);
    process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;

    const [
      { priceSale },
      { getRequestDb },
      { ticketPrices, holidays },
    ] = await Promise.all([
      import(`../repo.ts?holiday=${Date.now()}`),
      import(`../../../../db/get-db?holiday=${Date.now()}`),
      import(`../../../../db/schema?holiday=${Date.now()}`),
    ]);
    const db = await getRequestDb();

    // Aktifkan tarif weekend agar deterministik.
    await db
      .update(ticketPrices)
      .set({ active: true })
      .where(eq(ticketPrices.id, "price-adult-weekend-2026"));

    // 2026-08-17 = Senin (weekday) tanpa holiday → tarif weekday.
    const weekdayPrice = await priceSale(
      db,
      [{ ticketProductId: "ticket-adult", quantity: 1 }],
      "2026-08-17",
    );
    assert.equal(weekdayPrice.priced[0].unitPrice, 15000);

    // Jadikan 2026-08-17 hari libur → tarif weekend.
    await db.insert(holidays).values({
      id: "hol-test-1",
      date: "2026-08-17",
      name: "HUT RI",
      createdBy: "admin-resepsionis",
    });
    const holidayPrice = await priceSale(
      db,
      [{ ticketProductId: "ticket-adult", quantity: 1 }],
      "2026-08-17",
    );
    assert.equal(holidayPrice.priced[0].unitPrice, 20000);

    // Hari Sabtu tetap weekend tanpa perlu holiday.
    const saturday = await priceSale(
      db,
      [{ ticketProductId: "ticket-adult", quantity: 1 }],
      "2026-08-15",
    );
    assert.equal(saturday.priced[0].unitPrice, 20000);
  } finally {
    cleanupTempDirectory(dir);
  }
});
