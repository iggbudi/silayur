export type AccessLevel = "none" | "view" | "manage";

export type ModuleKey =
  | "visitors"
  | "finance"
  | "operations"
  | "facilities"
  | "complaints";

export type ModuleState = Record<ModuleKey, boolean>;

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
  | "jadwalKaryawan"
  | "reports"
  | "settings";

export type RolePermissionState = Record<
  RoleKey,
  Record<PermissionModuleKey, AccessLevel>
>;

export type AppUser = {
  id: string;
  name: string;
  username: string;
  role: RoleKey;
  active: boolean;
};

export type UserMutation = AppUser & {
  password?: string;
};

export type ConfigSectionKey =
  | "tickets"
  | "hours"
  | "operating-hours"
  | "shifts"
  | "facilities"
  | "revenue";

export type ConfigItem = {
  id: string;
  section: ConfigSectionKey;
  name: string;
  detail: string;
  active: boolean;
  sortOrder: number;
};

export type ConfigItemsState = Record<ConfigSectionKey, ConfigItem[]>;

export type TicketVisitorCategory = "adult" | "child";
export type TicketValidityMode = "same_day" | "selected_date";
export type TicketDayType = "weekday" | "weekend";

export type TicketPrice = {
  id: string;
  ticketProductId: string;
  dayType: TicketDayType;
  price: number;
  validFrom: string;
  validUntil: string | null;
  active: boolean;
};

export type TicketProduct = {
  id: string;
  code: string;
  name: string;
  visitorCategory: TicketVisitorCategory;
  validityMode: TicketValidityMode;
  description: string;
  active: boolean;
  prices: TicketPrice[];
};

export type AppConfigSnapshot = {
  modules: ModuleState;
  roles: RoleDefinition[];
  permissions: RolePermissionState;
  users: AppUser[];
  ticketProducts: TicketProduct[];
  configItems: ConfigItemsState;
  source: "postgres";
  checkpoint: "11";
};

export const MODULE_KEYS: ModuleKey[] = [
  "visitors",
  "finance",
  "operations",
  "facilities",
  "complaints",
];

export const PERMISSION_KEYS: PermissionModuleKey[] = [
  "dashboard",
  "operations",
  "visitors",
  "finance",
  "facilities",
  "complaints",
  "jadwalKaryawan",
  "reports",
  "settings",
];

export const CONFIG_SECTION_KEYS: ConfigSectionKey[] = [
  "tickets",
  "hours",
  "operating-hours",
  "shifts",
  "facilities",
  "revenue",
];

/**
 * Section config yang detailnya berupa rentang jam (HH.mm-HH.mm),
 * mis. "08.00-16.00" atau "06.00 - 14.00".
 */
export const HOUR_RANGE_SECTIONS: ConfigSectionKey[] = [
  "operating-hours",
  "shifts",
];

/** Pola rentang jam: dua angka HH.mm dipisah tanda minus (spasi opsional). */
export const HOUR_RANGE_PATTERN = /^\d{2}\.\d{2}\s*-\s*\d{2}\.\d{2}$/;

export const ACCESS_LEVELS: AccessLevel[] = ["none", "view", "manage"];

export const DEFAULT_MODULE_CONFIG: ModuleState = {
  visitors: true,
  finance: true,
  operations: true,
  facilities: true,
  complaints: true,
};

export function createEmptyConfigItems(): ConfigItemsState {
  return {
    tickets: [],
    hours: [],
    "operating-hours": [],
    shifts: [],
    facilities: [],
    revenue: [],
  };
}

function parseClockValue(value: string): number | null {
  const [hourRaw, minuteRaw] = value.split(".");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

/**
 * Validasi rentang jam untuk section `operating-hours` / `shifts`.
 * Format `HH.mm-HH.mm` (spasi di sekitar minus diperbolehkan),
 * jam mulai harus lebih awal dari jam selesai (shift semalam tidak didukung).
 */
export function isValidHourRange(value: string): boolean {
  const trimmed = value.trim();
  if (!HOUR_RANGE_PATTERN.test(trimmed)) return false;
  const [startRaw, endRaw] = trimmed.split(/\s*-\s*/);
  const start = parseClockValue(startRaw);
  const end = parseClockValue(endRaw);
  if (start === null || end === null) return false;
  return start < end;
}

export function createEmptyPermissions(): Record<
  PermissionModuleKey,
  AccessLevel
> {
  return {
    dashboard: "none",
    operations: "none",
    visitors: "none",
    finance: "none",
    facilities: "none",
    complaints: "none",
    jadwalKaryawan: "none",
    reports: "none",
    settings: "none",
  };
}

export function isAccessLevel(value: unknown): value is AccessLevel {
  return (
    typeof value === "string" &&
    (ACCESS_LEVELS as string[]).includes(value)
  );
}
