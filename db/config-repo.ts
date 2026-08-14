import { and, eq } from "drizzle-orm";
import {
  CONFIG_SECTION_KEYS,
  DEFAULT_MODULE_CONFIG,
  MODULE_KEYS,
  PERMISSION_KEYS,
  createEmptyConfigItems,
  createEmptyPermissions,
  isAccessLevel,
  type AccessLevel,
  type AppConfigSnapshot,
  type AppUser,
  type ConfigItemsState,
  type ModuleState,
  type PermissionModuleKey,
  type RoleDefinition,
  type RolePermissionState,
  type TicketProduct,
  type UserMutation,
} from "../shared/config";
import { hashPassword } from "../shared/password.mjs";
import type { AppDb } from "./get-db";
import { loadTicketProducts, saveTicketProducts } from "./ticket-repo";
import {
  authSessions,
  configItems,
  modules,
  rolePermissions,
  roles,
  users,
} from "./schema";

export type ConfigPatch = {
  modules?: ModuleState;
  roles?: RoleDefinition[];
  permissions?: RolePermissionState;
  users?: UserMutation[];
  configItems?: ConfigItemsState;
  ticketProducts?: TicketProduct[];
};

export async function loadConfigSnapshot(db: AppDb): Promise<AppConfigSnapshot> {
  const [
    moduleRows,
    roleRows,
    permissionRows,
    userRows,
    configRows,
    ticketProductList,
  ] = await Promise.all([
    db.select().from(modules),
    db.select().from(roles),
    db.select().from(rolePermissions),
    db.select().from(users),
    db.select().from(configItems),
    loadTicketProducts(db),
  ]);

  const moduleState = MODULE_KEYS.reduce<ModuleState>(
    (acc, key) => {
      const row = moduleRows.find((item) => item.key === key);
      acc[key] = row ? Boolean(row.active) : DEFAULT_MODULE_CONFIG[key];
      return acc;
    },
    { ...DEFAULT_MODULE_CONFIG },
  );

  const roleList: RoleDefinition[] = roleRows.map((row) => ({
    key: row.key,
    label: row.label,
    description: row.description,
    active: Boolean(row.active),
    system: Boolean(row.system),
  }));

  const permissionState: RolePermissionState = {};
  for (const role of roleList) {
    permissionState[role.key] = createEmptyPermissions();
  }
  for (const row of permissionRows) {
    if (!permissionState[row.roleKey]) {
      permissionState[row.roleKey] = createEmptyPermissions();
    }
    if (
      (PERMISSION_KEYS as string[]).includes(row.moduleKey) &&
      isAccessLevel(row.access)
    ) {
      permissionState[row.roleKey][row.moduleKey as PermissionModuleKey] =
        row.roleKey === "super_admin" ? "manage" : row.access;
    }
  }
  if (permissionState.super_admin) {
    for (const key of PERMISSION_KEYS) {
      permissionState.super_admin[key] = "manage";
    }
  }

  const userList: AppUser[] = userRows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.roleKey,
    active: Boolean(row.active),
  }));

  const configItemState = createEmptyConfigItems();
  for (const row of configRows) {
    if (!(CONFIG_SECTION_KEYS as string[]).includes(row.section)) continue;
    const section = row.section as keyof ConfigItemsState;
    configItemState[section].push({
      id: row.id,
      section,
      name: row.name,
      detail: row.detail,
      active: Boolean(row.active),
      sortOrder: row.sortOrder,
    });
  }
  for (const section of CONFIG_SECTION_KEYS) {
    configItemState[section].sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    );
  }

  return {
    modules: moduleState,
    roles: roleList,
    permissions: permissionState,
    users: userList,
    ticketProducts: ticketProductList,
    configItems: configItemState,
    source: "turso",
    checkpoint: "11",
  };
}

export async function saveModules(
  db: AppDb,
  state: ModuleState,
): Promise<void> {
  for (const key of MODULE_KEYS) {
    const active = Boolean(state[key]);
    await db
      .insert(modules)
      .values({ key, label: key, description: "", active })
      .onConflictDoUpdate({
        target: modules.key,
        set: { active, updatedAt: new Date().toISOString() },
      });
  }
}

export async function saveConfigItems(
  db: AppDb,
  state: ConfigItemsState,
): Promise<void> {
  for (const section of CONFIG_SECTION_KEYS) {
    const rows = state[section];
    if (!Array.isArray(rows)) {
      throw new Error(`Daftar konfigurasi ${section} tidak valid.`);
    }
    const ids = new Set<string>();
    for (const [index, item] of rows.entries()) {
      const id = item.id.trim();
      const name = item.name.trim();
      const detail = item.detail.trim();
      if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        throw new Error(`ID konfigurasi tidak valid: ${item.id}`);
      }
      if (!name) throw new Error("Nama konfigurasi wajib diisi.");
      if (ids.has(id)) throw new Error(`ID konfigurasi duplikat: ${id}`);
      ids.add(id);
      const sortOrder = Number.isSafeInteger(item.sortOrder)
        ? item.sortOrder
        : (index + 1) * 10;

      await db
        .insert(configItems)
        .values({
          id,
          section,
          name,
          detail,
          active: item.active !== false,
          sortOrder,
        })
        .onConflictDoUpdate({
          target: configItems.id,
          set: {
            section,
            name,
            detail,
            active: item.active !== false,
            sortOrder,
            updatedAt: new Date().toISOString(),
          },
        });
    }

    const existing = await db
      .select({ id: configItems.id })
      .from(configItems)
      .where(eq(configItems.section, section));
    for (const row of existing) {
      if (!ids.has(row.id)) {
        await db.delete(configItems).where(eq(configItems.id, row.id));
      }
    }
  }
}

export async function saveRoles(
  db: AppDb,
  nextRoles: RoleDefinition[],
): Promise<void> {
  const existing = await db.select().from(roles);
  const nextKeys = new Set(nextRoles.map((role) => role.key));

  for (const role of nextRoles) {
    const key = role.key.trim();
    if (!key || !/^[a-z0-9_-]+$/.test(key)) {
      throw new Error(`Invalid role key: ${role.key}`);
    }
    const label = role.label.trim();
    if (!label) throw new Error("Role label is required.");
    const description = role.description.trim() || "Belum ada keterangan.";
    const active = key === "super_admin" ? true : role.active !== false;
    const system = role.system === true || key === "super_admin";

    await db
      .insert(roles)
      .values({ key, label, description, active, system })
      .onConflictDoUpdate({
        target: roles.key,
        set: {
          label,
          description,
          active,
          system,
          updatedAt: new Date().toISOString(),
        },
      });
  }

  for (const row of existing) {
    if (nextKeys.has(row.key) || row.system) continue;
    const assigned = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.roleKey, row.key))
      .limit(1);
    if (assigned.length > 0) {
      throw new Error(
        `Role ${row.key} masih dipakai pengguna dan tidak dapat dihapus.`,
      );
    }
    await db.delete(roles).where(eq(roles.key, row.key));
  }
}

export async function savePermissions(
  db: AppDb,
  state: RolePermissionState,
): Promise<void> {
  const validRoles = await db.select({ key: roles.key }).from(roles);
  const validRoleKeys = new Set(validRoles.map((role) => role.key));

  for (const [roleKey, row] of Object.entries(state)) {
    if (!validRoleKeys.has(roleKey)) {
      throw new Error(`Unknown role: ${roleKey}`);
    }
    for (const moduleKey of PERMISSION_KEYS) {
      const access =
        roleKey === "super_admin" ? "manage" : (row?.[moduleKey] ?? "none");
      if (!isAccessLevel(access)) {
        throw new Error(`Invalid access for ${roleKey}.${moduleKey}`);
      }
      await db
        .insert(rolePermissions)
        .values({ roleKey, moduleKey, access })
        .onConflictDoUpdate({
          target: [rolePermissions.roleKey, rolePermissions.moduleKey],
          set: { access, updatedAt: new Date().toISOString() },
        });
    }
  }
}

export async function saveUsers(
  db: AppDb,
  nextUsers: UserMutation[],
): Promise<void> {
  if (!Array.isArray(nextUsers) || nextUsers.length === 0) {
    throw new Error("Minimal satu pengguna diperlukan.");
  }

  const activeSuperAdmins = nextUsers.filter(
    (user) => user.active && user.role === "super_admin",
  );
  if (activeSuperAdmins.length < 1) {
    throw new Error("Minimal satu Super Admin harus tetap aktif.");
  }

  const existing = await db.select().from(users);
  const existingById = new Map(existing.map((user) => [user.id, user]));
  const nextIds = new Set(nextUsers.map((user) => user.id));
  const usernames = new Set<string>();

  for (const user of nextUsers) {
    const id = user.id.trim();
    const name = user.name.trim();
    const username = user.username.trim().toLowerCase();
    const role = user.role.trim();
    if (!id || !name || !username || !role) {
      throw new Error("User id, name, username, and role are required.");
    }
    if (!/^[a-z0-9._@-]+$/.test(username)) {
      throw new Error(`Invalid username: ${username}`);
    }
    if (usernames.has(username)) {
      throw new Error(`Duplicate username: ${username}`);
    }
    usernames.add(username);

    const roleExists = await db
      .select({ key: roles.key })
      .from(roles)
      .where(and(eq(roles.key, role), eq(roles.active, true)))
      .limit(1);
    if (roleExists.length === 0) {
      throw new Error(`Unknown or inactive role: ${role}`);
    }

    const current = existingById.get(id);
    let passwordHash = current?.passwordHash ?? null;
    if (user.password) {
      passwordHash = await hashPassword(user.password);
    } else if (!current) {
      throw new Error(`Password wajib diisi untuk pengguna baru: ${username}`);
    }

    await db
      .insert(users)
      .values({
        id,
        name,
        username,
        roleKey: role,
        active: user.active !== false,
        passwordHash,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name,
          username,
          roleKey: role,
          active: user.active !== false,
          passwordHash,
          updatedAt: new Date().toISOString(),
        },
      });

    if (user.password) {
      await db.delete(authSessions).where(eq(authSessions.userId, id));
    }
    if (user.active === false) {
      await db.delete(authSessions).where(eq(authSessions.userId, id));
    }
  }

  for (const row of existing) {
    if (nextIds.has(row.id)) continue;
    await db
      .update(users)
      .set({ active: false, updatedAt: new Date().toISOString() })
      .where(eq(users.id, row.id));
    await db.delete(authSessions).where(eq(authSessions.userId, row.id));
  }
}

export async function saveConfigPatch(
  db: AppDb,
  patch: ConfigPatch,
): Promise<AppConfigSnapshot> {
  return db.transaction(async (transaction) => {
    const tx = transaction as unknown as AppDb;
    if (patch.modules) await saveModules(tx, patch.modules);
    if (patch.roles) await saveRoles(tx, patch.roles);
    if (patch.permissions) await savePermissions(tx, patch.permissions);
    if (patch.users) await saveUsers(tx, patch.users);
    if (patch.ticketProducts) {
      await saveTicketProducts(tx, patch.ticketProducts);
    }
    if (patch.configItems) await saveConfigItems(tx, patch.configItems);
    return loadConfigSnapshot(tx);
  });
}

export async function findActiveUserById(
  db: AppDb,
  userId: string,
): Promise<AppUser | null> {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.active, true)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.roleKey,
    active: Boolean(row.active),
  };
}

export async function getModuleAccess(
  db: AppDb,
  userId: string,
  moduleKey: PermissionModuleKey,
): Promise<AccessLevel> {
  const user = await findActiveUserById(db, userId);
  if (!user) return "none";
  if (user.role === "super_admin") return "manage";

  const rows = await db
    .select()
    .from(rolePermissions)
    .where(
      and(
        eq(rolePermissions.roleKey, user.role),
        eq(rolePermissions.moduleKey, moduleKey),
      ),
    )
    .limit(1);
  const access = rows[0]?.access;
  return isAccessLevel(access) ? access : "none";
}

export async function assertCanAccessModule(
  db: AppDb,
  userId: string,
  moduleKey: PermissionModuleKey,
  required: "view" | "manage",
  label: string,
): Promise<AppUser> {
  const user = await findActiveUserById(db, userId);
  if (!user) throw new Error("Pengguna tidak ditemukan atau nonaktif.");
  const access = await getModuleAccess(db, userId, moduleKey);
  const denied =
    required === "manage" ? access !== "manage" : access === "none";
  if (denied) {
    const verb = required === "manage" ? "mengelola" : "melihat";
    throw new Error(`Anda tidak memiliki izin ${verb} ${label}.`);
  }
  return user;
}

export async function getSettingsAccess(
  db: AppDb,
  userId: string,
): Promise<AccessLevel> {
  return getModuleAccess(db, userId, "settings");
}

export async function assertCanViewSettings(
  db: AppDb,
  userId: string,
): Promise<AppUser> {
  return assertCanAccessModule(db, userId, "settings", "view", "pengaturan");
}

export async function assertCanManageSettings(
  db: AppDb,
  userId: string,
): Promise<AppUser> {
  return assertCanAccessModule(
    db,
    userId,
    "settings",
    "manage",
    "pengaturan",
  );
}

export async function assertCanViewVisitors(
  db: AppDb,
  userId: string,
): Promise<AppUser> {
  return assertCanAccessModule(
    db,
    userId,
    "visitors",
    "view",
    "penjualan tiket",
  );
}

export async function assertCanManageVisitors(
  db: AppDb,
  userId: string,
): Promise<AppUser> {
  return assertCanAccessModule(
    db,
    userId,
    "visitors",
    "manage",
    "penjualan tiket",
  );
}

export async function assertCanViewFinance(
  db: AppDb,
  userId: string,
): Promise<AppUser> {
  return assertCanAccessModule(db, userId, "finance", "view", "keuangan");
}

export async function assertCanManageFinance(
  db: AppDb,
  userId: string,
): Promise<AppUser> {
  return assertCanAccessModule(db, userId, "finance", "manage", "keuangan");
}

export async function assertCanViewReports(
  db: AppDb,
  userId: string,
): Promise<AppUser> {
  return assertCanAccessModule(db, userId, "reports", "view", "laporan");
}

export async function assertCanManageReports(
  db: AppDb,
  userId: string,
): Promise<AppUser> {
  return assertCanAccessModule(db, userId, "reports", "manage", "laporan");
}
