import path from "node:path";

export type TursoEnv = {
  url: string;
  authToken: string | undefined;
  mode: "remote" | "local-file";
  configured: boolean;
};

const DEFAULT_LOCAL_URL = "file:./.data/silayur.db";

/**
 * Resolve Turso/libSQL connection settings.
 * - Prefer TURSO_DATABASE_URL (+ optional TURSO_AUTH_TOKEN) for cloud.
 * - Fall back to a local SQLite file so migrate/seed work offline.
 */
export function resolveTursoEnv(
  env: Record<string, string | undefined> = process.env,
): TursoEnv {
  const url =
    (typeof env.TURSO_DATABASE_URL === "string" &&
    env.TURSO_DATABASE_URL.trim()
      ? env.TURSO_DATABASE_URL.trim()
      : undefined) ??
    (typeof env.LIBSQL_URL === "string" && env.LIBSQL_URL.trim()
      ? env.LIBSQL_URL.trim()
      : undefined) ??
    DEFAULT_LOCAL_URL;

  const authToken =
    (typeof env.TURSO_AUTH_TOKEN === "string" && env.TURSO_AUTH_TOKEN.trim()
      ? env.TURSO_AUTH_TOKEN.trim()
      : undefined) ??
    (typeof env.LIBSQL_AUTH_TOKEN === "string" && env.LIBSQL_AUTH_TOKEN.trim()
      ? env.LIBSQL_AUTH_TOKEN.trim()
      : undefined);

  const isRemote = url.startsWith("libsql://") || url.startsWith("https://");
  const isLocalFile = url.startsWith("file:");

  return {
    url,
    authToken,
    mode: isRemote ? "remote" : "local-file",
    configured: isRemote ? Boolean(authToken) : isLocalFile || Boolean(url),
  };
}

export function localDbFilePath(url: string = DEFAULT_LOCAL_URL): string {
  const raw = url.startsWith("file:") ? url.slice("file:".length) : url;
  return path.resolve(raw);
}

export { DEFAULT_LOCAL_URL };
