import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * SILAYUR foundation and configuration tables.
 * Covers RBAC, secure sessions, and durable operational configuration.
 */

export const modules = sqliteTable("modules", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const roles = sqliteTable("roles", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  system: integer("system", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    roleKey: text("role_key")
      .notNull()
      .references(() => roles.key, { onDelete: "cascade" }),
    moduleKey: text("module_key").notNull(),
    access: text("access", { enum: ["none", "view", "manage"] })
      .notNull()
      .default("none"),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [primaryKey({ columns: [table.roleKey, table.moduleKey] })],
);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  roleKey: text("role_key")
    .notNull()
    .references(() => roles.key),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  /** Reserved for server auth; null while prototype uses local session. */
  passwordHash: text("password_hash"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const ticketProducts = sqliteTable(
  "ticket_products",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    visitorCategory: text("visitor_category", {
      enum: ["adult", "child"],
    }).notNull(),
    validityMode: text("validity_mode", {
      enum: ["same_day", "selected_date"],
    })
      .notNull()
      .default("same_day"),
    description: text("description").notNull().default(""),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex("ticket_products_code_idx").on(table.code)],
);

export const ticketPrices = sqliteTable(
  "ticket_prices",
  {
    id: text("id").primaryKey(),
    ticketProductId: text("ticket_product_id")
      .notNull()
      .references(() => ticketProducts.id, { onDelete: "cascade" }),
    dayType: text("day_type", { enum: ["weekday", "weekend"] }).notNull(),
    price: integer("price").notNull(),
    validFrom: text("valid_from").notNull(),
    validUntil: text("valid_until"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("ticket_prices_product_day_idx").on(
      table.ticketProductId,
      table.dayType,
      table.validFrom,
    ),
  ],
);

export const configItems = sqliteTable(
  "config_items",
  {
    id: text("id").primaryKey(),
    section: text("section", {
      enum: ["tickets", "hours", "facilities", "revenue"],
    }).notNull(),
    name: text("name").notNull(),
    detail: text("detail").notNull().default(""),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("config_items_section_sort_idx").on(
      table.section,
      table.sortOrder,
    ),
  ],
);

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    expiresAt: text("expires_at").notNull(),
    lastSeenAt: text("last_seen_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("auth_sessions_user_idx").on(table.userId)],
);

export const schemaVersion = sqliteTable("schema_version", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
  appliedAt: text("applied_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  notes: text("notes").notNull().default(""),
});

/**
 * SILAYUR ticket sales (Checkpoint 12+).
 * Setiap transaksi penjualan tiket di loket dicatat di sini.
 * sale_items adalah line items (1 transaksi bisa multi tiket / multi kategori).
 */

export const sales = sqliteTable(
  "sales",
  {
    id: text("id").primaryKey(),
    /**
     * Receipt number, human-readable, e.g. "RCP-20260726-0001".
     * Unique per hari, generated di server.
     */
    receiptNumber: text("receipt_number").notNull().unique(),
    soldBy: text("sold_by")
      .notNull()
      .references(() => users.id),
    soldAt: text("sold_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    /**
     * Snapshot tanggal kunjungan. Untuk tiket same_day selalu = soldAt.
     * Untuk tiket selected_date bisa berbeda (untuk MVP selalu = soldAt).
     */
    visitDate: text("visit_date").notNull(),
    /**
     * Total amount dalam Rupiah (integer).
     * Sama dengan SUM(sale_items.subtotal) untuk memastikan konsistensi.
     */
    totalAmount: integer("total_amount").notNull(),
    /**
     * Jumlah tiket (SUM of quantity di sale_items).
     */
    totalQuantity: integer("total_quantity").notNull(),
    /**
     * Status: completed, void_pending (menunggu persetujuan), voided.
     */
    status: text("status", {
      enum: ["completed", "void_pending", "voided"],
    })
      .notNull()
      .default("completed"),
    notes: text("notes").notNull().default(""),
    /** Alasan pembatalan (wajib diisi saat permintaan void). */
    voidReason: text("void_reason").notNull().default(""),
    /** Waktu permintaan pembatalan (ISO UTC). NULL = belum diminta. */
    voidRequestedAt: text("void_requested_at"),
    /** Pemohon pembatalan. NULL = belum diminta. */
    voidRequestedBy: text("void_requested_by").references(() => users.id),
    /** Waktu persetujuan pembatalan (ISO UTC). NULL = belum disetujui. */
    voidedAt: text("voided_at"),
    /** Penyetuju pembatalan. NULL = belum disetujui. */
    voidedBy: text("voided_by").references(() => users.id),
  },
  (table) => [
    index("sales_sold_at_idx").on(table.soldAt),
    index("sales_sold_by_idx").on(table.soldBy),
    index("sales_visit_date_idx").on(table.visitDate),
  ],
);

export const saleItems = sqliteTable(
  "sale_items",
  {
    id: text("id").primaryKey(),
    saleId: text("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    ticketProductId: text("ticket_product_id")
      .notNull()
      .references(() => ticketProducts.id),
    /**
     * Snapshot nama produk & kategori di waktu transaksi.
     * Penting: jika nanti master tiket di-rename, transaksi lama tetap refer ke nama lama.
     */
    productName: text("product_name").notNull(),
    visitorCategory: text("visitor_category", {
      enum: ["adult", "child"],
    }).notNull(),
    /**
     * Snapshot harga satuan saat transaksi.
     */
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    subtotal: integer("subtotal").notNull(),
  },
  (table) => [
    index("sale_items_sale_idx").on(table.saleId),
    index("sale_items_product_idx").on(table.ticketProductId),
  ],
);

/**
 * Counter nomor receipt per hari (YYYY-MM-DD lokal WIB).
 * Dipakai untuk menghasilkan nomor receipt RCP-YYYYMMDD-#### secara
 * atomik (upsert inkremental) agar bebas race saat banyak loket transaksi
 * bersamaan — menggantikan pendekatan count(*)+1 yang rawan duplikat.
 */
export const receiptCounters = sqliteTable("receipt_counters", {
  counterDate: text("counter_date").primaryKey(),
  seq: integer("seq").notNull(),
});
