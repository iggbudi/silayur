/**
 * Seed data demo untuk menguji fitur yang SUDAH ADA secara lokal.
 *
 * Menambahkan data transaksi contoh (penjualan tiket, pemasukan non-tiket,
 * pengeluaran, dan rekap kas shift) dengan pola idempotent
 * `ON CONFLICT ... DO NOTHING` — hanya menambah, tidak menimpa data operasional.
 *
 * ✅ Aman: MENOLAK database remote (libsql:// / https://) kecuali di-force
 *    lewat env `SILAYUR_DEMO_ALLOW_REMOTE=1` (perlu otorisasi owner).
 *    Default: hanya berjalan pada database file lokal (file:).
 *
 * Penggunaan (DB lokal fresh):
 *   $env:TURSO_DATABASE_URL='file:./.data/silayur-demo.db'
 *   node scripts/db-migrate.mjs
 *   $env:SILAYUR_SEED_ADMIN_PASSWORD='...'; $env:SILAYUR_SEED_DEFAULT_PASSWORD='...'
 *   node scripts/db-seed.mjs
 *   node scripts/db-seed-demo.mjs
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import demoData from "../db/demo-data.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JAKARTA_TIME_ZONE = "Asia/Jakarta";

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
      // Jangan override env yang sudah eksplisit (mis. override lokal file:).
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Optional local configuration.
  }
}

function resolveUrl() {
  return process.env.TURSO_DATABASE_URL?.trim() || "file:./.data/demo-silayur.db";
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
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
  const isRemote = url.startsWith("libsql://") || url.startsWith("https://");

  if (isRemote) {
    const allow = process.env.SILAYUR_DEMO_ALLOW_REMOTE?.trim() === "1";
    if (!allow) {
      throw new Error(
        "Menolak men-seed data demo ke database REMOTE (" + url + ").\n" +
          "Demo hanya boleh masuk ke database file lokal (file:). " +
          "Untuk remote, set SILAYUR_DEMO_ALLOW_REMOTE=1 hanya dengan otorisasi owner.",
      );
    }
  }

  const client = createClient({
    url: url.startsWith("file:")
      ? `file:${path.resolve(root, url.slice("file:".length))}`
      : url,
    authToken,
  });
  const mode = isRemote ? "remote" : "local-file";

  await client.execute(`SELECT COUNT(*) AS c FROM sales`);

  const tx = await client.transaction("write");
  try {
    await seedSales(tx);
    await seedReceiptCounters(tx);
    await seedRevenues(tx);
    await seedExpenses(tx);
    await seedCashSessions(tx);
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }

  const counts = {};
  for (const table of ["sales", "sale_items", "revenue_entries", "expenses", "cash_sessions"]) {
    const r = await client.execute(`SELECT COUNT(*) AS c FROM ${table}`);
    counts[table] = Number(r.rows[0].c);
  }
  client.close();

  console.log(JSON.stringify({ ok: true, action: "seed-demo", mode, counts }, null, 2));
}

async function seedSales(tx) {
  let id = 0;
  for (const sale of demoData.sales) {
    const { items, totalQuantity, totalAmount } = pricedSale(sale);
    const { dateIso } = dateWithOffset(sale.dayOffset);
    const soldAt = wibToIso(dateIso, sale.timeWib);
    const receiptNumber = `RCP-${dateIso.replace(/-/g, "")}-${pad4(sale.seq)}`;

    await tx.execute({
      sql: `INSERT INTO sales
        (id, receipt_number, sold_by, sold_at, visit_date, total_amount,
         total_quantity, status, notes, void_reason, void_requested_at,
         void_requested_by, voided_at, voided_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING`,
      args: [
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
    });

    for (const item of items) {
      const saleItemId = `${sale.id}-item-${id++}`;
      await tx.execute({
        sql: `INSERT INTO sale_items
          (id, sale_id, ticket_product_id, product_name, visitor_category,
           unit_price, quantity, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING`,
        args: [
          saleItemId,
          sale.id,
          item.ticketProductId,
          item.productName,
          item.visitorCategory,
          item.unitPrice,
          item.quantity,
          item.subtotal,
        ],
      });
    }
  }
}

async function seedReceiptCounters(tx) {
  // Atur counter per hari = seq terbesar yang di-seed, agar transaksi baru di
  // loket melanjutkan nomor receipt (tidak bentrok dengan nomor demo).
  const byDay = {};
  for (const sale of demoData.sales) {
    const dateIso = localDayForOffset(sale.dayOffset);
    byDay[dateIso] = Math.max(byDay[dateIso] ?? 0, sale.seq);
  }
  for (const [dateIso, seq] of Object.entries(byDay)) {
    await tx.execute({
      sql: `INSERT INTO receipt_counters (counter_date, seq)
            VALUES (?, ?)
            ON CONFLICT(counter_date) DO UPDATE SET seq = MAX(seq, excluded.seq)`,
      args: [dateIso, seq],
    });
  }
}

async function seedRevenues(tx) {
  for (const rev of demoData.revenues) {
    const { dateIso } = dateWithOffset(rev.dayOffset);
    const recordedAt = wibToIso(dateIso, rev.timeWib);
    await tx.execute({
      sql: `INSERT INTO revenue_entries
        (id, source_key, source_name, amount, note, entry_date, recorded_by, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING`,
      args: [
        rev.id,
        rev.sourceKey,
        rev.sourceName,
        rev.amount,
        rev.note ?? "",
        dateIso,
        rev.recordedBy,
        recordedAt,
      ],
    });
  }
}

async function seedExpenses(tx) {
  for (const exp of demoData.expenses) {
    const { dateIso } = dateWithOffset(exp.dayOffset);
    const recordedAt = wibToIso(dateIso, exp.timeWib);
    await tx.execute({
      sql: `INSERT INTO expenses
        (id, description, amount, note, entry_date, recorded_by, recorded_at,
         status, approved_by, approved_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING`,
      args: [
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
    });
  }
}

async function seedCashSessions(tx) {
  for (const cs of demoData.cashSessions) {
    const { dateIso } = dateWithOffset(cs.dayOffset);
    const openedAt = wibToIso(dateIso, cs.openedWib);
    const closedAt = cs.closedWib ? wibToIso(dateIso, cs.closedWib) : null;
    await tx.execute({
      sql: `INSERT INTO cash_sessions
        (id, opened_by, opened_at, closed_by, closed_at, declared_cash,
         system_cash, difference, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING`,
      args: [
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
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});