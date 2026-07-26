/**
 * PUBLIC API untuk slice "rbac".
 *
 * Slice ini bertanggung jawab untuk: role, permission, akses modul.
 *
 * File yang menjadi anggota slice ini:
 * - shared/access.ts                (RBAC primitives: getAccessLevel, canView, canManage)
 * - app/lib/access.ts               (re-export of shared/access)
 * - app/lib/role-permissions.ts     (role definitions & default permissions)
 * - app/components/sidebar-navigation.tsx (nav dengan permission-aware visibility)
 */

// ============================================================================
// RBAC PRIMITIVES
// ============================================================================

export {
  getAccessLevel,
  getRoleAccessMap,
  canView,
  canManage,
  moduleToPermission,
  navPermissionForLabel,
} from "../../../shared/access";

export {
  DEFAULT_ROLE_DEFINITIONS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_MODULES,
  FULL_ACCESS,
  createRolePermissionRow,
} from "../../lib/role-permissions";

export type {
  BuiltInRoleKey,
} from "../../lib/role-permissions";

// ============================================================================
// TYPES
// ============================================================================

export type {
  AccessLevel,
  RoleKey,
  RoleDefinition,
  RolePermissionState,
  PermissionModuleKey,
} from "../../../shared/config";
