import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { prepareTestEnv, resetTestDb } from "../../../../tests/test-utils.mjs";

async function freshDb() {
  await resetTestDb();
  prepareTestEnv();
}

test("finance: revenue entries and todayRevenueSummary", async () => {
  await freshDb();

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
  const db = await getRequestDb();

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
});

test("finance: expenses approval and cash session reconciliation", async () => {
  await freshDb();

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
  const db = await getRequestDb();

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
});

test("finance: void revenue entry excludes from summary and records audit", async () => {
  await freshDb();

  const [{ createRevenueEntry, listRevenueEntries, todayRevenueSummary, voidRevenueEntry }, { getRequestDb }] =
    await Promise.all([
      import(`../repo.ts?vr=${Date.now()}`),
      import(`../../../../db/get-db?vr=${Date.now()}`),
    ]);
  const db = await getRequestDb();

  const entry = await createRevenueEntry(
    db,
    { sourceKey: "revenue-parking", sourceName: "Parkir", amount: 25000 },
    "admin-resepsionis",
  );
  assert.equal(entry.status, "active");

  const before = await todayRevenueSummary(db);
  assert.equal(before.otherRevenue, 25000);

  const voided = await voidRevenueEntry(db, entry.id, "manajer-operasional");
  assert.equal(voided.status, "voided");
  assert.equal(voided.voidedBy, "manajer-operasional");
  assert.ok(voided.voidedAt, "voidedAt terisi");

  await assert.rejects(
    voidRevenueEntry(db, entry.id, "manajer-operasional"),
    /aktif/,
  );

  const after = await todayRevenueSummary(db);
  assert.equal(after.otherRevenue, 0, "voided tidak dihitung");

  const list = await listRevenueEntries(db, entry.entryDate);
  assert.equal(list.length, 1);
  assert.equal(list[0].status, "voided", "list tetap menampilkan dengan status");
});

test("finance: void expense excludes from cash system and cannot double-void", async () => {
  await freshDb();

  const [{ approveExpense, closeCashSession, createExpense, createRevenueEntry, openCashSession, voidExpense }, { createSale }, { getRequestDb }, { ticketPrices }] =
    await Promise.all([
      import(`../repo.ts?ve=${Date.now()}`),
      import(`../../ticket-sales/repo.ts?ve=${Date.now()}`),
      import(`../../../../db/get-db?ve=${Date.now()}`),
      import(`../../../../db/schema?ve=${Date.now()}`),
    ]);
  const db = await getRequestDb();

  await db
    .update(ticketPrices)
    .set({ active: true })
    .where(eq(ticketPrices.id, "price-adult-weekend-2026"));

  const opened = await openCashSession(db, "admin-resepsionis");
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
  await approveExpense(db, expense.id, "manajer-operasional");

  // Void pengeluaran approved → tidak dihitung system cash.
  const voided = await voidExpense(db, expense.id);
  assert.equal(voided.status, "voided");
  await assert.rejects(
    voidExpense(db, expense.id),
    /dibatalkan/,
  );

  const closed = await closeCashSession(db, opened.id, "admin-resepsionis", 0);
  assert.equal(
    closed.systemCash,
    sale.totalAmount + 25000,
    "expense voided tidak mengurangi system cash",
  );
});
