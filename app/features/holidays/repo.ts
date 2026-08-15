/**
 * Data access kalender hari libur (modul tarif).
 * Satu baris per tanggal WIB di tabel `holidays`.
 */

import { desc, eq } from "drizzle-orm";
import type { AppDb } from "../../../db/get-db";
import { holidays } from "../../../db/schema";
import { isValidDateIso } from "../../../shared/date";
import type { Holiday, HolidayInput } from "./types";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function mapHoliday(row: typeof holidays.$inferSelect): Holiday {
  return {
    id: row.id,
    date: row.date,
    name: row.name,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

/** Daftar semua hari libur, terurut tanggal terbaru dulu. */
export async function listHolidays(db: AppDb): Promise<Holiday[]> {
  const rows = await db.select().from(holidays).orderBy(desc(holidays.date));
  return rows.map(mapHoliday);
}

/** Hanya tanggal-tanggal libur (format YYYY-MM-DD), untuk penentuan tarif. */
export async function listHolidayDates(db: AppDb): Promise<string[]> {
  const rows = await db
    .select({ date: holidays.date })
    .from(holidays)
    .orderBy(holidays.date);
  return rows.map((row) => row.date);
}

/** Tambah hari libur (idempotent per tanggal: update nama bila sudah ada). */
export async function upsertHoliday(
  db: AppDb,
  input: HolidayInput,
  actorId: string,
): Promise<Holiday> {
  const date = input.date.trim();
  if (!isValidDateIso(date)) {
    throw new Error("Tanggal libur tidak valid.");
  }
  const name = (input.name ?? "").trim();

  await db
    .insert(holidays)
    .values({ id: newId("hol"), date, name, createdBy: actorId })
    .onConflictDoUpdate({
      target: holidays.date,
      set: { name, createdBy: actorId },
    });

  const rows = await db.select().from(holidays).where(eq(holidays.date, date));
  const row = rows[0];
  if (!row) throw new Error("Gagal menyimpan hari libur.");
  return mapHoliday(row);
}

/** Hapus hari libur berdasarkan tanggal. */
export async function deleteHoliday(db: AppDb, date: string): Promise<void> {
  if (!isValidDateIso(date.trim())) {
    throw new Error("Tanggal libur tidak valid.");
  }
  await db.delete(holidays).where(eq(holidays.date, date.trim()));
}
