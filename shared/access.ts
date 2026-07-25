import {
  createEmptyPermissions,
  type AccessLevel,
  type ModuleKey,
  type PermissionModuleKey,
  type RoleKey,
  type RolePermissionState,
} from "./config";

export function getAccessLevel(
  permissions: RolePermissionState,
  role: RoleKey,
  moduleKey: PermissionModuleKey,
): AccessLevel {
  if (role === "super_admin") return "manage";
  return permissions[role]?.[moduleKey] ?? "none";
}

export function getRoleAccessMap(
  permissions: RolePermissionState,
  role: RoleKey,
): Record<PermissionModuleKey, AccessLevel> {
  if (role === "super_admin") {
    return {
      dashboard: "manage",
      operations: "manage",
      visitors: "manage",
      finance: "manage",
      facilities: "manage",
      complaints: "manage",
      reports: "manage",
      settings: "manage",
    };
  }
  return { ...(permissions[role] ?? createEmptyPermissions()) };
}

export function canView(level: AccessLevel): boolean {
  return level === "view" || level === "manage";
}

export function canManage(level: AccessLevel): boolean {
  return level === "manage";
}

export function moduleToPermission(
  moduleKey: ModuleKey,
): PermissionModuleKey {
  return moduleKey;
}

export function navPermissionForLabel(
  label: string,
): PermissionModuleKey | null {
  switch (label) {
    case "Dashboard":
      return "dashboard";
    case "Operasional":
      return "operations";
    case "Pengunjung":
      return "visitors";
    case "Keuangan":
      return "finance";
    case "Komplain":
      return "complaints";
    case "Laporan":
      return "reports";
    case "Pengaturan":
      return "settings";
    default:
      return null;
  }
}
