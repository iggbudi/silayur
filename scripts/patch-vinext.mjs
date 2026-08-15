/**
 * Patch vinext untuk Windows: cache key static asset harus memakai forward
 * slash. Tanpa patch ini, dist/standalone menyajikan /assets/* sebagai 404
 * karena key cache memakai backslash (path.sep Windows) sementara URL browser
 * memakai forward slash.
 *
 * Dipanggil dari postinstall (patch node_modules vinext) dan dari
 * start:local (patch copy vinext di dist/standalone setelah build).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TARGET_REL = [
  "node_modules/vinext/dist/server/static-file-cache.js",
  "dist/standalone/node_modules/vinext/dist/server/static-file-cache.js",
];

const PATCH_MARKER = 'relativePath.replaceAll("\\\\", "/")';

/** Ganti pola lama → baru tanpa peduli indentasi (regex per baris). */
function patchSource(source) {
  if (source.includes(PATCH_MARKER)) return source; // sudah di-patch
  const replacements = [
    [
      /(\t*const pathname = "\/" \+ )relativePath;/g,
      '$1relativePath.replaceAll("\\\\", "/");',
    ],
    [
      /(\t*const dirPath = "\/" \+ )relativePath\.slice\(0, -11\);/g,
      '$1relativePath.slice(0, -11).replaceAll("\\\\", "/");',
    ],
    [
      /(\t*const withoutExt = "\/" \+ )relativePath\.slice\(0, -ext\.length\);/g,
      '$1relativePath.slice(0, -ext.length).replaceAll("\\\\", "/");',
    ],
  ];
  let next = source;
  for (const [pattern, replacement] of replacements) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

let changed = false;

for (const rel of TARGET_REL) {
  const file = path.join(root, rel);
  if (!existsSync(file)) continue;
  const source = readFileSync(file, "utf8");
  const next = patchSource(source);
  if (next !== source) {
    writeFileSync(file, next, "utf8");
    changed = true;
    console.log(`[patch-vinext] di-patch: ${rel}`);
  }
}

if (!changed) {
  console.log("[patch-vinext] tidak ada file yang perlu di-patch (sudah atau tidak ada)");
}
