/**
 * Data access modul Operasional (checklist harian).
 * Sumber checklist: config_items section `hours` (active).
 * Status per item per hari WIB di `operations_checklist` (upsert).
 */

import { and, eq } from "drizzle-orm";
import type { AppDb } from "../../../db/get-db";
import { configItems, operationsChecklist, users } from "../../../db/schema";
import { todayIsoDate } from "../../../shared/date";
import type {
  OperatingHour,
  OperationsChecklistInput,
  OperationsChecklistItem,
  OperationsStatus,
} from "./types";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

type ChecklistStatusRow = Omit<
  OperationsChecklistItem,
  "name" | "detail"
>;

function mapChecklistItem(row: {
  item: typeof operationsChecklist.$inferSelect;
  recordedByName: string | null;
}): ChecklistStatusRow {
  return {
    id: row.item.id,
    checklistId: row.item.checklistId,
    done: Boolean(row.item.done),
    note: row.item.note,
    recordedBy: row.item.recordedBy,
    recordedByName: row.recordedByName ?? undefined,
    recordedAt: row.item.recordedAt,
  };
}

async function loadStatusByChecklistAndDate(
  db: AppDb,
  checklistId: string,
  date: string,
): Promise<ChecklistStatusRow | null> {
  const rows = await db
    .select({
      item: operationsChecklist,
      recordedByName: users.name,
    })
    .from(operationsChecklist)
    .leftJoin(users, eq(users.id, operationsChecklist.recordedBy))
    .where(
      and(
        eq(operationsChecklist.checklistId, checklistId),
        eq(operationsChecklist.date, date),
      ),
    )
    .limit(1);
  return rows[0] ? mapChecklistItem(rows[0]) : null;
}

/** Catat/ubah status satu checklist item untuk satu tanggal (upsert per hari). */
export async function upsertOperationsChecklist(
  db: AppDb,
  input: OperationsChecklistInput,
  actorId: string,
  dateIso?: string,
): Promise<OperationsChecklistItem> {
  const checklistId = input.checklistId.trim();
  if (!checklistId) throw new Error("Checklist wajib diisi.");

  const item = await db
    .select({
      id: configItems.id,
      name: configItems.name,
      detail: configItems.detail,
      active: configItems.active,
    })
    .from(configItems)
    .where(and(eq(configItems.id, checklistId), eq(configItems.section, "hours")))
    .limit(1);
  const row = item[0];
  if (!row) throw new Error(`Checklist tidak ditemukan: ${checklistId}`);
  if (!row.active) throw new Error("Checklist nonaktif.");

  const date = dateIso ?? todayIsoDate();
  const done = Boolean(input.done);
  const note = (input.note ?? "").trim();
  const now = new Date().toISOString();
  const existing = await loadStatusByChecklistAndDate(db, checklistId, date);

  if (existing) {
    await db
      .update(operationsChecklist)
      .set({ done, note, recordedBy: actorId, recordedAt: now })
      .where(eq(operationsChecklist.id, existing.id));
    return {
      ...(await loadStatusByChecklistAndDate(db, checklistId, date).then(
        (updated) => updated ?? existing,
      )),
      name: row.name,
      detail: row.detail,
    };
  }

  const id = newId("opc");
  await db.insert(operationsChecklist).values({
    id,
    checklistId,
    date,
    done,
    note,
    recordedBy: actorId,
    recordedAt: now,
  });
  return {
    ...(await loadStatusByChecklistAndDate(db, checklistId, date).then(
      (created) =>
        created ?? {
          id,
          checklistId,
          done,
          note,
          recordedBy: actorId,
          recordedAt: now,
        },
    )),
    name: row.name,
    detail: row.detail,
  };
}

/**
 * Item checklist aktif (config section `hours`) + statusnya pada satu tanggal.
 * Item yang belum dicatat dianggap `done: false`.
 */
export async function listOperationsChecklist(
  db: AppDb,
  dateIso?: string,
): Promise<OperationsChecklistItem[]> {
  const date = dateIso ?? todayIsoDate();
  const [items, statusRows] = await Promise.all([
    db
      .select({
        id: configItems.id,
        name: configItems.name,
        detail: configItems.detail,
      })
      .from(configItems)
      .where(and(eq(configItems.section, "hours"), eq(configItems.active, true)))
      .orderBy(configItems.sortOrder),
    db
      .select({
        item: operationsChecklist,
        recordedByName: users.name,
      })
      .from(operationsChecklist)
      .leftJoin(users, eq(users.id, operationsChecklist.recordedBy))
      .where(eq(operationsChecklist.date, date)),
  ]);

  const statusByChecklist = new Map<string, ChecklistStatusRow>();
  for (const row of statusRows) {
    const mapped = mapChecklistItem(row);
    statusByChecklist.set(mapped.checklistId, mapped);
  }

  return items.map((item) => {
    const record = statusByChecklist.get(item.id);
    return {
      id: item.id,
      checklistId: item.id,
      name: item.name,
      detail: item.detail,
      done: record?.done ?? false,
      note: record?.note ?? "",
      recordedBy: record?.recordedBy ?? "",
      recordedAt: record?.recordedAt ?? null,
    };
  });
}

/**
 * Jam buka taman aktif dari config_items section `operating-hours`
 * (Pengaturan → Jam buka taman).
 */
export async function listOperatingHours(
  db: AppDb,
): Promise<OperatingHour[]> {
  const rows = await db
    .select({
      id: configItems.id,
      name: configItems.name,
      time: configItems.detail,
    })
    .from(configItems)
    .where(
      and(
        eq(configItems.section, "operating-hours"),
        eq(configItems.active, true),
      ),
    )
    .orderBy(configItems.sortOrder);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    time: row.time,
  }));
}

/** Ringkasan checklist harian (dashboard & halaman). */
export async function operationsStatus(
  db: AppDb,
  dateIso?: string,
): Promise<OperationsStatus> {
  const [items, operatingHours] = await Promise.all([
    listOperationsChecklist(db, dateIso),
    listOperatingHours(db),
  ]);
  let doneCount = 0;
  let updatedAt: string | null = null;
  for (const item of items) {
    if (item.done) doneCount += 1;
    if (item.recordedAt && (!updatedAt || item.recordedAt > updatedAt)) {
      updatedAt = item.recordedAt;
    }
  }
  return {
    items,
    doneCount,
    totalCount: items.length,
    updatedAt,
    operatingHours,
  };
}
