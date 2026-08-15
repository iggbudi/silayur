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
  const [{ facilityStatusSummary, listFacilitiesWithStatus, upsertFacilityStatus }, { getRequestDb }] =
    await Promise.all([
      import(`../repo.ts?v=${stamp}`),
      import(`../../../../db/get-db?v=${stamp}`),
    ]);
  const db = await getRequestDb();
  return { db, facilityStatusSummary, listFacilitiesWithStatus, upsertFacilityStatus };
}

test("facilities: upsert validates input and facility must exist & be active", async () => {
  const { db, upsertFacilityStatus } = await freshDb();
  try {
    await assert.rejects(
      upsertFacilityStatus(db, { facilityId: "   ", status: "operational" }, "admin-resepsionis", "2026-08-14"),
      /Fasilitas wajib diisi/,
    );
    await assert.rejects(
      upsertFacilityStatus(db, { facilityId: "facility-pool", status: "bogus" as never }, "admin-resepsionis", "2026-08-14"),
      /Status fasilitas tidak valid/,
    );
    await assert.rejects(
      upsertFacilityStatus(db, { facilityId: "tidak-ada", status: "operational" }, "admin-resepsionis", "2026-08-14"),
      /Fasilitas tidak ditemukan/,
    );
    await assert.rejects(
      upsertFacilityStatus(db, { facilityId: "facility-camping", status: "operational" }, "admin-resepsionis", "2026-08-14"),
      /Fasilitas nonaktif/, // camping inactive di seed
    );

    const created = await upsertFacilityStatus(
      db,
      { facilityId: "facility-pool", status: "needs_attention", note: "Keruh" },
      "admin-resepsionis",
      "2026-08-14",
    );
    assert.equal(created.facilityId, "facility-pool");
    assert.equal(created.status, "needs_attention");
    assert.equal(created.date, "2026-08-14");
    assert.equal(created.recordedBy, "admin-resepsionis");
  } finally {
    // state dibersihkan oleh resetTestDb berikutnya
  }
});

test("facilities: upsert same facility+date keeps single row, last status wins", async () => {
  const { db, upsertFacilityStatus } = await freshDb();
  try {
    const stamp = `${Date.now()}`;
    const { facilityStatus: table } = await import(`../../../../db/schema?v=f${stamp}`);
    await upsertFacilityStatus(db, { facilityId: "facility-pool", status: "closed" }, "admin-resepsionis", "2026-08-14");
    const updated = await upsertFacilityStatus(db, { facilityId: "facility-pool", status: "operational" }, "admin-resepsionis", "2026-08-14");
    assert.equal(updated.status, "operational");

    const rows = await db.select().from(table).where(eq(table.facilityId, "facility-pool"));
    assert.equal(rows.length, 1, "hanya satu baris per fasilitas per hari");
    assert.equal(rows[0].status, "operational");
  } finally {
    // state dibersihkan oleh resetTestDb berikutnya
  }
});

test("facilities: list shows active facilities with today's status, default operational", async () => {
  const { db, listFacilitiesWithStatus, upsertFacilityStatus } = await freshDb();
  try {
    await upsertFacilityStatus(db, { facilityId: "facility-playground", status: "needs_attention" }, "admin-resepsionis", "2026-08-14");

    const list = await listFacilitiesWithStatus(db, "2026-08-14");
    const names = list.map((f: { name: string }) => f.name);
    // Active: Kolam Renang, Playground, Area Parkir. Camping Ground inactive → tidak muncul.
    assert.ok(names.includes("Kolam Renang"));
    assert.ok(names.includes("Playground"));
    assert.ok(names.includes("Area Parkir"));
    assert.ok(!names.includes("Camping Ground"), "fasilitas nonaktif tidak muncul");

    const pool = list.find((f: { id: string }) => f.id === "facility-pool");
    assert.equal(pool?.status, "operational", "default saat belum dicatat");
    assert.equal(pool?.recordedAt, null);

    const playground = list.find(
      (f: { id: string }) => f.id === "facility-playground",
    );
    assert.equal(playground?.status, "needs_attention");
    assert.ok(playground?.recordedAt, "tercatat hari ini");
  } finally {
    // state dibersihkan oleh resetTestDb berikutnya
  }
});

test("facilities: summary counts operational/needsAttention/closed", async () => {
  const { db, facilityStatusSummary, upsertFacilityStatus } = await freshDb();
  try {
    await upsertFacilityStatus(db, { facilityId: "facility-pool", status: "operational" }, "admin-resepsionis", "2026-08-14");
    await upsertFacilityStatus(db, { facilityId: "facility-playground", status: "needs_attention" }, "admin-resepsionis", "2026-08-14");
    await upsertFacilityStatus(db, { facilityId: "facility-parking", status: "closed" }, "admin-resepsionis", "2026-08-14");

    const summary = await facilityStatusSummary(db, "2026-08-14");
    assert.equal(summary.facilities.length, 3);
    assert.equal(summary.counts.operational, 1);
    assert.equal(summary.counts.needsAttention, 1);
    assert.equal(summary.counts.closed, 1);
    assert.ok(summary.updatedAt, "updatedAt dari catatan terbaru");

    // Hari tanpa catatan: semua operational.
    const emptyDay = await facilityStatusSummary(db, "2000-01-01");
    assert.equal(emptyDay.counts.operational, 3);
    assert.equal(emptyDay.updatedAt, null);
  } finally {
    // state dibersihkan oleh resetTestDb berikutnya
  }
});
