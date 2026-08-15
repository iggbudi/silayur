import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const devVarsPath = path.join(root, ".dev.vars");
const gitignorePath = path.join(root, ".gitignore");

const keys = new Set(["DATABASE_URL"]);
const out = {};

if (!existsSync(envPath)) {
  console.error("Missing .env — copy .env.example first.");
  process.exitCode = 1;
  process.exit();
}

for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) continue;
  const key = trimmed.slice(0, eq).trim();
  if (!keys.has(key)) continue;
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  out[key] = value;
}

if (!out.DATABASE_URL) {
  console.error("DATABASE_URL missing in .env");
  process.exitCode = 1;
  process.exit();
}

const body =
  Object.entries(out)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n";

writeFileSync(devVarsPath, body, "utf8");

const gitignore = existsSync(gitignorePath)
  ? readFileSync(gitignorePath, "utf8")
  : "";
if (!gitignore.includes(".dev.vars")) {
  appendFileSync(
    gitignorePath,
    "\n# Cloudflare/Wrangler local secrets\n.dev.vars\n",
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      action: "sync-dev-vars",
      keys: Object.keys(out),
      host: out.DATABASE_URL.replace(/^postgres(ql)?:\/\/([^@/]+)@/, "").split(
        "/",
      )[0],
    },
    null,
    2,
  ),
);
