import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { prepareTestEnv, resetTestDb } from "../../../../tests/test-utils.mjs";

async function freshDb() {
  await resetTestDb();
  prepareTestEnv();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [{ rangeReport }, { getRequestDb }] = await Promise.all([
    import(`../repo.ts?v=${stamp}`),
    import(`../../../../db/get-db?v=${stamp}`),
  ]);
  const db = await getRequestDb();
  return { db, rangeReport };
}

test("reports: empty range returns zeroed report", async () => {
  const { db, rangeReport } = await freshDb();
  const report = await rangeReport(db, "2000-01-01", "2000-01-03");
  assert.equal(report.days, 3);
  assert.deepEqual(report.sales, {
    count: 0,
    visitors: 0,
    revenue: 0,
    voidedCount: 0,
    voidedAmount: 0,
  });
  assert.equal(report.revenue.amount, 0);
  assert.equal(report.expenses.approvedAmount, 0);
  assert.equal(report.sessions.length, 0);
  assert.equal(report.cashTotals.systemCash, 0);
  assert.equal(report.daily.length, 3);
  assert.ok(
    report.daily.every(
      (day: { netCash: number }) => day.netCash === 0,
    ),
  );
});

test("reports: aggregates sales, revenue, expenses, and sessions per day", async () => {
  const { db, rangeReport } = await freshDb();
  const schema = await import(`../../../../db/schema?v=s${Date.now()}`);

  // Aktifkan tarif weekend agar createSale deterministik di hari apa pun.
  await db
    .update(schema.ticketPrices)
    .set({ active: true })
    .where(eq(schema.ticketPrices.id, "price-adult-weekend-2026"));

  const createSale = (
    await import(`../../../../app/features/ticket-sales/repo?v=sale${Date.now()}`)
  ).createSale as (
    db: unknown,
    input: { items: { ticketProductId: string; quantity: number }[] },
    actorId: string,
  ) => Promise<{ id: string; totalAmount: number }>;

  // Dua penjualan: satu 25 Juli WIB (sold_at 24 Juli 20:00 UTC), satu 26 Juli.
  const saleOne = await createSale(
    db,
    { items: [{ ticketProductId: "ticket-adult", quantity: 2 }] },
    "admin-resepsionis",
  );
  await db
    .update(schema.sales)
    .set({ soldAt: "2026-07-24T20:00:00.000Z" }) // 25 Juli 03:00 WIB
    .where(eq(schema.sales.id, saleOne.id));
  const saleTwo = await createSale(
    db,
    { items: [{ ticketProductId: "ticket-adult", quantity: 1 }] },
    "siti-tiket",
  );
  await db
    .update(schema.sales)
    .set({ soldAt: "2026-07-26T02:00:00.000Z" }) // 26 Juli 09:00 WIB
    .where(eq(schema.sales.id, saleTwo.id));

  // Pemasukan non-tiket 25 & 26 Juli.
  await db.insert(schema.revenueEntries).values([
    {
      id: "rev-1",
      sourceKey: "revenue-parking",
      sourceName: "Parkir",
      amount: 25000,
      note: "",
      entryDate: "2026-07-25",
      recordedBy: "siti-tiket",
      recordedAt: "2026-07-25T02:00:00.000Z",
    },
    {
      id: "rev-2",
      sourceKey: "revenue-tenant",
      sourceName: "Tenant",
      amount: 50000,
      note: "",
      entryDate: "2026-07-26",
      recordedBy: "siti-tiket",
      recordedAt: "2026-07-26T02:00:00.000Z",
    },
  ]);

  // Pengeluaran: 1 approved (25 Juli), 1 pending (26 Juli).
  await db.insert(schema.expenses).values([
    {
      id: "exp-1",
      description: "Listrik",
      amount: 10000,
      note: "",
      entryDate: "2026-07-25",
      recordedBy: "siti-tiket",
      recordedAt: "2026-07-25T03:00:00.000Z",
      status: "approved",
      approvedBy: "manajer-operasional",
      approvedAt: "2026-07-25T04:00:00.000Z",
    },
    {
      id: "exp-2",
      description: "Snack rapat",
      amount: 15000,
      note: "",
      entryDate: "2026-07-26",
      recordedBy: "siti-tiket",
      recordedAt: "2026-07-26T03:00:00.000Z",
      status: "pending",
      approvedBy: null,
      approvedAt: null,
    },
  ]);

  // Sesi kas: 1 closed (25 Juli), 1 open (26 Juli).
  await db.insert(schema.cashSessions).values([
    {
      id: "cash-1",
      openedBy: "siti-tiket",
      openedAt: "2026-07-24T17:00:00.000Z",
      closedBy: "siti-tiket",
      closedAt: "2026-07-25T10:00:00.000Z",
      declaredCash: 60000,
      systemCash: 55000,
      difference: 5000,
      status: "closed",
    },
    {
      id: "cash-2",
      openedBy: "siti-tiket",
      openedAt: "2026-07-25T17:00:00.000Z",
      closedBy: null,
      closedAt: null,
      declaredCash: null,
      systemCash: null,
      difference: null,
      status: "open",
    },
  ]);

  const report = await rangeReport(db, "2026-07-25", "2026-07-26");
  assert.equal(report.days, 2);

  // Sales: keduanya dihitung (bukan voided).
  assert.equal(report.sales.count, 2);
  assert.equal(report.sales.visitors, 3);
  assert.equal(report.sales.revenue, saleOne.totalAmount + saleTwo.totalAmount);
  assert.equal(report.sales.voidedCount, 0);

  // Revenue: 2 entri, 75.000.
  assert.equal(report.revenue.count, 2);
  assert.equal(report.revenue.amount, 75000);

  // Expenses: 1 approved (10.000), 1 pending.
  assert.equal(report.expenses.count, 2);
  assert.equal(report.expenses.approvedCount, 1);
  assert.equal(report.expenses.pendingCount, 1);
  assert.equal(report.expenses.approvedAmount, 10000);

  // Sesi: 2 baris; cashTotals hanya dari yang closed.
  assert.equal(report.sessions.length, 2);
  assert.equal(report.cashTotals.openCount, 1);
  assert.equal(report.cashTotals.systemCash, 55000);
  assert.equal(report.cashTotals.declaredCash, 60000);
  assert.equal(report.cashTotals.difference, 5000);

  // Per hari (25 = 1 sale 30.000 + parkir 25.000 − listrik 10.000).
  const day25 = report.daily.find(
    (day: { date: string }) => day.date === "2026-07-25",
  );
  assert.ok(day25);
  assert.equal(day25.salesCount, 1);
  assert.equal(day25.visitors, 2);
  assert.equal(day25.ticketRevenue, saleOne.totalAmount);
  assert.equal(day25.otherRevenue, 25000);
  assert.equal(day25.approvedExpenses, 10000);
  assert.equal(day25.netCash, saleOne.totalAmount + 15000);

  const day26 = report.daily.find(
    (day: { date: string }) => day.date === "2026-07-26",
  );
  assert.ok(day26);
  assert.equal(day26.salesCount, 1);
  assert.equal(day26.visitors, 1);
  assert.equal(day26.ticketRevenue, saleTwo.totalAmount);
  assert.equal(day26.otherRevenue, 50000);
  assert.equal(day26.approvedExpenses, 0, "expense pending tidak dihitung");
  assert.equal(day26.netCash, saleTwo.totalAmount + 50000);

  // Hari di luar rentang tidak ikut.
  const outside = await rangeReport(db, "2026-07-25", "2026-07-25");
  assert.equal(outside.sales.count, 1);
  assert.equal(outside.revenue.count, 1);
  assert.equal(outside.sessions.length, 1, "hanya sesi yang buka pada 25 Juli");
});

test("reports: voided sales excluded from totals but reported separately", async () => {
  const { db, rangeReport } = await freshDb();
  const schema = await import(`../../../../db/schema?v=v${Date.now()}`);
  await db
    .update(schema.ticketPrices)
    .set({ active: true })
    .where(eq(schema.ticketPrices.id, "price-adult-weekend-2026"));

  const createSale = (
    await import(`../../../../app/features/ticket-sales/repo?v=v2${Date.now()}`)
  ).createSale as (
    db: unknown,
    input: { items: { ticketProductId: string; quantity: number }[] },
    actorId: string,
  ) => Promise<{ id: string; totalAmount: number }>;

  const good = await createSale(
    db,
    { items: [{ ticketProductId: "ticket-adult", quantity: 1 }] },
    "admin-resepsionis",
  );
  await db
    .update(schema.sales)
    .set({ soldAt: "2026-07-25T02:00:00.000Z" })
    .where(eq(schema.sales.id, good.id));
  const bad = await createSale(
    db,
    { items: [{ ticketProductId: "ticket-adult", quantity: 3 }] },
    "admin-resepsionis",
  );
  await db
    .update(schema.sales)
    .set({ soldAt: "2026-07-25T04:00:00.000Z", status: "voided" })
    .where(eq(schema.sales.id, bad.id));

  const report = await rangeReport(db, "2026-07-25", "2026-07-25");
  assert.equal(report.sales.count, 1);
  assert.equal(report.sales.visitors, 1);
  assert.equal(report.sales.revenue, good.totalAmount);
  assert.equal(report.sales.voidedCount, 1);
  assert.equal(report.sales.voidedAmount, bad.totalAmount);

  const day = report.daily[0];
  assert.equal(day.salesCount, 1);
  assert.equal(day.visitors, 1);
  assert.equal(day.ticketRevenue, good.totalAmount);
});

test("reports: WIB boundary — 17:00 UTC belongs to the next WIB day", async () => {
  const { db, rangeReport } = await freshDb();
  const schema = await import(`../../../../db/schema?v=w${Date.now()}`);
  await db
    .update(schema.ticketPrices)
    .set({ active: true })
    .where(eq(schema.ticketPrices.id, "price-adult-weekend-2026"));

  const createSale = (
    await import(`../../../../app/features/ticket-sales/repo?v=w2${Date.now()}`)
  ).createSale as (
    db: unknown,
    input: { items: { ticketProductId: string; quantity: number }[] },
    actorId: string,
  ) => Promise<{ id: string; totalAmount: number }>;

  const sale = await createSale(
    db,
    { items: [{ ticketProductId: "ticket-adult", quantity: 1 }] },
    "admin-resepsionis",
  );
  // Tepat 17:00 UTC = 00:00 WIB 26 Juli → masuk hari 26, bukan 25.
  await db
    .update(schema.sales)
    .set({ soldAt: "2026-07-25T17:00:00.000Z" })
    .where(eq(schema.sales.id, sale.id));

  const day25 = await rangeReport(db, "2026-07-25", "2026-07-25");
  assert.equal(day25.sales.count, 0, "17:00Z = 00:00 WIB hari berikutnya");
  const day26 = await rangeReport(db, "2026-07-26", "2026-07-26");
  assert.equal(day26.sales.count, 1);
  assert.equal(day26.daily[0].ticketRevenue, sale.totalAmount);
});
