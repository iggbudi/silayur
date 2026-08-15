/**
 * Data access modul Fasilitas.
 * Sumber fasilitas: config_items section `facilities` (active).
 * Status per fasilitas per hari WIB di `facility_status` (upsert).
 */

import { and, desc, eq } from "drizzle-orm";
import type { AppDb } from "../../../db/get-db";
import { configItems, facilityStatus, users } from "../../../db/schema";
import { todayIsoDate } from "../../../shared/date";
import type {
  FacilityStatusInput,
  FacilityStatusRow,
  FacilityStatusSummary,
  FacilityStatusValue,
  FacilityWithStatus,
} from "./types";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

const STATUS_VALUES: FacilityStatusValue[] = [
  "operational",
  "needs_attention",
  "closed",
];

function mapFacilityStatus(row: {
  status: typeof facilityStatus.$inferSelect;
  recordedByName: string | null;
}): FacilityStatusRow {
  return {
    id: row.status.id,
    facilityId: row.status.facilityId,
    date: row.status.date,
    status: row.status.status as FacilityStatusValue,
    note: row.status.note,
    recordedBy: row.status.recordedBy,
    recordedByName: row.recordedByName ?? undefined,
    recordedAt: row.status.recordedAt,
  };
}

async function loadStatusByFacilityAndDate(
  db: AppDb,
  facilityId: string,
  date: string,
): Promise<FacilityStatusRow | null> {
  const rows = await db
    .select({
      status: facilityStatus,
      recordedByName: users.name,
    })
    .from(facilityStatus)
    .leftJoin(users, eq(users.id, facilityStatus.recordedBy))
    .where(
      and(
        eq(facilityStatus.facilityId, facilityId),
        eq(facilityStatus.date, date),
      ),
    )
    .limit(1);
  return rows[0] ? mapFacilityStatus(rows[0]) : null;
}

/** Catat/ubah status fasilitas untuk satu tanggal (upsert per hari). */
export async function upsertFacilityStatus(
  db: AppDb,
  input: FacilityStatusInput,
  actorId: string,
  dateIso?: string,
): Promise<FacilityStatusRow> {
  const facilityId = input.facilityId.trim();
  const status = input.status;
  if (!facilityId) throw new Error("Fasilitas wajib diisi.");
  if (!STATUS_VALUES.includes(status)) {
    throw new Error("Status fasilitas tidak valid.");
  }

  const facility = await db
    .select({ id: configItems.id, active: configItems.active })
    .from(configItems)
    .where(and(eq(configItems.id, facilityId), eq(configItems.section, "facilities")))
    .limit(1);
  const row = facility[0];
  if (!row) throw new Error(`Fasilitas tidak ditemukan: ${facilityId}`);
  if (!row.active) throw new Error("Fasilitas nonaktif.");

  const date = dateIso ?? todayIsoDate();
  const existing = await loadStatusByFacilityAndDate(db, facilityId, date);
  const now = new Date().toISOString();
  const note = (input.note ?? "").trim();

  if (existing) {
    await db
      .update(facilityStatus)
      .set({ status, note, recordedBy: actorId, recordedAt: now })
      .where(eq(facilityStatus.id, existing.id));
    return loadStatusByFacilityAndDate(db, facilityId, date).then(
      (updated) => updated ?? existing,
    );
  }

  const id = newId("fst");
  await db.insert(facilityStatus).values({
    id,
    facilityId,
    date,
    status,
    note,
    recordedBy: actorId,
    recordedAt: now,
  });
  return loadStatusByFacilityAndDate(db, facilityId, date).then(
    (created) => created ?? { id, facilityId, date, status, note, recordedBy: actorId, recordedAt: now },
  );
}

/** Fasilitas aktif (config) + status hari ini (default operational). */
export async function listFacilitiesWithStatus(
  db: AppDb,
  dateIso?: string,
): Promise<FacilityWithStatus[]> {
  const date = dateIso ?? todayIsoDate();
  const [facilities, statusRows] = await Promise.all([
    db
      .select({
        id: configItems.id,
        name: configItems.name,
        detail: configItems.detail,
      })
      .from(configItems)
      .where(and(eq(configItems.section, "facilities"), eq(configItems.active, true)))
      .orderBy(configItems.sortOrder),
    db
      .select({
        status: facilityStatus,
        recordedByName: users.name,
      })
      .from(facilityStatus)
      .leftJoin(users, eq(users.id, facilityStatus.recordedBy))
      .where(eq(facilityStatus.date, date)),
  ]);

  const statusByFacility = new Map<string, FacilityStatusRow>();
  for (const row of statusRows) {
    const mapped = mapFacilityStatus(row);
    statusByFacility.set(mapped.facilityId, mapped);
  }

  return facilities.map((facility) => {
    const record = statusByFacility.get(facility.id);
    return {
      id: facility.id,
      name: facility.name,
      detail: facility.detail,
      status: record?.status ?? "operational",
      recordedAt: record?.recordedAt ?? null,
    };
  });
}

/** Ringkasan status fasilitas hari ini (dashboard & halaman). */
export async function facilityStatusSummary(
  db: AppDb,
  dateIso?: string,
): Promise<FacilityStatusSummary> {
  const facilities = await listFacilitiesWithStatus(db, dateIso);
  const counts = {
    operational: 0,
    needsAttention: 0,
    closed: 0,
  };
  let updatedAt: string | null = null;
  for (const facility of facilities) {
    if (facility.status === "operational") counts.operational += 1;
    else if (facility.status === "needs_attention") counts.needsAttention += 1;
    else counts.closed += 1;
    if (facility.recordedAt && (!updatedAt || facility.recordedAt > updatedAt)) {
      updatedAt = facility.recordedAt;
    }
  }
  return { facilities, counts, updatedAt };
}

/**
 * Riwayat status fasilitas lintas hari (terbaru dulu).
 * Join nama fasilitas dari config_items agar tampilan mudah dibaca.
 */
export async function listFacilityStatusHistory(
  db: AppDb,
  limit = 50,
): Promise<Array<FacilityStatusRow & { facilityName: string }>> {
  const rows = await db
    .select({
      status: facilityStatus,
      recordedByName: users.name,
      facilityName: configItems.name,
    })
    .from(facilityStatus)
    .innerJoin(users, eq(users.id, facilityStatus.recordedBy))
    .innerJoin(configItems, eq(configItems.id, facilityStatus.facilityId))
    .orderBy(desc(facilityStatus.date), desc(facilityStatus.recordedAt))
    .limit(limit);
  return rows.map((row) => ({
    ...mapFacilityStatus(row),
    facilityName: row.facilityName,
  }));
}
