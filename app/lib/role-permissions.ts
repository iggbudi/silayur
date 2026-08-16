import seedData from "../../db/seed-data.json";
import type { ModuleKey } from "./module-config";
import type {
  AccessLevel,
  PermissionModuleKey,
  RoleDefinition,
  RoleKey,
  RolePermissionState,
} from "../../shared/config";
import {
  createEmptyPermissions,
} from "../../shared/config";

export type {
  AccessLevel,
  PermissionModuleKey,
  RoleDefinition,
  RoleKey,
  RolePermissionState,
};

export type BuiltInRoleKey =
  | "super_admin"
  | "manager"
  | "supervisor"
  | "ticket_officer"
  | "finance_officer"
  | "field_officer"
  | "customer_service"
  | "viewer";

export const DEFAULT_ROLE_DEFINITIONS: RoleDefinition[] =
  seedData.roles.map((role) => ({ ...role }));

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
    key: "jadwalKaryawan",
    label: "Tim & Jadwal",
    description: "Jadwal shift, PIC, dan kehadiran karyawan.",
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
  jadwalKaryawan: "manage",
  reports: "manage",
  settings: "manage",
};

export const DEFAULT_ROLE_PERMISSIONS =
  structuredClone(seedData.permissions) as RolePermissionState;

export function createRolePermissionRow(): Record<
  PermissionModuleKey,
  AccessLevel
> {
  return {
    ...createEmptyPermissions(),
    dashboard: "view",
  };
}
