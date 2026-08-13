import { eq } from "drizzle-orm";
import type {
  TicketDayType,
  TicketPrice,
  TicketProduct,
} from "../shared/config";
import type { AppDb } from "./get-db";
import { ticketPrices, ticketProducts } from "./schema";

export async function loadTicketProducts(db: AppDb): Promise<TicketProduct[]> {
  const [productRows, priceRows] = await Promise.all([
    db.select().from(ticketProducts),
    db.select().from(ticketPrices),
  ]);

  return productRows
    .map((product) => ({
      id: product.id,
      code: product.code,
      name: product.name,
      visitorCategory: product.visitorCategory,
      validityMode: product.validityMode,
      description: product.description,
      active: Boolean(product.active),
      prices: priceRows
        .filter((price) => price.ticketProductId === product.id)
        .map<TicketPrice>((price) => ({
          id: price.id,
          ticketProductId: price.ticketProductId,
          dayType: price.dayType,
          price: price.price,
          validFrom: price.validFrom,
          validUntil: price.validUntil,
          active: Boolean(price.active),
        }))
        .sort(
          (left, right) =>
            left.dayType.localeCompare(right.dayType) ||
            right.validFrom.localeCompare(left.validFrom),
        ),
    }))
    .sort((left, right) =>
      left.visitorCategory.localeCompare(right.visitorCategory),
    );
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function assertNoOverlappingTicketPrices(
  productName: string,
  prices: TicketPrice[],
): void {
  for (const dayType of ["weekday", "weekend"] satisfies TicketDayType[]) {
    const active = prices
      .filter((price) => price.active && price.dayType === dayType)
      .sort((left, right) => left.validFrom.localeCompare(right.validFrom));
    for (let index = 1; index < active.length; index += 1) {
      const previous = active[index - 1];
      const current = active[index];
      if (!previous.validUntil || current.validFrom <= previous.validUntil) {
        throw new Error(
          `Periode tarif ${dayType} untuk ${productName} tidak valid karena bertumpuk.`,
        );
      }
    }
  }
}

export async function saveTicketProducts(
  db: AppDb,
  nextProducts: TicketProduct[],
): Promise<void> {
  if (!Array.isArray(nextProducts) || nextProducts.length < 2) {
    throw new Error("Minimal tiket Dewasa dan Anak wajib tersedia.");
  }

  const existingProducts = await db.select().from(ticketProducts);
  const existingPrices = await db.select().from(ticketPrices);
  const existingPriceById = new Map(
    existingPrices.map((price) => [price.id, price]),
  );
  const productIds = new Set<string>();
  const codes = new Set<string>();
  const categories = new Set<string>();
  const allPriceIds = new Set<string>();

  for (const product of nextProducts) {
    const id = product.id.trim();
    const code = product.code.trim().toUpperCase();
    const name = product.name.trim();
    const description = product.description.trim();
    if (!id || !/^[a-z0-9_-]+$/.test(id)) {
      throw new Error(`ID tiket tidak valid: ${product.id}`);
    }
    if (!code || !/^[A-Z0-9_-]+$/.test(code)) {
      throw new Error(`Kode tiket tidak valid: ${product.code}`);
    }
    if (!name) throw new Error("Nama tiket wajib diisi.");
    if (productIds.has(id) || codes.has(code)) {
      throw new Error("ID atau kode tiket tidak valid karena duplikat.");
    }
    if (
      product.visitorCategory !== "adult" &&
      product.visitorCategory !== "child"
    ) {
      throw new Error("Kategori pengunjung tiket tidak valid.");
    }
    if (categories.has(product.visitorCategory)) {
      throw new Error("Kategori tiket tidak valid karena duplikat.");
    }
    if (
      product.validityMode !== "same_day" &&
      product.validityMode !== "selected_date"
    ) {
      throw new Error("Masa berlaku tiket tidak valid.");
    }

    productIds.add(id);
    codes.add(code);
    categories.add(product.visitorCategory);

    if (!Array.isArray(product.prices)) {
      throw new Error(`Daftar tarif ${name} tidak valid.`);
    }
    const normalizedPrices: TicketPrice[] = [];
    for (const price of product.prices) {
      const priceId = price.id.trim();
      if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
        throw new Error(`ID tarif tidak valid: ${price.id}`);
      }
      if (allPriceIds.has(priceId)) {
        throw new Error(`ID tarif tidak valid karena duplikat: ${priceId}`);
      }
      if (price.ticketProductId !== id) {
        throw new Error(`Relasi tarif tidak valid: ${priceId}`);
      }
      if (price.dayType !== "weekday" && price.dayType !== "weekend") {
        throw new Error(`Jenis hari tarif tidak valid: ${priceId}`);
      }
      if (!Number.isSafeInteger(price.price) || price.price <= 0) {
        throw new Error(`Harga tarif tidak valid: ${priceId}`);
      }
      if (!isIsoDate(price.validFrom)) {
        throw new Error(`Tanggal mulai tarif tidak valid: ${priceId}`);
      }
      if (price.validUntil && !isIsoDate(price.validUntil)) {
        throw new Error(`Tanggal akhir tarif tidak valid: ${priceId}`);
      }
      if (price.validUntil && price.validUntil < price.validFrom) {
        throw new Error(`Periode tarif tidak valid: ${priceId}`);
      }
      const existingPrice = existingPriceById.get(priceId);
      if (
        existingPrice &&
        existingPrice.ticketProductId !== price.ticketProductId
      ) {
        throw new Error(`Pemilik tarif tidak valid: ${priceId}`);
      }
      allPriceIds.add(priceId);
      normalizedPrices.push({
        ...price,
        id: priceId,
        ticketProductId: id,
        validUntil: price.validUntil || null,
      });
    }
    assertNoOverlappingTicketPrices(name, normalizedPrices);

    await db
      .insert(ticketProducts)
      .values({
        id,
        code,
        name,
        visitorCategory: product.visitorCategory,
        validityMode: product.validityMode,
        description,
        active: product.active !== false,
      })
      .onConflictDoUpdate({
        target: ticketProducts.id,
        set: {
          code,
          name,
          visitorCategory: product.visitorCategory,
          validityMode: product.validityMode,
          description,
          active: product.active !== false,
          updatedAt: new Date().toISOString(),
        },
      });

    for (const price of normalizedPrices) {
      await db
        .insert(ticketPrices)
        .values({
          id: price.id,
          ticketProductId: id,
          dayType: price.dayType,
          price: price.price,
          validFrom: price.validFrom,
          validUntil: price.validUntil,
          active: price.active !== false,
        })
        .onConflictDoUpdate({
          target: ticketPrices.id,
          set: {
            dayType: price.dayType,
            price: price.price,
            validFrom: price.validFrom,
            validUntil: price.validUntil,
            active: price.active !== false,
            updatedAt: new Date().toISOString(),
          },
        });
    }

    for (const existingPrice of existingPrices) {
      if (
        existingPrice.ticketProductId === id &&
        !allPriceIds.has(existingPrice.id)
      ) {
        await db
          .update(ticketPrices)
          .set({ active: false, updatedAt: new Date().toISOString() })
          .where(eq(ticketPrices.id, existingPrice.id));
      }
    }
  }

  if (!categories.has("adult") || !categories.has("child")) {
    throw new Error("Minimal tiket Dewasa dan Anak wajib tersedia.");
  }

  for (const existingProduct of existingProducts) {
    if (productIds.has(existingProduct.id)) continue;
    await db
      .update(ticketProducts)
      .set({ active: false, updatedAt: new Date().toISOString() })
      .where(eq(ticketProducts.id, existingProduct.id));
    await db
      .update(ticketPrices)
      .set({ active: false, updatedAt: new Date().toISOString() })
      .where(eq(ticketPrices.ticketProductId, existingProduct.id));
  }
}
