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
  source: "turso";
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
  "reports",
  "settings",
];

export const CONFIG_SECTION_KEYS: ConfigSectionKey[] = [
  "tickets",
  "hours",
  "facilities",
  "revenue",
];

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
    facilities: [],
    revenue: [],
  };
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
