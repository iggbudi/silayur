import { getRoleAccessMap } from "../../shared/access";
import type {
  AccessLevel,
  AppConfigSnapshot,
  AppUser,
  ConfigItemsState,
  ModuleState,
  PermissionModuleKey,
  RoleDefinition,
  RolePermissionState,
  UserMutation,
} from "../../shared/config";

export type SessionBootstrap = {
  ok: boolean;
  checkpoint: "9";
  user: AppUser;
  role: RoleDefinition | null;
  access: Record<PermissionModuleKey, AccessLevel>;
  modules: ModuleState;
};

export type RemoteConfig = AppConfigSnapshot & {
  ok: boolean;
  error?: string;
};

type FetchSessionOptions = {
  force?: boolean;
};

let cachedSession: SessionBootstrap | null = null;
let pendingSession: Promise<SessionBootstrap> | null = null;

export function peekSession(): SessionBootstrap | null {
  return cachedSession;
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Permintaan gagal (${response.status})`);
  }
  return data;
}

export async function fetchSession(
  options: FetchSessionOptions = {},
): Promise<SessionBootstrap> {
  if (!options.force && cachedSession) return cachedSession;
  if (!options.force && pendingSession) return pendingSession;

  const request = fetch("/api/auth/login", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  })
    .then((response) => parseJson<SessionBootstrap>(response))
    .then((session) => {
      cachedSession = session;
      return session;
    })
    .catch((error) => {
      cachedSession = null;
      throw error;
    });

  pendingSession = request;
  try {
    return await request;
  } finally {
    if (pendingSession === request) pendingSession = null;
  }
}

export async function loginRemote(
  username: string,
  password: string,
): Promise<SessionBootstrap> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ username, password }),
  });
  const session = await parseJson<SessionBootstrap>(response);
  cachedSession = session;
  return session;
}

export async function logoutRemote(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  });
  try {
    await parseJson<{ ok: boolean }>(response);
  } finally {
    cachedSession = null;
    pendingSession = null;
  }
}

export async function fetchRemoteConfig(): Promise<RemoteConfig> {
  const response = await fetch("/api/config", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });
  return parseJson<RemoteConfig>(response);
}

export async function putRemoteConfig(partial: {
  modules?: ModuleState;
  roles?: RoleDefinition[];
  permissions?: RolePermissionState;
  users?: UserMutation[];
  configItems?: ConfigItemsState;
}): Promise<RemoteConfig> {
  const response = await fetch("/api/config", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(partial),
  });
  const config = await parseJson<RemoteConfig>(response);

  if (cachedSession) {
    const currentUser = config.users.find(
      (user) => user.id === cachedSession?.user.id,
    );
    if (!currentUser?.active) {
      cachedSession = null;
    } else {
      cachedSession = {
        ...cachedSession,
        user: currentUser,
        role:
          config.roles.find((role) => role.key === currentUser.role) ?? null,
        access: getRoleAccessMap(config.permissions, currentUser.role),
        modules: config.modules,
      };
    }
  }

  return config;
}
