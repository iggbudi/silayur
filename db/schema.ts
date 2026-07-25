import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
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
