import seedData from "./seed-data.json";
import type {
  AccessLevel,
  AppUser,
  ConfigItem,
  ModuleKey,
  PermissionModuleKey,
  RoleDefinition,
  RolePermissionState,
  TicketPrice,
  TicketProduct,
} from "../shared/config";

export const SEED_MODULES = seedData.modules as Array<{
  key: ModuleKey;
  label: string;
  description: string;
  active: boolean;
}>;

export const SEED_ROLES = seedData.roles as RoleDefinition[];

export const SEED_ROLE_PERMISSIONS =
  seedData.permissions as RolePermissionState;

export const SEED_USERS = seedData.users as AppUser[];

export const SEED_TICKET_PRODUCTS = seedData.ticketProducts.map((product) => ({
  ...product,
  prices: seedData.ticketPrices.filter(
    (price) => price.ticketProductId === product.id,
  ),
})) as TicketProduct[];

export const SEED_TICKET_PRICES = seedData.ticketPrices as TicketPrice[];

export const SEED_CONFIG_ITEMS = seedData.configItems as ConfigItem[];

export type SeedEmployee = {
  id: string;
  name: string;
  position: string;
  area: string | null;
  active: boolean;
};

export const SEED_EMPLOYEES = seedData.employees as SeedEmployee[];

export const PERMISSION_MODULE_KEYS =
  Object.keys(seedData.permissions.super_admin) as PermissionModuleKey[];

export type SeedAccess = AccessLevel;

export const SEED_LABEL = "checkpoint-9-secure-persistence";
