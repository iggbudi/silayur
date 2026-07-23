import type { ModuleKey } from "./module-config";

export type AccessLevel = "none" | "view" | "manage";

export type RoleKey =
  | "super_admin"
  | "manager"
  | "supervisor"
  | "ticket_officer"
  | "finance_officer"
  | "field_officer"
  | "customer_service"
  | "viewer";

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

export const ROLE_DEFINITIONS: Array<{
  key: RoleKey;
  label: string;
  description: string;
}> = [
  {
    key: "super_admin",
    label: "Super Admin",
    description: "Akses penuh dan tidak dapat dibatasi dari halaman ini.",
  },
  {
    key: "manager",
    label: "Manajer",
    description: "Memantau dan mengelola seluruh aktivitas operasional.",
  },
  {
    key: "supervisor",
    label: "Supervisor",
    description: "Mengawasi operasional lapangan dan fasilitas.",
  },
  {
    key: "ticket_officer",
    label: "Petugas Tiket",
    description: "Mencatat tiket dan kunjungan harian.",
  },
  {
    key: "finance_officer",
    label: "Petugas Keuangan",
    description: "Mengelola transaksi keuangan dan laporan.",
  },
  {
    key: "field_officer",
    label: "Petugas Lapangan",
    description: "Menangani checklist, fasilitas, dan kendala.",
  },
  {
    key: "customer_service",
    label: "Customer Service",
    description: "Menangani informasi pengunjung dan komplain.",
  },
  {
    key: "viewer",
    label: "Viewer",
    description: "Hanya melihat ringkasan dan laporan.",
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

const fullAccess: Record<PermissionModuleKey, AccessLevel> = {
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
  super_admin: { ...fullAccess },
  manager: { ...fullAccess },
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

export function parseRolePermissions(value: string | null): RolePermissionState {
  if (!value) return structuredClone(DEFAULT_ROLE_PERMISSIONS);

  try {
    const parsed = JSON.parse(value) as Partial<
      Record<RoleKey, Partial<Record<PermissionModuleKey, AccessLevel>>>
    >;
    const result = structuredClone(DEFAULT_ROLE_PERMISSIONS);

    ROLE_DEFINITIONS.forEach(({ key: roleKey }) => {
      PERMISSION_MODULES.forEach(({ key: moduleKey }) => {
        const candidate = parsed[roleKey]?.[moduleKey];
        if (candidate && accessLevels.includes(candidate)) {
          result[roleKey][moduleKey] = candidate;
        }
      });
    });

    result.super_admin = { ...fullAccess };
    return result;
  } catch {
    return structuredClone(DEFAULT_ROLE_PERMISSIONS);
  }
}

export function loadRolePermissions(): RolePermissionState {
  if (typeof window === "undefined") {
    return structuredClone(DEFAULT_ROLE_PERMISSIONS);
  }
  return parseRolePermissions(
    window.localStorage.getItem(ROLE_PERMISSION_STORAGE_KEY),
  );
}

export function saveRolePermissions(config: RolePermissionState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    ROLE_PERMISSION_STORAGE_KEY,
    JSON.stringify(config),
  );
}
