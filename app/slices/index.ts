/**
 * Barrel export untuk semua slice.
 *
 * Import dari "@/slices" untuk akses ke semua slice,
 * atau import langsung dari slice tertentu: "@/slices/auth", "@/slices/rbac", dll.
 *
 * Lihat ARCHITECTURE.md untuk filosofi & docs/folder-map.md untuk struktur.
 */

export * as auth from "./auth";
export * as rbac from "./rbac";
export * as settings from "./settings";
export * as ticketMaster from "./ticket-master";
export * as dashboard from "./dashboard";
export * as platform from "./platform";
