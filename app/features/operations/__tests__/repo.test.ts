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
    { configItems: configItemsTable },
  ] = await Promise.all([
    import(`../repo.ts?v=${stamp}`),
    import(`../../../../db/get-db?v=${stamp}`),
    import(`../../../../db/schema?v=f${stamp}`),
  ]);
  const db = await getRequestDb();
  return {
    db,
    configItemsTable,
    listOperationsChecklist,
    operationsStatus,
    upsertOperationsChecklist,
  };
}

test("operations: upsert validates input and checklist must exist & be active", async () => {
  const { db, configItemsTable, upsertOperationsChecklist } = await freshDb();
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

    // Sisipkan tugas hours nonaktif untuk menguji penolakan.
    await db.insert(configItemsTable).values({
      id: "task-inactive-test",
      section: "hours",
      name: "Tugas nonaktif",
      detail: "",
      active: false,
      sortOrder: 99,
      phase: "buka",
    });
    await assert.rejects(
      upsertOperationsChecklist(
        db,
        { checklistId: "task-inactive-test", done: true },
        "admin-resepsionis",
        "2026-08-14",
      ),
      /Checklist nonaktif/,
    );

    const created = await upsertOperationsChecklist(
      db,
      { checklistId: "task-buka-loket", done: true, note: "Loket siap" },
      "admin-resepsionis",
      "2026-08-14",
    );
    assert.equal(created.checklistId, "task-buka-loket");
    assert.equal(created.done, true);
    assert.equal(created.note, "Loket siap");
    assert.equal(created.recordedBy, "admin-resepsionis");
    assert.equal(created.phase, "buka");
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
      { checklistId: "task-buka-loket", done: false },
      "admin-resepsionis",
      "2026-08-14",
    );
    const updated = await upsertOperationsChecklist(
      db,
      { checklistId: "task-buka-loket", done: true },
      "admin-resepsionis",
      "2026-08-14",
    );
    assert.equal(updated.done, true);

    const rows = await db
      .select()
      .from(table)
      .where(eq(table.checklistId, "task-buka-loket"));
    assert.equal(rows.length, 1, "hanya satu baris per item per hari");
    assert.equal(rows[0].done, true);
  } finally {
    // state dibersihkan oleh resetTestDb berikutnya
  }
});

test("operations: list shows active checklist items with phase, default undone", async () => {
  const { db, listOperationsChecklist, upsertOperationsChecklist } =
    await freshDb();
  try {
    await upsertOperationsChecklist(
      db,
      { checklistId: "task-buka-loket", done: true },
      "admin-resepsionis",
      "2026-08-14",
    );

    const list = await listOperationsChecklist(db, "2026-08-14");
    const names = list.map((item: { name: string }) => item.name);
    // 6 tugas seed aktif (3 buka + 3 tutup). Item nonaktif tidak muncul.
    assert.equal(list.length, 6, "hanya item aktif yang muncul");
    assert.ok(names.includes("Siapkan uang kembalian loket"));

    const buka = list.filter(
      (item: { phase: "buka" | "tutup" | null }) => item.phase === "buka",
    );
    const tutup = list.filter(
      (item: { phase: "buka" | "tutup" | null }) => item.phase === "tutup",
    );
    assert.equal(buka.length, 3);
    assert.equal(tutup.length, 3);

    const loket = list.find(
      (item: { checklistId: string }) => item.checklistId === "task-buka-loket",
    );
    assert.equal(loket?.done, true);
    assert.equal(loket?.phase, "buka");
    assert.ok(loket?.recordedAt, "tercatat hari ini");

    const emptyDay = await listOperationsChecklist(db, "2000-01-01");
    assert.equal(emptyDay.length, 6, "hanya item aktif yang muncul");
    assert.equal(emptyDay[0].done, false, "default saat belum dicatat");
    assert.equal(emptyDay[0].recordedAt, null);
  } finally {
    // state dibersihkan oleh resetTestDb berikutnya
  }
});

test("operations: summary counts done/total, groups per phase, and updatedAt", async () => {
  const { db, operationsStatus, upsertOperationsChecklist } = await freshDb();
  try {
    const empty = await operationsStatus(db, "2000-01-01");
    assert.equal(empty.totalCount, 6);
    assert.equal(empty.doneCount, 0);
    assert.equal(empty.groups.length, 2, "2 fase: buka & tutup");
    assert.equal(empty.groups[0].totalCount, 3);
    assert.equal(empty.groups[0].phase, "buka");
    assert.equal(empty.groups[1].totalCount, 3);
    assert.equal(empty.groups[1].phase, "tutup");
    assert.equal(empty.updatedAt, null);

    // Tandai 2 tugas fase buka selesai.
    await upsertOperationsChecklist(
      db,
      { checklistId: "task-buka-loket", done: true },
      "admin-resepsionis",
      "2026-08-14",
    );
    await upsertOperationsChecklist(
      db,
      { checklistId: "task-buka-bersih", done: true },
      "admin-resepsionis",
      "2026-08-14",
    );
    const status = await operationsStatus(db, "2026-08-14");
    assert.equal(status.totalCount, 6);
    assert.equal(status.doneCount, 2);
    assert.equal(status.groups[0].doneCount, 2, "fase buka 2 dari 3 selesai");
    assert.equal(status.groups[1].doneCount, 0, "fase tutup belum");
    assert.ok(status.updatedAt, "updatedAt dari catatan terbaru");
  } finally {
    // state dibersihkan oleh resetTestDb berikutnya
  }
});
