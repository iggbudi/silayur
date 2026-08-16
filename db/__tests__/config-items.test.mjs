import assert from "node:assert/strict";
import test from "node:test";
import { prepareTestEnv, resetTestDb } from "../../tests/test-utils.mjs";

async function freshDb() {
  await resetTestDb();
  prepareTestEnv();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [repo, getDb] = await Promise.all([
    import(`../config-repo.ts?v=${stamp}`),
    import(`../get-db?v=${stamp}`),
  ]);
  const db = await getDb.getRequestDb();
  return { db, ...repo };
}

test("saveConfigItems: seed memuat section operating-hours dan shifts", async () => {
  const { db, loadConfigSnapshot } = await freshDb();
  const snapshot = await loadConfigSnapshot(db);
  const opHours = snapshot.configItems["operating-hours"];
  const shifts = snapshot.configItems.shifts;
  assert.ok(opHours.some((item) => item.id === "op-hours-regular"));
  assert.ok(shifts.some((item) => item.id === "morning" && item.active));
  assert.ok(shifts.some((item) => item.id === "evening" && item.active));
});

test("saveConfigItems: menyimpan perubahan jam operasional & shift", async () => {
  const { db, saveConfigPatch, loadConfigSnapshot } = await freshDb();
  const before = await loadConfigSnapshot(db);

  const nextItems = {
    ...before.configItems,
    "operating-hours": before.configItems["operating-hours"].map((item) =>
      item.id === "op-hours-regular" ? { ...item, detail: "07.30-17.00" } : item,
    ),
    shifts: before.configItems.shifts.map((item) =>
      item.id === "morning" ? { ...item, detail: "05.00-13.00" } : item,
    ),
  };

  await saveConfigPatch(db, { configItems: nextItems });
  const after = await loadConfigSnapshot(db);
  assert.equal(
    after.configItems["operating-hours"].find((item) => item.id === "op-hours-regular")
      ?.detail,
    "07.30-17.00",
  );
  assert.equal(
    after.configItems.shifts.find((item) => item.id === "morning")?.detail,
    "05.00-13.00",
  );
});

test("saveConfigItems: menolak format jam tidak valid", async () => {
  const { db, saveConfigPatch, loadConfigSnapshot } = await freshDb();
  const before = await loadConfigSnapshot(db);

  await assert.rejects(
    saveConfigPatch(db, {
      configItems: {
        ...before.configItems,
        "operating-hours": before.configItems["operating-hours"].map((item) =>
          item.id === "op-hours-regular" ? { ...item, detail: "8am - 4pm" } : item,
        ),
      },
    }),
    /Format jam tidak valid/,
  );

  // Rentang terbalik (shift semalam) juga ditolak.
  await assert.rejects(
    saveConfigPatch(db, {
      configItems: {
        ...before.configItems,
        shifts: before.configItems.shifts.map((item) =>
          item.id === "evening" ? { ...item, detail: "22.00-14.00" } : item,
        ),
      },
    }),
    /Format jam tidak valid/,
  );
});

test("saveConfigItems: menolak menghapus semua shift aktif", async () => {
  const { db, saveConfigPatch, loadConfigSnapshot } = await freshDb();
  const before = await loadConfigSnapshot(db);

  await assert.rejects(
    saveConfigPatch(db, {
      configItems: {
        ...before.configItems,
        shifts: before.configItems.shifts.map((item) => ({
          ...item,
          active: false,
        })),
      },
    }),
    /Minimal satu jam kerja/,
  );
});

test("saveConfigItems: menolak menghapus shift yang masih dipakai jadwal", async () => {
  const { db, saveConfigPatch, loadConfigSnapshot } = await freshDb();
  const before = await loadConfigSnapshot(db);

  // Hapus shift "evening" — masih dipakai seed jadwal demo bila ada;
  // pastikan ada jadwal yang memakainya.
  const { getRequestDb } = await import(`../get-db?v=${Date.now()}`);
  const testDb = await getRequestDb();
  await testDb.execute(
    "INSERT INTO schedule_shifts (id, employee_id, date, shift, status, notes, created_at, updated_at) VALUES ('sch-test-shift', (SELECT id FROM employees LIMIT 1), '2026-08-16', 'evening', 'hadir', '', now(), now()) ON CONFLICT DO NOTHING",
  );

  await assert.rejects(
    saveConfigPatch(db, {
      configItems: {
        ...before.configItems,
        shifts: before.configItems.shifts.filter((item) => item.id !== "evening"),
      },
    }),
    /tidak dapat dihapus/,
  );

  // Nonaktifkan (bukan hapus) tetap diizinkan.
  await saveConfigPatch(db, {
    configItems: {
      ...before.configItems,
      shifts: before.configItems.shifts.map((item) =>
        item.id === "evening" ? { ...item, active: false } : item,
      ),
    },
  });
});
