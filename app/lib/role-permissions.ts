import type { ModuleKey } from "./module-config";

export type AccessLevel = "none" | "view" | "manage";

export type BuiltInRoleKey =
  | "super_admin"
  | "manager"
  | "supervisor"
  | "ticket_officer"
  | "finance_officer"
  | "field_officer"
  | "customer_service"
  | "viewer";

export type RoleKey = string;

export type RoleDefinition = {
  key: RoleKey;
  label: string;
  description: string;
  active: boolean;
  system: boolean;
};

export type PermissionModuleKey =
  | "dashboard"
  | "operations"
  | "visitors"
  | "finance"
  | "facilities"
  | "complaints"
  | "reports"
  | "settings";

export type RolePermissionState = Record<
  RoleKey,
  Record<PermissionModuleKey, AccessLevel>
>;

export const ROLE_PERMISSION_STORAGE_KEY = "silayur.role-permissions.v1";

export const DEFAULT_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    key: "super_admin",
    label: "Super Admin",
    description: "Akses penuh dan tidak dapat dibatasi dari halaman ini.",
    active: true,
    system: true,
  },
  {
    key: "manager",
    label: "Manajer",
    description: "Memantau dan mengelola seluruh aktivitas operasional.",
    active: true,
    system: true,
  },
  {
    key: "supervisor",
    label: "Supervisor",
    description: "Mengawasi operasional lapangan dan fasilitas.",
    active: true,
    system: true,
  },
  {
    key: "ticket_officer",
    label: "Petugas Tiket",
    description: "Mencatat tiket dan kunjungan harian.",
    active: true,
    system: true,
  },
  {
    key: "finance_officer",
    label: "Petugas Keuangan",
    description: "Mengelola transaksi keuangan dan laporan.",
    active: true,
    system: true,
  },
  {
    key: "field_officer",
    label: "Petugas Lapangan",
    description: "Menangani checklist, fasilitas, dan kendala.",
    active: true,
    system: true,
  },
  {
    key: "customer_service",
    label: "Customer Service",
    description: "Menangani informasi pengunjung dan komplain.",
    active: true,
    system: true,
  },
  {
    key: "viewer",
    label: "Viewer",
    description: "Hanya melihat ringkasan dan laporan.",
    active: true,
    system: true,
  },
];

export const PERMISSION_MODULES: Array<{
  key: PermissionModuleKey;
  label: string;
  description: string;
  globalModuleKey?: ModuleKey;
}> = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Ringkasan indikator utama.",
  },
  {
    key: "operations",
    label: "Operasional",
    description: "Hari operasional, shift, dan checklist.",
    globalModuleKey: "operations",
  },
  {
    key: "visitors",
    label: "Pengunjung",
    description: "Tiket, kunjungan, dan reservasi.",
    globalModuleKey: "visitors",
  },
  {
    key: "finance",
    label: "Keuangan",
    description: "Pendapatan, pengeluaran, dan kas.",
    globalModuleKey: "finance",
  },
  {
    key: "facilities",
    label: "Fasilitas",
    description: "Wahana, inspeksi, dan kebersihan.",
    globalModuleKey: "facilities",
  },
  {
    key: "complaints",
    label: "Komplain",
    description: "Keluhan, penugasan, dan tindak lanjut.",
    globalModuleKey: "complaints",
  },
  {
    key: "reports",
    label: "Laporan",
    description: "Rekap dan ekspor data.",
  },
  {
    key: "settings",
    label: "Pengaturan",
    description: "Konfigurasi sistem, pengguna, dan role.",
  },
];

export const FULL_ACCESS: Record<PermissionModuleKey, AccessLevel> = {
  dashboard: "manage",
  operations: "manage",
  visitors: "manage",
  finance: "manage",
  facilities: "manage",
  complaints: "manage",
  reports: "manage",
  settings: "manage",
};

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionState = {
  super_admin: { ...FULL_ACCESS },
  manager: { ...FULL_ACCESS },
  supervisor: {
    dashboard: "view",
    operations: "manage",
    visitors: "view",
    finance: "view",
    facilities: "manage",
    complaints: "view",
    reports: "view",
    settings: "none",
  },
  ticket_officer: {
    dashboard: "view",
    operations: "none",
    visitors: "manage",
    finance: "none",
    facilities: "none",
    complaints: "none",
    reports: "none",
    settings: "none",
  },
  finance_officer: {
    dashboard: "view",
    operations: "none",
    visitors: "view",
    finance: "manage",
    facilities: "none",
    complaints: "none",
    reports: "view",
    settings: "none",
  },
  field_officer: {
    dashboard: "view",
    operations: "manage",
    visitors: "none",
    finance: "none",
    facilities: "manage",
    complaints: "view",
    reports: "none",
    settings: "none",
  },
  customer_service: {
    dashboard: "view",
    operations: "none",
    visitors: "view",
    finance: "none",
    facilities: "view",
    complaints: "manage",
    reports: "none",
    settings: "none",
  },
  viewer: {
    dashboard: "view",
    operations: "none",
    visitors: "none",
    finance: "none",
    facilities: "none",
    complaints: "none",
    reports: "view",
    settings: "none",
  },
};

const accessLevels: AccessLevel[] = ["none", "view", "manage"];

export function createRolePermissionRow(): Record<
  PermissionModuleKey,
  AccessLevel
> {
  return {
    dashboard: "view",
    operations: "none",
    visitors: "none",
    finance: "none",
    facilities: "none",
    complaints: "none",
    reports: "none",
    settings: "none",
  };
}

function createPermissionState(roleKeys: RoleKey[]): RolePermissionState {
  const result = structuredClone(DEFAULT_ROLE_PERMISSIONS);
  roleKeys.forEach((roleKey) => {
    if (!result[roleKey]) result[roleKey] = createRolePermissionRow();
  });
  return result;
}

export function parseRolePermissions(
  value: string | null,
  roleKeys: RoleKey[] = DEFAULT_ROLE_DEFINITIONS.map((role) => role.key),
): RolePermissionState {
  const result = createPermissionState(roleKeys);
  if (!value) return result;

  try {
    const parsed = JSON.parse(value) as Partial<
      Record<RoleKey, Partial<Record<PermissionModuleKey, AccessLevel>>>
    >;

    roleKeys.forEach((roleKey) => {
      PERMISSION_MODULES.forEach(({ key: moduleKey }) => {
        const candidate = parsed[roleKey]?.[moduleKey];
        if (candidate && accessLevels.includes(candidate)) {
          result[roleKey][moduleKey] = candidate;
        }
      });
    });

    result.super_admin = { ...FULL_ACCESS };
    return result;
  } catch {
    return result;
  }
}

export function loadRolePermissions(
  roleKeys?: RoleKey[],
): RolePermissionState {
  if (typeof window === "undefined") {
    return parseRolePermissions(null, roleKeys);
  }
  return parseRolePermissions(
    window.localStorage.getItem(ROLE_PERMISSION_STORAGE_KEY),
    roleKeys,
  );
}

export function saveRolePermissions(config: RolePermissionState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    ROLE_PERMISSION_STORAGE_KEY,
    JSON.stringify(config),
  );
}
