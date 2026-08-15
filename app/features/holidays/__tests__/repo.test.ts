import assert from "node:assert/strict";
import test from "node:test";
import {
  prepareTestEnv,
  resetTestDb,
} from "../../../../tests/test-utils.mjs";

async function freshDb() {
  await resetTestDb();
  prepareTestEnv();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [
    { deleteHoliday, listHolidayDates, listHolidays, upsertHoliday },
    { getRequestDb },
  ] = await Promise.all([
    import(`../repo.ts?v=${stamp}`),
    import(`../../../../db/get-db?v=${stamp}`),
  ]);
  const db = await getRequestDb();
  return {
    db,
    deleteHoliday,
    listHolidayDates,
    listHolidays,
    upsertHoliday,
  };
}

test("holidays: upsert validates date and stores name", async () => {
  const { db, upsertHoliday } = await freshDb();
  try {
    await assert.rejects(
      upsertHoliday(db, { date: "not-a-date", name: "X" }, "admin-resepsionis"),
      /Tanggal libur tidak valid/,
    );
    await assert.rejects(
      upsertHoliday(db, { date: "2026-02-31", name: "X" }, "admin-resepsionis"),
      /Tanggal libur tidak valid/,
    );

    const created = await upsertHoliday(
      db,
      { date: "2026-12-25", name: "Natal" },
      "admin-resepsionis",
    );
    assert.equal(created.date, "2026-12-25");
    assert.equal(created.name, "Natal");
    assert.equal(created.createdBy, "admin-resepsionis");
  } finally {
    // state dibersihkan oleh resetTestDb berikutnya
  }
});

test("holidays: upsert same date keeps single row, last name wins", async () => {
  const { db, upsertHoliday, listHolidays } = await freshDb();
  try {
    await upsertHoliday(db, { date: "2026-01-01", name: "Tahun Baru" }, "admin-resepsionis");
    const updated = await upsertHoliday(db, { date: "2026-01-01", name: "Tahun Baru 2026" }, "admin-resepsionis");
    assert.equal(updated.name, "Tahun Baru 2026");

    const all = await listHolidays(db);
    assert.equal(all.length, 1);
    assert.equal(all[0].name, "Tahun Baru 2026");
  } finally {
    // state dibersihkan oleh resetTestDb berikutnya
  }
});

test("holidays: list dates and delete by date", async () => {
  const { db, upsertHoliday, listHolidayDates, deleteHoliday, listHolidays } = await freshDb();
  try {
    await upsertHoliday(db, { date: "2026-08-17", name: "HUT RI" }, "admin-resepsionis");
    await upsertHoliday(db, { date: "2026-12-25", name: "Natal" }, "admin-resepsionis");

    const dates = await listHolidayDates(db);
    assert.deepEqual(dates.sort(), ["2026-08-17", "2026-12-25"]);

    await deleteHoliday(db, "2026-08-17");
    const after = await listHolidays(db);
    assert.equal(after.length, 1);
    assert.equal(after[0].date, "2026-12-25");

    await assert.rejects(deleteHoliday(db, "bad"), /Tanggal libur tidak valid/);
  } finally {
    // state dibersihkan oleh resetTestDb berikutnya
  }
});
