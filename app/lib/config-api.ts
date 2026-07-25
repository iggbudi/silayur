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

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(
      data.error ?? `Permintaan gagal (${response.status})`,
    );
  }
  return data;
}

export async function fetchSession(): Promise<SessionBootstrap> {
  const response = await fetch("/api/auth/login", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });
  return parseJson<SessionBootstrap>(response);
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
  return parseJson<SessionBootstrap>(response);
}

export async function logoutRemote(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  });
  await parseJson<{ ok: boolean }>(response);
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
  return parseJson<RemoteConfig>(response);
}
