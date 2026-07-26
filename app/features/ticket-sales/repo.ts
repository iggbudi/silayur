/**
 * Server-side data access untuk transaksi penjualan tiket.
 *
 * Atomic: createSale() gunakan db.transaction() untuk insert sale + sale_items.
 * Snapshot: harga & nama produk di-snapshot di sale_items agar history stabil.
 */

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { saleItems, sales, users, ticketProducts, ticketPrices } from "../../../db/schema";
import type { AppDb } from "../../../db/get-db";
import type { TicketDayType, TicketProduct } from "../../../shared/config";
import type { PricedItem, Sale, SaleInput, SaleInputItem } from "./types";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function isWeekend(dateIso: string): boolean {
  const d = new Date(`${dateIso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return false;
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function dayTypeFor(dateIso: string): TicketDayType {
  return isWeekend(dateIso) ? "weekend" : "weekday";
}

function findEffectivePrice(
  db: AppDb,
  productId: string,
  dateIso: string,
  dayType: TicketDayType,
): Promise<number | null> {
  return db
    .select({ price: ticketPrices.price })
    .from(ticketPrices)
    .where(
      and(
        eq(ticketPrices.ticketProductId, productId),
        eq(ticketPrices.dayType, dayType),
        eq(ticketPrices.active, true),
        lte(ticketPrices.validFrom, dateIso),
        sql`(${ticketPrices.validUntil} IS NULL OR ${ticketPrices.validUntil} >= ${dateIso})`,
      ),
    )
    .orderBy(desc(ticketPrices.validFrom))
    .limit(1)
    .then((rows) => (rows[0] ? Number(rows[0].price) : null));
}

export async function priceSale(
  db: AppDb,
  items: SaleInputItem[],
  visitDate: string,
): Promise<{ priced: PricedItem[]; totalAmount: number; totalQuantity: number }> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Minimal satu item tiket wajib diisi.");
  }
  const dayType = dayTypeFor(visitDate);
  const priced: PricedItem[] = [];
  let totalAmount = 0;
  let totalQuantity = 0;

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!Number.isSafeInteger(qty) || qty <= 0) {
      throw new Error(`Quantity tidak valid: ${item.ticketProductId}`);
    }
    const productRows = await db
      .select()
      .from(ticketProducts)
      .where(eq(ticketProducts.id, item.ticketProductId))
      .limit(1);
    const productRow = productRows[0];
    if (!productRow) {
      throw new Error(`Produk tiket tidak ditemukan: ${item.ticketProductId}`);
    }
    if (!productRow.active) {
      throw new Error(`Produk tiket nonaktif: ${productRow.name}`);
    }
    const product: TicketProduct = {
      id: productRow.id,
      code: productRow.code,
      name: productRow.name,
      visitorCategory: productRow.visitorCategory,
      validityMode: productRow.validityMode,
      description: productRow.description,
      active: Boolean(productRow.active),
      prices: [], // prices tidak dipakai di priceSale — hanya untuk return type compatibility
    };
    const unitPrice = await findEffectivePrice(
      db,
      product.id,
      visitDate,
      dayType,
    );
    if (unitPrice === null) {
      throw new Error(
        `Tarif ${dayType} untuk ${product.name} belum dikonfigurasi.`,
      );
    }
    const subtotal = unitPrice * qty;
    priced.push({ product, unitPrice, quantity: qty, subtotal });
    totalAmount += subtotal;
    totalQuantity += qty;
  }
  return { priced, totalAmount, totalQuantity };
}

function todayReceiptPrefix(): string {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function makeReceiptNumber(seq: number): string {
  return `RCP-${todayReceiptPrefix()}-${String(seq).padStart(4, "0")}`;
}

async function nextReceiptSequence(db: AppDb): Promise<number> {
  const todayPrefix = todayReceiptPrefix();
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(sales)
    .where(sql`${sales.receiptNumber} LIKE ${`RCP-${todayPrefix}-%`}`);
  const count = Number(rows[0]?.count ?? 0);
  return count + 1;
}

export async function createSale(
  db: AppDb,
  input: SaleInput,
  actorUserId: string,
  visitDate?: string,
): Promise<Sale> {
  if (!actorUserId) {
    throw new Error("User tidak valid.");
  }
  const visit = visitDate ?? new Date().toISOString().slice(0, 10);
  const { priced, totalAmount, totalQuantity } = await priceSale(
    db,
    input.items,
    visit,
  );

  return db.transaction(async (tx) => {
    const txDb = tx as unknown as AppDb;
    const seq = await nextReceiptSequence(txDb);
    const saleId = newId("sale");
    const receiptNumber = makeReceiptNumber(seq);
    const now = new Date().toISOString();

    await txDb.insert(sales).values({
      id: saleId,
      receiptNumber,
      soldBy: actorUserId,
      soldAt: now,
      visitDate: visit,
      totalAmount,
      totalQuantity,
      status: "completed",
      notes: input.notes ?? "",
    });

    for (const item of priced) {
      await txDb.insert(saleItems).values({
        id: newId("saleitem"),
        saleId,
        ticketProductId: item.product.id,
        productName: item.product.name,
        visitorCategory: item.product.visitorCategory,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
      });
    }

    return loadSaleById(txDb, saleId);
  });
}

export async function loadSaleById(
  db: AppDb,
  saleId: string,
): Promise<Sale> {
  const saleRows = await db
    .select({
      sale: sales,
      soldByName: users.name,
    })
    .from(sales)
    .innerJoin(users, eq(users.id, sales.soldBy))
    .where(eq(sales.id, saleId))
    .limit(1);
  const row = saleRows[0];
  if (!row) throw new Error(`Transaksi tidak ditemukan: ${saleId}`);
  const items = await db
    .select()
    .from(saleItems)
    .where(eq(saleItems.saleId, saleId));
  return {
    id: row.sale.id,
    receiptNumber: row.sale.receiptNumber,
    soldBy: row.sale.soldBy,
    soldByName: row.soldByName,
    soldAt: row.sale.soldAt,
    visitDate: row.sale.visitDate,
    totalAmount: row.sale.totalAmount,
    totalQuantity: row.sale.totalQuantity,
    status: row.sale.status,
    notes: row.sale.notes,
    items: items.map((i) => ({
      id: i.id,
      saleId: i.saleId,
      ticketProductId: i.ticketProductId,
      productName: i.productName,
      visitorCategory: i.visitorCategory,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      subtotal: i.subtotal,
    })),
  };
}

export async function listSalesByDate(
  db: AppDb,
  dateIso: string,
): Promise<Sale[]> {
  const rows = await db
    .select({ sale: sales, soldByName: users.name })
    .from(sales)
    .innerJoin(users, eq(users.id, sales.soldBy))
    .where(
      and(
        gte(sales.soldAt, `${dateIso}T00:00:00.000Z`),
        lte(sales.soldAt, `${dateIso}T23:59:59.999Z`),
      ),
    )
    .orderBy(desc(sales.soldAt));

  if (rows.length === 0) return [];

  const saleIds = rows.map((r) => r.sale.id);
  const items = await db
    .select()
    .from(saleItems)
    .where(
      sql`${saleItems.saleId} IN (${sql.join(saleIds.map((id) => sql`${id}`), sql`, `)})`,
    );

  const itemsBySale = new Map<string, typeof items>();
  for (const item of items) {
    if (!itemsBySale.has(item.saleId)) itemsBySale.set(item.saleId, []);
    itemsBySale.get(item.saleId)!.push(item);
  }

  return rows.map((r) => ({
    id: r.sale.id,
    receiptNumber: r.sale.receiptNumber,
    soldBy: r.sale.soldBy,
    soldByName: r.soldByName,
    soldAt: r.sale.soldAt,
    visitDate: r.sale.visitDate,
    totalAmount: r.sale.totalAmount,
    totalQuantity: r.sale.totalQuantity,
    status: r.sale.status,
    notes: r.sale.notes,
    items: (itemsBySale.get(r.sale.id) ?? []).map((i) => ({
      id: i.id,
      saleId: i.saleId,
      ticketProductId: i.ticketProductId,
      productName: i.productName,
      visitorCategory: i.visitorCategory,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      subtotal: i.subtotal,
    })),
  }));
}

export async function todaySummary(
  db: AppDb,
  dateIso?: string,
): Promise<{ date: string; count: number; revenue: number }> {
  const date = dateIso ?? new Date().toISOString().slice(0, 10);
  const rows = await db
    .select({
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(${sales.totalAmount}), 0)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.status, "completed"),
        gte(sales.soldAt, `${date}T00:00:00.000Z`),
        lte(sales.soldAt, `${date}T23:59:59.999Z`),
      ),
    );
  return {
    date,
    count: Number(rows[0]?.count ?? 0),
    revenue: Number(rows[0]?.revenue ?? 0),
  };
}

