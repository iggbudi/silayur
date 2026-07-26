/**
 * PUBLIC API untuk slice "settings".
 *
 * Slice ini bertanggung jawab untuk: konfigurasi sistem, user management,
 * role master, dan modul settings itu sendiri.
 *
 * File yang menjadi anggota slice ini:
 * - db/config-repo.ts                  (CRUD config items, users, roles, permissions, modules)
 * - app/pengaturan/page.tsx             (settings UI)
 * - app/api/config/route.ts             (config API)
 * - app/components/settings-user-form.tsx (form tambah/edit user)
 * - app/lib/settings-items.ts           (helper untuk settings items)
 * - app/lib/user-config.ts              (default users)
 * - app/lib/module-config.ts            (default modules)
 */

// ============================================================================
// SERVER (config repository & RBAC helpers)
// ============================================================================

export {
  loadConfigSnapshot,
  saveConfigPatch,
  findActiveUserById,
  getSettingsAccess,
  assertCanViewSettings,
  assertCanManageSettings,
  type ConfigPatch,
} from "../../../db/config-repo";

// ============================================================================
// CLIENT (helpers untuk settings UI)
// ============================================================================

export {
  toConfigItemsState,
  type SettingsItem,
  type SettingsSectionKey,
} from "../../lib/settings-items";

export { DEFAULT_USERS, type LocalUser } from "../../lib/user-config";

export {
  DEFAULT_MODULE_CONFIG,
  type ModuleKey,
  type ModuleState,
} from "../../lib/module-config";

// ============================================================================
// TYPES
// ============================================================================

export type {
  ConfigItem,
  ConfigItemsState,
  ConfigSectionKey,
  AppUser,
  UserMutation,
} from "../../../shared/config";
