/**
 * Data access modul Komplain (pilot dead-link slice).
 * Transisi status: open → assigned → processing → resolved (atau reopened).
 * `date` = tanggal kalender WIB untuk pengelompokan harian.
 */

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { AppDb } from "../../../db/get-db";
import { complaints, users } from "../../../db/schema";
import { todayIsoDate } from "../../../shared/date";
import type {
  Complaint,
  ComplaintInput,
  ComplaintList,
  ComplaintPriority,
  ComplaintStatus,
} from "./types";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** Status yang dihitung sebagai "terbuka" (belum selesai). */
const OPEN_STATUSES: ComplaintStatus[] = ["open", "assigned", "processing", "reopened"];

/** Transisi status yang diizinkan (dari → ke). */
const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  open: ["assigned", "processing", "resolved", "reopened"],
  assigned: ["processing", "resolved", "reopened"],
  processing: ["resolved", "reopened"],
  resolved: ["reopened"],
  reopened: ["assigned", "processing", "resolved"],
};

function mapComplaint(row: {
  complaint: typeof complaints.$inferSelect;
  reportedByName: string | null;
  updatedByName: string | null;
}): Complaint {
  return {
    id: row.complaint.id,
    title: row.complaint.title,
    description: row.complaint.description,
    category: row.complaint.category,
    status: row.complaint.status as ComplaintStatus,
    priority: row.complaint.priority as ComplaintPriority,
    date: row.complaint.date,
    reportedBy: row.complaint.reportedBy,
    reportedByName: row.reportedByName ?? undefined,
    reportedAt: row.complaint.reportedAt,
    updatedBy: row.complaint.updatedBy,
    updatedByName: row.updatedByName ?? undefined,
    updatedAt: row.complaint.updatedAt,
  };
}

async function loadComplaintById(db: AppDb, id: string): Promise<Complaint> {
  const rows = await db
    .select({
      complaint: complaints,
      reportedByName: users.name,
      updatedByName: sql<string | null>`${users.name}`,
    })
    .from(complaints)
    .leftJoin(users, eq(users.id, complaints.reportedBy))
    .where(eq(complaints.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error(`Komplain tidak ditemukan: ${id}`);
  return mapComplaint(row);
}

/** Buat komplain baru berstatus `open`. */
export async function createComplaint(
  db: AppDb,
  input: ComplaintInput,
  actorId: string,
  dateIso?: string,
): Promise<Complaint> {
  const title = input.title.trim();
  if (!title) throw new Error("Judul komplain wajib diisi.");
  if (title.length < 3) throw new Error("Judul komplain terlalu pendek.");

  const priority: ComplaintPriority = input.priority ?? "medium";
  if (!["low", "medium", "high"].includes(priority)) {
    throw new Error("Prioritas komplain tidak valid.");
  }

  const now = new Date().toISOString();
  const id = newId("cmp");
  await db.insert(complaints).values({
    id,
    title,
    description: (input.description ?? "").trim(),
    category: (input.category ?? "").trim(),
    status: "open",
    priority,
    date: dateIso ?? todayIsoDate(),
    reportedBy: actorId,
    reportedAt: now,
    updatedBy: actorId,
    updatedAt: now,
  });
  return loadComplaintById(db, id);
}

/** Daftar komplain pada satu tanggal kalender WIB, terbaru dulu. */
export async function listComplaintsByDate(
  db: AppDb,
  dateIso: string,
): Promise<Complaint[]> {
  const rows = await db
    .select({
      complaint: complaints,
      reportedByName: users.name,
      updatedByName: sql<string | null>`${users.name}`,
    })
    .from(complaints)
    .leftJoin(users, eq(users.id, complaints.reportedBy))
    .where(eq(complaints.date, dateIso))
    .orderBy(desc(complaints.reportedAt));
  return rows.map(mapComplaint);
}

/** Komplain terbaru lintas tanggal (untuk dashboard). */
export async function listRecentComplaints(
  db: AppDb,
  limit = 5,
): Promise<Complaint[]> {
  const rows = await db
    .select({
      complaint: complaints,
      reportedByName: users.name,
      updatedByName: sql<string | null>`${users.name}`,
    })
    .from(complaints)
    .leftJoin(users, eq(users.id, complaints.reportedBy))
    .orderBy(desc(complaints.reportedAt))
    .limit(limit);
  return rows.map(mapComplaint);
}

/** Jumlah komplain terbuka (belum resolved). */
export async function countOpenComplaints(
  db: AppDb,
): Promise<number> {
  const rows = await db
    .select({ value: sql`count(*)` })
    .from(complaints)
    .where(inArray(complaints.status, OPEN_STATUSES));
  return Number(rows[0]?.value ?? 0);
}

/** Daftar + jumlah terbuka untuk satu tanggal (halaman /komplain). */
export async function listComplaints(
  db: AppDb,
  dateIso?: string,
): Promise<ComplaintList> {
  const date = dateIso ?? todayIsoDate();
  const [complaintsList, openCount] = await Promise.all([
    listComplaintsByDate(db, date),
    countOpenComplaints(db),
  ]);
  return { complaints: complaintsList, openCount };
}

/** Ubah status komplain dengan validasi transisi. */
export async function updateComplaintStatus(
  db: AppDb,
  complaintId: string,
  status: ComplaintStatus,
  actorId: string,
): Promise<Complaint> {
  const current = await loadComplaintById(db, complaintId);
  const allowed = ALLOWED_TRANSITIONS[current.status];
  if (!allowed || !allowed.includes(status)) {
    throw new Error(
      `Transisi status tidak valid: ${current.status} → ${status}.`,
    );
  }
  const now = new Date().toISOString();
  await db
    .update(complaints)
    .set({ status, updatedBy: actorId, updatedAt: now })
    .where(and(eq(complaints.id, complaintId)));
  return loadComplaintById(db, complaintId);
}
