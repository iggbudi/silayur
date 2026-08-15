import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import {
  prepareTestEnv,
  resetTestDb,
} from "../../../../tests/test-utils.mjs";

async function freshDb() {
  await resetTestDb();
  prepareTestEnv();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [
    { listOperationsChecklist, operationsStatus, upsertOperationsChecklist },
    { getRequestDb },
  ] = await Promise.all([
    import(`../repo.ts?v=${stamp}`),
    import(`../../../../db/get-db?v=${stamp}`),
  ]);
  const db = await getRequestDb();
  return {
    db,
    listOperationsChecklist,
    operationsStatus,
    upsertOperationsChecklist,
  };
}

test("operations: upsert validates input and checklist must exist & be active", async () => {
  const { db, upsertOperationsChecklist } = await freshDb();
  try {
    await assert.rejects(
      upsertOperationsChecklist(
        db,
        { checklistId: "   ", done: true },
        "admin-resepsionis",
        "2026-08-14",
      ),
      /Checklist wajib diisi/,
    );
    await assert.rejects(
      upsertOperationsChecklist(
        db,
        { checklistId: "tidak-ada", done: true },
        "admin-resepsionis",
        "2026-08-14",
      ),
      /Checklist tidak ditemukan/,
    );
    // `hours-holiday` ada di seed tapi nonaktif.
    await assert.rejects(
      upsertOperationsChecklist(
        db,
        { checklistId: "hours-holiday", done: true },
        "admin-resepsionis",
        "2026-08-14",
      ),
      /Checklist nonaktif/,
    );

    const created = await upsertOperationsChecklist(
      db,
      { checklistId: "hours-regular", done: true, note: "Loket dibuka" },
      "admin-resepsionis",
      "2026-08-14",
    );
    assert.equal(created.checklistId, "hours-regular");
    assert.equal(created.done, true);
    assert.equal(created.note, "Loket dibuka");
    assert.equal(created.recordedBy, "admin-resepsionis");
  } finally {
    // state dibersihkan oleh resetTestDb berikutnya
  }
});

test("operations: upsert same checklist+date keeps single row, last status wins", async () => {
  const { db, upsertOperationsChecklist } = await freshDb();
  try {
    const stamp = `${Date.now()}`;
    const { operationsChecklist: table } = await import(
      `../../../../db/schema?v=f${stamp}`
    );
    await upsertOperationsChecklist(
      db,
      { checklistId: "hours-regular", done: false },
      "admin-resepsionis",
      "2026-08-14",
    );
    const updated = await upsertOperationsChecklist(
      db,
      { checklistId: "hours-regular", done: true },
      "admin-resepsionis",
      "2026-08-14",
    );
    assert.equal(updated.done, true);

    const rows = await db
      .select()
      .from(table)
      .where(eq(table.checklistId, "hours-regular"));
    assert.equal(rows.length, 1, "hanya satu baris per item per hari");
    assert.equal(rows[0].done, true);
  } finally {
    // state dibersihkan oleh resetTestDb berikutnya
  }
});

test("operations: list shows active checklist items with today's status, default undone", async () => {
  const { db, listOperationsChecklist, upsertOperationsChecklist } =
    await freshDb();
  try {
    await upsertOperationsChecklist(
      db,
      { checklistId: "hours-regular", done: true },
      "admin-resepsionis",
      "2026-08-14",
    );

    const list = await listOperationsChecklist(db, "2026-08-14");
    const names = list.map((item: { name: string }) => item.name);
    // Active: Jadwal reguler. Hari libur khusus inactive → tidak muncul.
    assert.ok(names.includes("Jadwal reguler"));
    assert.ok(!names.includes("Hari libur khusus"), "item nonaktif tidak muncul");

    const regular = list.find(
      (item: { checklistId: string }) => item.checklistId === "hours-regular",
    );
    assert.equal(regular?.done, true);
    assert.ok(regular?.recordedAt, "tercatat hari ini");

    const emptyDay = await listOperationsChecklist(db, "2000-01-01");
    assert.equal(emptyDay.length, 1, "hanya item aktif yang muncul");
    assert.equal(emptyDay[0].done, false, "default saat belum dicatat");
    assert.equal(emptyDay[0].recordedAt, null);
  } finally {
    // state dibersihkan oleh resetTestDb berikutnya
  }
});

test("operations: summary counts done/total and updatedAt", async () => {
  const { db, operationsStatus, upsertOperationsChecklist } =
    await freshDb();
  try {
    const empty = await operationsStatus(db, "2000-01-01");
    assert.equal(empty.totalCount, 1);
    assert.equal(empty.doneCount, 0);
    assert.equal(empty.updatedAt, null);

    await upsertOperationsChecklist(
      db,
      { checklistId: "hours-regular", done: true },
      "admin-resepsionis",
      "2026-08-14",
    );
    const status = await operationsStatus(db, "2026-08-14");
    assert.equal(status.totalCount, 1);
    assert.equal(status.doneCount, 1);
    assert.ok(status.updatedAt, "updatedAt dari catatan terbaru");
  } finally {
    // state dibersihkan oleh resetTestDb berikutnya
  }
});
