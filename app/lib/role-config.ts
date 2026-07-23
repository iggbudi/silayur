import {
  DEFAULT_ROLE_DEFINITIONS,
  type RoleDefinition,
} from "./role-permissions";

export const ROLE_STORAGE_KEY = "silayur.roles.v1";

function cloneDefaultRoles(): RoleDefinition[] {
  return DEFAULT_ROLE_DEFINITIONS.map((role) => ({ ...role }));
}

export function parseRoles(value: string | null): RoleDefinition[] {
  if (!value) return cloneDefaultRoles();

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return cloneDefaultRoles();

    const storedRoles = new Map<string, RoleDefinition>();
    parsed.forEach((candidate) => {
      if (!candidate || typeof candidate !== "object") return;
      const raw = candidate as Partial<RoleDefinition>;
      const key = typeof raw.key === "string" ? raw.key.trim() : "";
      const label = typeof raw.label === "string" ? raw.label.trim() : "";
      const description =
        typeof raw.description === "string" ? raw.description.trim() : "";
      if (
        !key ||
        !label ||
        !/^[a-z0-9_-]+$/.test(key) ||
        storedRoles.has(key)
      ) {
        return;
      }
      storedRoles.set(key, {
        key,
        label,
        description: description || "Belum ada keterangan.",
        active: raw.active !== false,
        system: raw.system === true,
      });
    });

    const builtInKeys = new Set(
      DEFAULT_ROLE_DEFINITIONS.map((role) => role.key),
    );
    const builtInRoles = DEFAULT_ROLE_DEFINITIONS.map((defaultRole) => {
      const stored = storedRoles.get(defaultRole.key);
      if (!stored) return { ...defaultRole };
      return {
        ...defaultRole,
        label: stored.label,
        description: stored.description,
        active:
          defaultRole.key === "super_admin" ? true : stored.active,
      };
    });
    const customRoles = [...storedRoles.values()]
      .filter((role) => !builtInKeys.has(role.key))
      .map((role) => ({ ...role, system: false }));

    return [...builtInRoles, ...customRoles];
  } catch {
    return cloneDefaultRoles();
  }
}

export function loadRoles(): RoleDefinition[] {
  if (typeof window === "undefined") return cloneDefaultRoles();
  return parseRoles(window.localStorage.getItem(ROLE_STORAGE_KEY));
}

export function saveRoles(roles: RoleDefinition[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(roles));
}
