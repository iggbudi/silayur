import seedData from "./seed-data.json";
import type {
  AccessLevel,
  AppUser,
  ConfigItem,
  ModuleKey,
  PermissionModuleKey,
  RoleDefinition,
  RolePermissionState,
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

export const SEED_CONFIG_ITEMS = seedData.configItems as ConfigItem[];

export const PERMISSION_MODULE_KEYS =
  Object.keys(seedData.permissions.super_admin) as PermissionModuleKey[];

export type SeedAccess = AccessLevel;

export const SEED_LABEL = "checkpoint-9-secure-persistence";
