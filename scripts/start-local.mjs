/**
 * Jalankan server standalone dengan env lokal dari .env (mode file).
 * Menimpa TURSO_DATABASE_URL/TURSO_AUTH_TOKEN dari .env agar tidak
 * terpengaruh env remote yang mungkin masih tersisa di shell.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Baca .env sederhana (key=value, abaikan # dan kosong). */
function loadDotEnv() {
  const env = { ...process.env };
  try {
    const raw = readFileSync(path.join(root, ".env"), "utf8");
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
      env[key] = value;
    }
  } catch {
    // .env opsional
  }
  return env;
}

const serverPath = path.join(root, "dist", "standalone", "server.js");
const child = spawn(process.execPath, [serverPath], {
  cwd: root,
  env: loadDotEnv(),
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
