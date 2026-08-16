import assert from "node:assert/strict";
import test from "node:test";
import { sql } from "drizzle-orm";
import type { Employee } from "../types";
import { prepareTestEnv, resetTestDb } from "../../../../tests/test-utils.mjs";

async function freshDb() {
  await resetTestDb();
  prepareTestEnv();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [
    {
      createEmployee,
      listEmployees,
      createSchedule,
      updateScheduleStatus,
      assignPic,
      listSchedulesByDate,
      listPicsByDate,
      getJadwalSummary,
      listJadwal,
    },
    { getRequestDb },
  ] = await Promise.all([
    import(`../repo.ts?v=${stamp}`),
    import(`../../../../db/get-db?v=${stamp}`),
  ]);
  const db = await getRequestDb();
  return {
    db,
    createEmployee,
    listEmployees,
    createSchedule,
    updateScheduleStatus,
    assignPic,
    listSchedulesByDate,
    listPicsByDate,
    getJadwalSummary,
    listJadwal,
  };
}

const DATE_A = "2026-08-16";
const DATE_B = "2026-08-17";

test("jadwal-karyawan: createEmployee validates name and position", async () => {
  const { db, createEmployee } = await freshDb();

  await assert.rejects(
    createEmployee(db, { name: "  ", position: "Kasir" }),
    /Nama karyawan wajib diisi/,
  );
  await assert.rejects(
    createEmployee(db, { name: "A", position: "Kasir" }),
    /minimal 2 karakter/,
  );
  await assert.rejects(
    createEmployee(db, { name: "Budi", position: "K" }),
    /Posisi wajib diisi/,
  );

  const emp = await createEmployee(db, {
    name: "Budi Santoso",
    position: "Supervisor Operasional",
    area: "Operasional",
  });
  assert.equal(emp.name, "Budi Santoso");
  assert.equal(emp.position, "Supervisor Operasional");
  assert.equal(emp.area, "Operasional");
  assert.equal(emp.active, true);
  assert.ok(emp.id.startsWith("emp-"));
  assert.ok(emp.createdAt);
  assert.ok(emp.updatedAt);
});

test("jadwal-karyawan: createEmployee trims whitespace and nulls empty area", async () => {
  const { db, createEmployee } = await freshDb();

  const emp = await createEmployee(db, {
    name: "  Siti Rahayu  ",
    position: "  Kasir  ",
    area: "   ",
  });
  assert.equal(emp.name, "Siti Rahayu");
  assert.equal(emp.position, "Kasir");
  assert.equal(emp.area, null);
});

test("jadwal-karyawan: listEmployees returns active by default, all when flag false", async () => {
  const { db, createEmployee, listEmployees } = await freshDb();

  const activeOnly = await listEmployees(db);
  assert.ok(activeOnly.length > 0, "seed employees tersedia");
  assert.ok(activeOnly.every((e: Employee) => e.active), "hanya aktif");

  const emp = await createEmployee(db, { name: "Nonaktif Test", position: "Staff" });
  await db.execute(sql`UPDATE employees SET active = false WHERE id = ${emp.id}`);

  const activeOnlyAfter = await listEmployees(db);
  assert.ok(!activeOnlyAfter.some((e: Employee) => e.id === emp.id), "nonaktif dikecualikan");

  const all = await listEmployees(db, false);
  assert.ok(all.some((e: Employee) => e.id === emp.id), "nonaktif muncul saat activeOnly=false");
});

test("jadwal-karyawan: createSchedule upserts on employee+date and defaults status hadir", async () => {
  const { db, createEmployee, createSchedule, listSchedulesByDate } = await freshDb();

  const emp = await createEmployee(db, { name: "Andi", position: "Staff" });

  const sch = await createSchedule(db, {
    employeeId: emp.id,
    date: DATE_A,
    shift: "morning",
  });
  assert.equal(sch.shift, "morning");
  assert.equal(sch.status, "hadir", "default status");
  assert.equal(sch.notes, "");
  assert.equal(sch.employeeName, "Andi", "join employee name");
  assert.equal(sch.employeePosition, "Staff");

  // Upsert: same employee+date → update shift, bukan baris baru.
  const updated = await createSchedule(db, {
    employeeId: emp.id,
    date: DATE_A,
    shift: "evening",
    status: "izin",
    notes: "Terlambat",
  });
  assert.equal(updated.shift, "evening", "shift berubah");
  assert.equal(updated.status, "izin");
  assert.equal(updated.notes, "Terlambat");

  const list = await listSchedulesByDate(db, DATE_A);
  assert.equal(list.length, 1, "tetap satu baris (upsert)");
  assert.equal(list[0].shift, "evening");
});

test("jadwal-karyawan: listSchedulesByDate filters by date and orders shift+name", async () => {
  const { db, createEmployee, createSchedule, listSchedulesByDate } = await freshDb();

  const empA = await createEmployee(db, { name: "Zara", position: "Staff" });
  const empB = await createEmployee(db, { name: "Adi", position: "Staff" });

  await createSchedule(db, { employeeId: empA.id, date: DATE_A, shift: "evening" });
  await createSchedule(db, { employeeId: empB.id, date: DATE_A, shift: "morning" });
  await createSchedule(db, { employeeId: empA.id, date: DATE_B, shift: "morning" });

  const today = await listSchedulesByDate(db, DATE_A);
  assert.equal(today.length, 2, "hanya tanggal yang sama");
  // Urutan: morning dulu, lalu evening. Dalam morning: Adi sebelum Zara.
  assert.equal(today[0].employeeName, "Adi");
  assert.equal(today[0].shift, "morning");
  assert.equal(today[1].employeeName, "Zara");
  assert.equal(today[1].shift, "evening");

  const empty = await listSchedulesByDate(db, "2000-01-01");
  assert.equal(empty.length, 0);
});

test("jadwal-karyawan: updateScheduleStatus updates and throws when not found", async () => {
  const { db, createEmployee, createSchedule, updateScheduleStatus } = await freshDb();

  const emp = await createEmployee(db, { name: "Maya", position: "Staff" });
  const sch = await createSchedule(db, {
    employeeId: emp.id,
    date: DATE_A,
    shift: "morning",
  });

  const updated = await updateScheduleStatus(db, sch.id, {
    status: "tidak_hadir",
    notes: "Sakit",
  });
  assert.equal(updated.status, "tidak_hadir");
  assert.equal(updated.notes, "Sakit");
  assert.equal(updated.employeeName, "Maya", "join tetap terisi");

  await assert.rejects(
    updateScheduleStatus(db, "sch-nonexistent", { status: "hadir" }),
    /tidak ditemukan/,
  );
});

test("jadwal-karyawan: assignPic upserts on employee+date+area", async () => {
  const { db, createEmployee, assignPic, listPicsByDate } = await freshDb();

  const emp = await createEmployee(db, { name: "Dedi", position: "Staff Parkir" });

  const pic1 = await assignPic(db, {
    employeeId: emp.id,
    date: DATE_A,
    area: "Parkir",
    task: "Keluar masuk kendaraan",
  });
  assert.equal(pic1.area, "Parkir");
  assert.equal(pic1.task, "Keluar masuk kendaraan");
  assert.equal(pic1.employeeName, "Dedi");

  // Upsert: same employee+date+area → update task only.
  await assignPic(db, {
    employeeId: emp.id,
    date: DATE_A,
    area: "Parkir",
    task: "Tugas berubah",
  });
  const list = await listPicsByDate(db, DATE_A);
  assert.equal(list.length, 1, "tetap satu PIC untuk area yang sama");
  assert.equal(list[0].task, "Tugas berubah");

  // Area berbeda untuk karyawan yang sama → baris baru.
  await assignPic(db, { employeeId: emp.id, date: DATE_A, area: "Operasional" });
  const list2 = await listPicsByDate(db, DATE_A);
  assert.equal(list2.length, 2, "area berbeda = baris baru");
});

test("jadwal-karyawan: listPicsByDate orders by area then name", async () => {
  const { db, createEmployee, assignPic, listPicsByDate } = await freshDb();

  const empZ = await createEmployee(db, { name: "Zara", position: "Staff" });
  const empA = await createEmployee(db, { name: "Adi", position: "Staff" });

  await assignPic(db, { employeeId: empZ.id, date: DATE_A, area: "Tiket" });
  await assignPic(db, { employeeId: empA.id, date: DATE_A, area: "Fasilitas" });
  await assignPic(db, { employeeId: empA.id, date: DATE_A, area: "Tiket" });

  const list = await listPicsByDate(db, DATE_A);
  assert.equal(list.length, 3);
  // Urutan: Fasilitas (Adi) → Tiket (Adi) → Tiket (Zara).
  assert.equal(list[0].area, "Fasilitas");
  assert.equal(list[1].area, "Tiket");
  assert.equal(list[1].employeeName, "Adi");
  assert.equal(list[2].area, "Tiket");
  assert.equal(list[2].employeeName, "Zara");
});

test("jadwal-karyawan: getJadwalSummary counts shifts and absent correctly", async () => {
  const { db, createEmployee, createSchedule, getJadwalSummary } = await freshDb();

  const emp1 = await createEmployee(db, { name: "Hadir Pagi", position: "Staff" });
  const emp2 = await createEmployee(db, { name: "Hadir Sore", position: "Staff" });
  const emp3 = await createEmployee(db, { name: "Izin Pagi", position: "Staff" });
  const emp4 = await createEmployee(db, { name: "Libur", position: "Staff" });
  const emp5 = await createEmployee(db, { name: "Absen", position: "Staff" });

  await createSchedule(db, { employeeId: emp1.id, date: DATE_A, shift: "morning", status: "hadir" });
  await createSchedule(db, { employeeId: emp2.id, date: DATE_A, shift: "evening", status: "hadir" });
  await createSchedule(db, { employeeId: emp3.id, date: DATE_A, shift: "morning", status: "izin" });
  await createSchedule(db, { employeeId: emp4.id, date: DATE_A, shift: "morning", status: "libur" });
  await createSchedule(db, { employeeId: emp5.id, date: DATE_A, shift: "evening", status: "tidak_hadir" });
  // Hari lain, tidak masuk hitungan.
  await createSchedule(db, { employeeId: emp1.id, date: DATE_B, shift: "morning" });

  const summary = await getJadwalSummary(db, DATE_A);
  assert.equal(summary.totalScheduled, 5);
  assert.equal(summary.morningShift, 2, "pagi aktif = hadir + izin");
  assert.equal(summary.eveningShift, 1, "sore aktif = hadir saja");
  assert.equal(summary.absent, 1, "absen = tidak_hadir saja");
  assert.equal(summary.schedulesToday.length, 5);
  assert.equal(summary.picsToday.length, 0);
});

test("jadwal-karyawan: listJadwal returns date + summary", async () => {
  const { db, listJadwal } = await freshDb();

  const result = await listJadwal(db, DATE_A);
  assert.equal(result.date, DATE_A);
  assert.equal(result.summary.totalScheduled, 0, "kosong di tanggal tanpa jadwal");
  assert.equal(result.summary.picsToday.length, 0);
});

