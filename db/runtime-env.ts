import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

let envFileLoaded = false;

/** Best-effort load of dashboard `.env` when process.env lacks DB keys (Node only). */
function ensureDotEnvLoaded() {
  if (envFileLoaded) return;
  envFileLoaded = true;
  if (typeof process === "undefined" || !process.versions?.node) return;
  if (process.env.DATABASE_URL) return;

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

/** Read DB credentials from process.env (Worker injects via worker/index.ts). */
export function readRuntimeEnv(name: string): string | undefined {
  ensureDotEnvLoaded();
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getRuntimeCredentials(): {
  ok: true;
  url: string;
} | {
  ok: false;
  error: string;
} {
  ensureDotEnvLoaded();
  const url = readRuntimeEnv("DATABASE_URL");

  if (!url) {
    return {
      ok: false,
      error: "DATABASE_URL is not set in the runtime environment.",
    };
  }

  return { ok: true, url };
}
