import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

let envFileLoaded = false;

/** Best-effort load of dashboard `.env` when process.env lacks Turso keys (Node only). */
function ensureDotEnvLoaded() {
  if (envFileLoaded) return;
  envFileLoaded = true;
  if (typeof process === "undefined" || !process.versions?.node) return;
  if (process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL) return;

  try {
    const candidates = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), ".dev.vars"),
    ];
    for (const file of candidates) {
      if (!existsSync(file)) continue;
      const raw = readFileSync(file, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = value;
      }
      break;
    }
  } catch {
    // Workers or restricted FS — ignore
  }
}

/** Read Turso credentials from process.env (Worker injects via worker/index.ts). */
export function readRuntimeEnv(name: string): string | undefined {
  ensureDotEnvLoaded();
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getTursoRuntimeCredentials() {
  ensureDotEnvLoaded();
  const url =
    readRuntimeEnv("TURSO_DATABASE_URL") ?? readRuntimeEnv("LIBSQL_URL");
  const authToken =
    readRuntimeEnv("TURSO_AUTH_TOKEN") ?? readRuntimeEnv("LIBSQL_AUTH_TOKEN");

  if (!url) {
    return {
      ok: false as const,
      error: "TURSO_DATABASE_URL is not set in the runtime environment.",
    };
  }

  const isRemote = url.startsWith("libsql://") || url.startsWith("https://");
  if (isRemote && !authToken) {
    return {
      ok: false as const,
      error: "TURSO_AUTH_TOKEN is required for remote Turso access.",
    };
  }

  return {
    ok: true as const,
    url,
    authToken,
    mode: isRemote ? ("remote" as const) : ("local-file" as const),
  };
}
