/**
 * Data access modul Jadwal Karyawan & PIC.
 * `date` = tanggal kalender WIB untuk pengelompokan harian.
 */

import { and, asc, eq } from "drizzle-orm";
import {
  configItems,
  employees,
  picAssignments,
  scheduleShifts,
} from "../../../db/schema";
import type { AppDb } from "../../../db/get-db";
import { todayIsoDate } from "../../../shared/date";
import type {
  AttendanceStatus,
  CreateEmployeeInput,
  CreatePicInput,
  CreateScheduleInput,
  Employee,
  JadwalListResponse,
  JadwalSummary,
  PicArea,
  PicAssignment,
  ScheduleShift,
  ShiftCount,
  ShiftDefinition,
  ShiftKey,
  UpdateScheduleStatusInput,
} from "./types";
import { DEFAULT_SHIFTS } from "./constants";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function mapEmployee(row: typeof employees.$inferSelect): Employee {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    area: row.area,
    active: Boolean(row.active),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapSchedule(
  row: typeof scheduleShifts.$inferSelect & {
    employeeName: string;
    employeePosition: string;
  },
): ScheduleShift {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    employeePosition: row.employeePosition,
    date: row.date,
    shift: row.shift as ShiftKey,
    status: row.status as AttendanceStatus,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapPic(
  row: typeof picAssignments.$inferSelect & {
    employeeName: string;
    employeePosition: string;
  },
): PicAssignment {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    employeePosition: row.employeePosition,
    date: row.date,
    area: row.area as PicArea,
    task: row.task,
    createdAt: row.createdAt,
  };
}

/**
 * Daftar jam kerja (shift) aktif dari config_items section `shifts`
 * (Pengaturan → Jam kerja karyawan). Fallback ke `DEFAULT_SHIFTS`
 * bila config kosong.
 */
export async function listShifts(db: AppDb): Promise<ShiftDefinition[]> {
  const rows = await db
    .select({
      key: configItems.id,
      label: configItems.name,
      time: configItems.detail,
      active: configItems.active,
      sortOrder: configItems.sortOrder,
    })
    .from(configItems)
    .where(and(eq(configItems.section, "shifts"), eq(configItems.active, true)))
    .orderBy(asc(configItems.sortOrder), asc(configItems.name));
  if (rows.length === 0) return DEFAULT_SHIFTS;
  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    time: row.time,
    active: Boolean(row.active),
    sortOrder: row.sortOrder,
  }));
}

/** Daftar karyawan (default hanya aktif). */
export async function listEmployees(
  db: AppDb,
  activeOnly = true,
): Promise<Employee[]> {
  const rows = await db
    .select()
    .from(employees)
    .where(activeOnly ? eq(employees.active, true) : undefined)
    .orderBy(asc(employees.name));
  return rows.map(mapEmployee);
}

/** Buat karyawan baru. */
export async function createEmployee(
  db: AppDb,
  input: CreateEmployeeInput,
): Promise<Employee> {
  const name = input.name.trim();
  if (!name || name.length < 2) {
    throw new Error("Nama karyawan wajib diisi (minimal 2 karakter).");
  }
  const position = input.position.trim();
  if (!position || position.length < 2) {
    throw new Error("Posisi wajib diisi (minimal 2 karakter).");
  }

  const id = newId("emp");
  const now = new Date().toISOString();
  await db.insert(employees).values({
    id,
    name,
    position,
    area: input.area?.trim() || null,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  const rows = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  if (!rows[0]) throw new Error("Gagal membuat karyawan.");
  return mapEmployee(rows[0]);
}

/** Daftar jadwal pada satu tanggal WIB (dengan info karyawan). */
export async function listSchedulesByDate(
  db: AppDb,
  dateIso: string,
): Promise<ScheduleShift[]> {
  const rows = await db
    .select({
      id: scheduleShifts.id,
      employeeId: scheduleShifts.employeeId,
      date: scheduleShifts.date,
      shift: scheduleShifts.shift,
      status: scheduleShifts.status,
      notes: scheduleShifts.notes,
      createdAt: scheduleShifts.createdAt,
      updatedAt: scheduleShifts.updatedAt,
      employeeName: employees.name,
      employeePosition: employees.position,
    })
    .from(scheduleShifts)
    .innerJoin(employees, eq(employees.id, scheduleShifts.employeeId))
    .where(eq(scheduleShifts.date, dateIso))
    .orderBy(asc(employees.name));
  // Urutkan ulang sesuai urutan shift di config (sortOrder), nama tetap urut.
  const shiftOrder = new Map(
    (await listShifts(db)).map((shift, index) => [shift.key, index]),
  );
  return rows
    .map(mapSchedule)
    .sort(
      (a, b) =>
        (shiftOrder.get(a.shift) ?? Number.MAX_SAFE_INTEGER) -
          (shiftOrder.get(b.shift) ?? Number.MAX_SAFE_INTEGER) ||
        a.employeeName.localeCompare(b.employeeName),
    );
}

/** Buat atau update jadwal shift (upsert berdasarkan employeeId + date). */
export async function createSchedule(
  db: AppDb,
  input: CreateScheduleInput,
): Promise<ScheduleShift> {
  const activeShifts = await listShifts(db);
  if (!activeShifts.some((shift) => shift.key === input.shift)) {
    throw new Error("Shift tidak valid. Pilih jam kerja yang aktif di Pengaturan.");
  }
  const now = new Date().toISOString();
  const id = newId("sch");
  const status: AttendanceStatus = input.status ?? "hadir";
  const notes = (input.notes ?? "").trim();

  await db
    .insert(scheduleShifts)
    .values({
      id,
      employeeId: input.employeeId,
      date: input.date,
      shift: input.shift,
      status,
      notes,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [scheduleShifts.employeeId, scheduleShifts.date],
      set: {
        shift: input.shift,
        status,
        notes,
        updatedAt: now,
      },
    });

  const rows = await db
    .select({
      id: scheduleShifts.id,
      employeeId: scheduleShifts.employeeId,
      date: scheduleShifts.date,
      shift: scheduleShifts.shift,
      status: scheduleShifts.status,
      notes: scheduleShifts.notes,
      createdAt: scheduleShifts.createdAt,
      updatedAt: scheduleShifts.updatedAt,
      employeeName: employees.name,
      employeePosition: employees.position,
    })
    .from(scheduleShifts)
    .innerJoin(employees, eq(employees.id, scheduleShifts.employeeId))
    .where(and(eq(scheduleShifts.employeeId, input.employeeId), eq(scheduleShifts.date, input.date)))
    .limit(1);
  if (!rows[0]) throw new Error("Gagal membuat jadwal.");
  return mapSchedule(rows[0]);
}

/** Update status kehadiran pada jadwal tertentu. */
export async function updateScheduleStatus(
  db: AppDb,
  scheduleId: string,
  input: UpdateScheduleStatusInput,
): Promise<ScheduleShift> {
  const now = new Date().toISOString();
  const notes = (input.notes ?? "").trim();

  const updated = await db
    .update(scheduleShifts)
    .set({ status: input.status, notes, updatedAt: now })
    .where(eq(scheduleShifts.id, scheduleId))
    .returning();

  if (!updated[0]) {
    throw new Error("Jadwal tidak ditemukan.");
  }

  const row = updated[0];
  const empRows = await db
    .select({ name: employees.name, position: employees.position })
    .from(employees)
    .where(eq(employees.id, row.employeeId))
    .limit(1);

  return mapSchedule({
    ...row,
    employeeName: empRows[0]?.name ?? "",
    employeePosition: empRows[0]?.position ?? "",
  });
}

/** Daftar PIC pada satu tanggal WIB. */
export async function listPicsByDate(
  db: AppDb,
  dateIso: string,
): Promise<PicAssignment[]> {
  const rows = await db
    .select({
      id: picAssignments.id,
      employeeId: picAssignments.employeeId,
      date: picAssignments.date,
      area: picAssignments.area,
      task: picAssignments.task,
      createdAt: picAssignments.createdAt,
      employeeName: employees.name,
      employeePosition: employees.position,
    })
    .from(picAssignments)
    .innerJoin(employees, eq(employees.id, picAssignments.employeeId))
    .where(eq(picAssignments.date, dateIso))
    .orderBy(asc(picAssignments.area), asc(employees.name));
  return rows.map(mapPic);
}

/** Assign PIC untuk area pada tanggal tertentu. */
export async function assignPic(
  db: AppDb,
  input: CreatePicInput,
): Promise<PicAssignment> {
  const now = new Date().toISOString();
  const id = newId("pic");
  const task = (input.task ?? "").trim();

  await db
    .insert(picAssignments)
    .values({
      id,
      employeeId: input.employeeId,
      date: input.date,
      area: input.area,
      task,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: [picAssignments.employeeId, picAssignments.date, picAssignments.area],
      set: { employeeId: input.employeeId, task, createdAt: now },
    });

  const rows = await db
    .select({
      id: picAssignments.id,
      employeeId: picAssignments.employeeId,
      date: picAssignments.date,
      area: picAssignments.area,
      task: picAssignments.task,
      createdAt: picAssignments.createdAt,
      employeeName: employees.name,
      employeePosition: employees.position,
    })
    .from(picAssignments)
    .innerJoin(employees, eq(employees.id, picAssignments.employeeId))
    .where(and(eq(picAssignments.employeeId, input.employeeId), eq(picAssignments.date, input.date), eq(picAssignments.area, input.area)))
    .limit(1);
  if (!rows[0]) throw new Error("Gagal assign PIC.");
  return mapPic(rows[0]);
}

/** Ringkasan dashboard jadwal untuk satu tanggal WIB. */
export async function getJadwalSummary(
  db: AppDb,
  dateIso?: string,
): Promise<JadwalSummary> {
  const date = dateIso ?? todayIsoDate();
  const [schedulesToday, picsToday, activeShifts] = await Promise.all([
    listSchedulesByDate(db, date),
    listPicsByDate(db, date),
    listShifts(db),
  ]);

  const totalScheduled = schedulesToday.length;
  const shiftCounts: ShiftCount[] = activeShifts.map((shift) => ({
    key: shift.key,
    label: shift.label,
    time: shift.time,
    count: schedulesToday.filter(
      (s) =>
        s.shift === shift.key &&
        s.status !== "tidak_hadir" &&
        s.status !== "libur",
    ).length,
  }));
  const absent = schedulesToday.filter(
    (s) => s.status === "tidak_hadir",
  ).length;

  return {
    totalScheduled,
    shiftCounts,
    absent,
    picsToday,
    schedulesToday,
  };
}

/** Response lengkap: summary + list + shift aktif untuk satu tanggal. */
export async function listJadwal(
  db: AppDb,
  dateIso?: string,
): Promise<JadwalListResponse> {
  const date = dateIso ?? todayIsoDate();
  const [summary, shifts] = await Promise.all([
    getJadwalSummary(db, date),
    listShifts(db),
  ]);
  return { date, summary, shifts };
}
