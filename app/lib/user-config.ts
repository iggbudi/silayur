import type { RoleKey } from "./role-permissions";

export type LocalUser = {
  id: string;
  name: string;
  username: string;
  role: RoleKey;
  active: boolean;
};

export const USER_STORAGE_KEY = "silayur.users.v1";

export const DEFAULT_USERS: LocalUser[] = [
  {
    id: "admin-resepsionis",
    name: "Admin Resepsionis",
    username: "admin.resepsionis",
    role: "super_admin",
    active: true,
  },
  {
    id: "manajer-operasional",
    name: "Manajer Operasional",
    username: "manajer.operasional",
    role: "manager",
    active: false,
  },
];

function cloneDefaultUsers(): LocalUser[] {
  return DEFAULT_USERS.map((user) => ({ ...user }));
}

export function parseUsers(value: string | null): LocalUser[] {
  if (!value) return cloneDefaultUsers();

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return cloneDefaultUsers();

    const ids = new Set<string>();
    const usernames = new Set<string>();
    const validUsers = parsed.flatMap<LocalUser>((candidate) => {
      if (!candidate || typeof candidate !== "object") return [];

      const raw = candidate as Partial<LocalUser>;
      const id = typeof raw.id === "string" ? raw.id.trim() : "";
      const name = typeof raw.name === "string" ? raw.name.trim() : "";
      const username =
        typeof raw.username === "string"
          ? raw.username.trim().toLowerCase()
          : "";
      const role =
        typeof raw.role === "string" &&
        /^[a-z0-9_-]+$/.test(raw.role.trim())
          ? (raw.role.trim() as RoleKey)
          : null;

      if (
        !id ||
        !name ||
        !username ||
        !role ||
        ids.has(id) ||
        usernames.has(username)
      ) {
        return [];
      }

      ids.add(id);
      usernames.add(username);
      return [
        {
          id,
          name,
          username,
          role,
          active: raw.active !== false,
        },
      ];
    });

    return validUsers.length > 0 ? validUsers : cloneDefaultUsers();
  } catch {
    return cloneDefaultUsers();
  }
}

export function loadUsers(): LocalUser[] {
  if (typeof window === "undefined") return cloneDefaultUsers();
  return parseUsers(window.localStorage.getItem(USER_STORAGE_KEY));
}

export function saveUsers(users: LocalUser[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
}
