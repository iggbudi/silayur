import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
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
  const dir = mkdtempSync(path.join(tmpdir(), "silayur-complaints-repo-"));
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

async function freshDb() {
  const { dir, env } = testDb();
  runScript("scripts/db-migrate.mjs", env);
  runScript("scripts/db-seed.mjs", env);
  process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [{ createComplaint, listComplaints, listComplaintsByDate, updateComplaintStatus, countOpenComplaints }, { getRequestDb }] =
    await Promise.all([
      import(`../repo.ts?v=${stamp}`),
      import(`../../../../db/get-db?v=${stamp}`),
    ]);
  const db = await getRequestDb();
  return { db, createComplaint, listComplaints, listComplaintsByDate, updateComplaintStatus, countOpenComplaints, dir };
}

test("complaints: create validates input and sets open status", async () => {
  const { db, createComplaint, dir } = await freshDb();
  try {
    await assert.rejects(
      createComplaint(db, { title: "   " }, "admin-resepsionis", "2026-08-14"),
      /Judul komplain wajib diisi/,
    );
    await assert.rejects(
      createComplaint(db, { title: "ab" }, "admin-resepsionis", "2026-08-14"),
      /terlalu pendek/,
    );
    await assert.rejects(
      createComplaint(db, { title: "Bising", priority: "urgent" as never }, "admin-resepsionis", "2026-08-14"),
      /Prioritas komplain tidak valid/,
    );

    const complaint = await createComplaint(
      db,
      { title: "Kebersihan toilet", description: "Lantai licin", category: "Toilet Utama", priority: "high" },
      "admin-resepsionis",
      "2026-08-14",
    );
    assert.equal(complaint.status, "open");
    assert.equal(complaint.priority, "high");
    assert.equal(complaint.category, "Toilet Utama");
    assert.equal(complaint.reportedBy, "admin-resepsionis");
    assert.ok(complaint.reportedByName, "reportedByName harus terisi via join");
    assert.equal(complaint.date, "2026-08-14");
    assert.ok(complaint.reportedAt);
    assert.ok(complaint.updatedAt);
  } finally {
    cleanupTempDirectory(dir);
  }
});

test("complaints: list by date filters WIB day and orders newest first", async () => {
  const { db, createComplaint, listComplaints, listComplaintsByDate, dir } = await freshDb();
  try {
    const first = await createComplaint(
      db,
      { title: "Antrean kolam", category: "Kolam Renang" },
      "admin-resepsionis",
      "2026-08-14",
    );
    const second = await createComplaint(
      db,
      { title: "Parkir penuh", category: "Area Parkir" },
      "manajer-operasional",
      "2026-08-14",
    );
    await createComplaint(
      db,
      { title: "Kemarin", category: "Playground" },
      "admin-resepsionis",
      "2026-08-13",
    );

    const today = await listComplaintsByDate(db, "2026-08-14");
    assert.equal(today.length, 2);
    assert.equal(today[0].id, second.id, "terbaru dulu");
    assert.equal(today[1].id, first.id);

    const list = await listComplaints(db, "2026-08-14");
    assert.equal(list.complaints.length, 2);
    assert.equal(list.openCount, 3, "semua belum resolved");

    const otherDay = await listComplaintsByDate(db, "2000-01-01");
    assert.equal(otherDay.length, 0);
  } finally {
    cleanupTempDirectory(dir);
  }
});

test("complaints: status transitions enforce lifecycle", async () => {
  const { db, createComplaint, updateComplaintStatus, countOpenComplaints, dir } = await freshDb();
  try {
    const complaint = await createComplaint(
      db,
      { title: "Makanan kurang", category: "Tenant" },
      "admin-resepsionis",
      "2026-08-14",
    );

    // Transisi valid.
    const assigned = await updateComplaintStatus(db, complaint.id, "assigned", "manajer-operasional");
    assert.equal(assigned.status, "assigned");
    assert.equal(assigned.updatedBy, "manajer-operasional");
    const processing = await updateComplaintStatus(db, complaint.id, "processing", "manajer-operasional");
    assert.equal(processing.status, "processing");
    const resolved = await updateComplaintStatus(db, complaint.id, "resolved", "manajer-operasional");
    assert.equal(resolved.status, "resolved");

    // Terbuka berkurang setelah resolved.
    assert.equal(await countOpenComplaints(db), 0);

    // Transisi tak valid ditolak.
    await assert.rejects(
      updateComplaintStatus(db, complaint.id, "assigned", "admin-resepsionis"),
      /Transisi status tidak valid/,
    );

    // Reopen diizinkan dari resolved.
    const reopened = await updateComplaintStatus(db, complaint.id, "reopened", "admin-resepsionis");
    assert.equal(reopened.status, "reopened");
    assert.equal(await countOpenComplaints(db), 1);
  } finally {
    cleanupTempDirectory(dir);
  }
});

test("complaints: recent lists latest across dates with limit", async () => {
  const { db, createComplaint, dir } = await freshDb();
  try {
    const stamp = `${Date.now()}`;
    const { listRecentComplaints } = await import(`../repo.ts?recent=${stamp}`);
    for (let i = 0; i < 3; i += 1) {
      await createComplaint(db, { title: `Komplain ${i}` }, "admin-resepsionis", `2026-08-1${i}`);
    }
    const all = await listRecentComplaints(db, 5);
    assert.equal(all.length, 3);
    const limited = await listRecentComplaints(db, 2);
    assert.equal(limited.length, 2);
    assert.equal(limited[0].title, "Komplain 2", "terbaru dulu");
  } finally {
    cleanupTempDirectory(dir);
  }
});
