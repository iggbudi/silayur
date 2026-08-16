/**
 * Seed data demo untuk menguji fitur yang SUDAH ADA secara lokal (PostgreSQL).
 *
 * Menambahkan data transaksi & operasional contoh (penjualan tiket, pemasukan
 * non-tiket, pengeluaran, rekap kas shift, komplain + riwayat, status fasilitas,
 * checklist operasional, jadwal shift karyawan, PIC per area, dan hari libur)
 * dengan pola idempotent `ON CONFLICT ... DO NOTHING` — hanya menambah, tidak
 * menimpa data operasional. User demo (CS/supervisor/petugas lapangan) juga
 * dibuat idempotent dengan password default demo.
 *
 * ✅ Aman: MENOLAK database non-lokal (host selain localhost/127.0.0.1)
 *    kecuali di-force lewat env `DIGITAMA_DEMO_ALLOW_REMOTE=1`
 *    (perlu otorisasi owner).
 *
 * Penggunaan:
 *   $env:DATABASE_URL='postgres://...@127.0.0.1:5432/silayur'
 *   node scripts/db-migrate.mjs
 *   node scripts/db-seed.mjs
 *   node scripts/db-seed-demo.mjs
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import demoData from "../db/demo-data.json" with { type: "json" };
import { hashPassword } from "../shared/password.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JAKARTA_TIME_ZONE = "Asia/Jakarta";

/**
 * User demo tambahan agar alur komplain/operasional realistis
 * (CS melaporkan, supervisor menugaskan, petugas lapangan memproses).
 * Idempotent; password default demo (lihat DIGITAMA_SEED_DEFAULT_PASSWORD).
 */
const DEMO_USERS = [
  { id: "dewi-cs", name: "Dewi Customer Service", username: "dewi.cs", role: "customer_service" },
  { id: "ratna-supervisor", name: "Ratna Supervisor", username: "ratna.supervisor", role: "supervisor" },
  { id: "agus-lapangan", name: "Agus Lapangan", username: "agus.lapangan", role: "field_officer" },
];

async function loadDotEnv() {
  try {
    const raw = await readFile(path.join(root, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Jangan override env yang sudah eksplisit.
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Optional local configuration.
  }
}

function resolveUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

/** Apakah host DB menunjuk mesin lokal (localhost/127.0.0.1)? */
function isLocalHost(url) {
  return /localhost|127\.0\.0\.1|::1/i.test(url);
}

/** Tanggal kalender WIB (YYYY-MM-DD), offset hari dari hari ini. */
function dateWithOffset(offsetDays) {
  const out = new Date();
  out.setUTCDate(out.getUTCDate() + offsetDays);
  const dateIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(out);
  return { dateIso, utcToday: out };
}

/**
 * Mengonversi tanggal WIB + jam WIB (HH:MM) menjadi ISO UTC.
 * Hari kalender WIB dimulai 7 jam lebih awal dari UTC.
 */
function wibToIso(dateIso, timeWib) {
  const [hh, mm] = timeWib.split(":").map(Number);
  const utc = new Date(`${dateIso}T00:00:00.000Z`);
  utc.setUTCHours(utc.getUTCHours() - 7 + hh, mm, 0, 0);
  return utc.toISOString();
}

/** Hari kalender WIB untuk sebuah offset (mis. digunakan receipt prefix & counter). */
function localDayForOffset(offsetDays) {
  const { dateIso } = dateWithOffset(offsetDays);
  return dateIso;
}

function pad4(n) {
  return String(n).padStart(4, "0");
}

/** Menghitung total penjualan dari item demo (snapshot harga eksplisit). */
function pricedSale(sale) {
  let totalQuantity = 0;
  let totalAmount = 0;
  const items = sale.items.map((item) => {
    const subtotal = item.unitPrice * item.quantity;
    totalQuantity += item.quantity;
    totalAmount += subtotal;
    return {
      ticketProductId: item.ticketProductId,
      productName: item.productName,
      visitorCategory: item.visitorCategory,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal,
    };
  });
  return { items, totalQuantity, totalAmount };
}

async function main() {
  await loadDotEnv();
  const url = resolveUrl();
  if (!url) throw new Error("DATABASE_URL is required (postgres://...).");

  const isLocal = isLocalHost(url);
  if (!isLocal) {
    const allow = process.env.DIGITAMA_DEMO_ALLOW_REMOTE?.trim() === "1";
    if (!allow) {
      throw new Error(
        "Menolak men-seed data demo ke database non-lokal (" + url + ").\n" +
          "Demo hanya boleh masuk ke database lokal (localhost/127.0.0.1). " +
          "Untuk non-lokal, set DIGITAMA_DEMO_ALLOW_REMOTE=1 hanya dengan otorisasi owner.",
      );
    }
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  await client.query(`SELECT COUNT(*) AS c FROM sales`);

  try {
    await client.query("BEGIN");
    await seedDemoUsers(client);
    await seedSales(client);
    await seedReceiptCounters(client);
    await seedRevenues(client);
    await seedExpenses(client);
    await seedCashSessions(client);
    await seedComplaints(client);
    await seedFacilityStatus(client);
    await seedOperationsChecklist(client);
    await seedScheduleShifts(client);
    await seedPicAssignments(client);
    await seedHolidays(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  const counts = {};
  for (const table of ["sales", "sale_items", "revenue_entries", "expenses", "cash_sessions", "complaints", "complaint_history", "facility_status", "operations_checklist", "schedule_shifts", "pic_assignments", "holidays"]) {
    const r = await client.query(`SELECT COUNT(*) AS c FROM ${table}`);
    counts[table] = Number(r.rows[0].c);
  }
  await client.end();

  console.log(JSON.stringify({ ok: true, action: "seed-demo", counts }, null, 2));
}

async function seedSales(client) {
  let id = 0;
  for (const sale of demoData.sales) {
    const { items, totalQuantity, totalAmount } = pricedSale(sale);
    const { dateIso } = dateWithOffset(sale.dayOffset);
    const soldAt = wibToIso(dateIso, sale.timeWib);
    const receiptNumber = `RCP-${dateIso.replace(/-/g, "")}-${pad4(sale.seq)}`;

    await client.query(
      `INSERT INTO sales
        (id, receipt_number, sold_by, sold_at, visit_date, total_amount,
         total_quantity, status, notes, void_reason, void_requested_at,
         void_requested_by, voided_at, voided_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT(id) DO NOTHING`,
      [
        sale.id,
        receiptNumber,
        sale.soldBy,
        soldAt,
        dateIso,
        totalAmount,
        totalQuantity,
        sale.status,
        sale.notes ?? "",
        sale.voidReason ?? "",
        sale.status === "void_pending" ? new Date().toISOString() : null,
        sale.status === "void_pending" ? sale.soldBy : null,
        sale.status === "voided" ? new Date().toISOString() : null,
        sale.status === "voided" ? "manajer-operasional" : null,
      ],
    );

    for (const item of items) {
      const saleItemId = `${sale.id}-item-${id++}`;
      await client.query(
        `INSERT INTO sale_items
          (id, sale_id, ticket_product_id, product_name, visitor_category,
           unit_price, quantity, subtotal)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT(id) DO NOTHING`,
        [
          saleItemId,
          sale.id,
          item.ticketProductId,
          item.productName,
          item.visitorCategory,
          item.unitPrice,
          item.quantity,
          item.subtotal,
        ],
      );
    }
  }
}

async function seedReceiptCounters(client) {
  // Atur counter per hari = seq terbesar yang di-seed, agar transaksi baru di
  // loket melanjutkan nomor receipt (tidak bentrok dengan nomor demo).
  const byDay = {};
  for (const sale of demoData.sales) {
    const dateIso = localDayForOffset(sale.dayOffset);
    byDay[dateIso] = Math.max(byDay[dateIso] ?? 0, sale.seq);
  }
  for (const [dateIso, seq] of Object.entries(byDay)) {
    await client.query(
      `INSERT INTO receipt_counters (counter_date, seq)
        VALUES ($1, $2)
        ON CONFLICT(counter_date) DO UPDATE SET seq = GREATEST(receipt_counters.seq, EXCLUDED.seq)`,
      [dateIso, seq],
    );
  }
}

async function seedRevenues(client) {
  for (const rev of demoData.revenues) {
    const { dateIso } = dateWithOffset(rev.dayOffset);
    const recordedAt = wibToIso(dateIso, rev.timeWib);
    await client.query(
      `INSERT INTO revenue_entries
        (id, source_key, source_name, amount, note, entry_date, recorded_by, recorded_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT(id) DO NOTHING`,
      [
        rev.id,
        rev.sourceKey,
        rev.sourceName,
        rev.amount,
        rev.note ?? "",
        dateIso,
        rev.recordedBy,
        recordedAt,
      ],
    );
  }
}

async function seedExpenses(client) {
  for (const exp of demoData.expenses) {
    const { dateIso } = dateWithOffset(exp.dayOffset);
    const recordedAt = wibToIso(dateIso, exp.timeWib);
    await client.query(
      `INSERT INTO expenses
        (id, description, amount, note, entry_date, recorded_by, recorded_at,
         status, approved_by, approved_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT(id) DO NOTHING`,
      [
        exp.id,
        exp.description,
        exp.amount,
        exp.note ?? "",
        dateIso,
        exp.recordedBy,
        recordedAt,
        exp.status,
        exp.approvedBy ?? null,
        exp.approvedBy ? recordedAt : null,
      ],
    );
  }
}

async function seedCashSessions(client) {
  for (const cs of demoData.cashSessions) {
    const { dateIso } = dateWithOffset(cs.dayOffset);
    const openedAt = wibToIso(dateIso, cs.openedWib);
    const closedAt = cs.closedWib ? wibToIso(dateIso, cs.closedWib) : null;
    await client.query(
      `INSERT INTO cash_sessions
        (id, opened_by, opened_at, closed_by, closed_at, declared_cash,
         system_cash, difference, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT(id) DO NOTHING`,
      [
        cs.id,
        cs.openedBy,
        openedAt,
        cs.closedBy ?? null,
        closedAt,
        cs.declaredCash ?? null,
        cs.systemCash ?? null,
        cs.difference ?? null,
        cs.status,
      ],
    );
  }
}

async function seedDemoUsers(client) {
  const defaultPassword =
    process.env.DIGITAMA_SEED_DEFAULT_PASSWORD?.trim() || "silayur-demo";
  const passwordHash = await hashPassword(defaultPassword);
  for (const user of DEMO_USERS) {
    await client.query(
      `INSERT INTO users
        (id, name, username, role_key, active, password_hash, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, now(), now())
        ON CONFLICT(id) DO NOTHING`,
      [user.id, user.name, user.username, user.role, true, passwordHash],
    );
  }
}

async function seedComplaints(client) {
  for (const complaint of demoData.complaints) {
    const { dateIso } = dateWithOffset(complaint.dayOffset);
    const reportedAt = wibToIso(dateIso, complaint.timeWib);
    const last = complaint.history[complaint.history.length - 1];
    await client.query(
      `INSERT INTO complaints
        (id, title, description, category, status, priority, date,
         reported_by, reported_at, updated_by, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT(id) DO NOTHING`,
      [
        complaint.id,
        complaint.title,
        complaint.description ?? "",
        complaint.category ?? "",
        complaint.status,
        complaint.priority,
        dateIso,
        complaint.reportedBy,
        reportedAt,
        last.changedBy,
        wibToIso(dateIso, last.timeWib),
      ],
    );

    for (let index = 0; index < complaint.history.length; index += 1) {
      const entry = complaint.history[index];
      await client.query(
        `INSERT INTO complaint_history
          (id, complaint_id, from_status, to_status, changed_by, changed_at, note)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT(id) DO NOTHING`,
        [
          `${complaint.id}-h${index}`,
          complaint.id,
          entry.fromStatus,
          entry.toStatus,
          entry.changedBy,
          wibToIso(dateIso, entry.timeWib),
          entry.note ?? "",
        ],
      );
    }
  }
}

async function seedFacilityStatus(client) {
  for (const record of demoData.facilityStatus) {
    const { dateIso } = dateWithOffset(record.dayOffset);
    await client.query(
      `INSERT INTO facility_status
        (id, facility_id, date, status, note, recorded_by, recorded_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT(id) DO NOTHING`,
      [
        record.id,
        record.facilityId,
        dateIso,
        record.status,
        record.note ?? "",
        record.recordedBy,
        wibToIso(dateIso, record.timeWib),
      ],
    );
  }
}

async function seedOperationsChecklist(client) {
  for (const item of demoData.operationsChecklist) {
    const { dateIso } = dateWithOffset(item.dayOffset);
    await client.query(
      `INSERT INTO operations_checklist
        (id, checklist_id, date, done, note, recorded_by, recorded_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT(id) DO NOTHING`,
      [
        item.id,
        item.checklistId,
        dateIso,
        item.done,
        item.note ?? "",
        item.recordedBy,
        wibToIso(dateIso, item.timeWib),
      ],
    );
  }
}

async function seedScheduleShifts(client) {
  for (const shift of demoData.scheduleShifts) {
    const { dateIso } = dateWithOffset(shift.dayOffset);
    await client.query(
      `INSERT INTO schedule_shifts
        (id, employee_id, date, shift, status, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT(id) DO NOTHING`,
      [shift.id, shift.employeeId, dateIso, shift.shift, shift.status, shift.notes ?? ""],
    );
  }
}

async function seedPicAssignments(client) {
  for (const pic of demoData.picAssignments) {
    const { dateIso } = dateWithOffset(pic.dayOffset);
    await client.query(
      `INSERT INTO pic_assignments
        (id, employee_id, date, area, task)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT(id) DO NOTHING`,
      [pic.id, pic.employeeId, dateIso, pic.area, pic.task ?? ""],
    );
  }
}

async function seedHolidays(client) {
  for (const holiday of demoData.holidays) {
    const { dateIso } = dateWithOffset(holiday.dayOffset);
    // Kolom `date` unik → konflik dicegah via kolom date, bukan id.
    await client.query(
      `INSERT INTO holidays (id, date, name, created_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (date) DO NOTHING`,
      [holiday.id, dateIso, holiday.name, "admin-resepsionis"],
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
