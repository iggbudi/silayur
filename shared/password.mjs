// Workerd enforces a maximum of 100,000 PBKDF2 iterations in production.
const ITERATIONS = 100_000;
const KEY_LENGTH = 32;

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function derive(password, salt, iterations = ITERATIONS) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    material,
    KEY_LENGTH * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 10) {
    throw new Error("Password minimal 10 karakter.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return `pbkdf2-sha256$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== "string" || typeof encoded !== "string") return false;
  const [algorithm, iterationsRaw, saltRaw, expectedRaw] = encoded.split("$");
  const iterations = Number(iterationsRaw);
  if (
    algorithm !== "pbkdf2-sha256" ||
    !Number.isSafeInteger(iterations) ||
    iterations < 100_000 ||
    !saltRaw ||
    !expectedRaw
  ) {
    return false;
  }

  try {
    const actual = await derive(password, base64ToBytes(saltRaw), iterations);
    const expected = base64ToBytes(expectedRaw);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) {
      difference |= actual[index] ^ expected[index];
    }
    return difference === 0;
  } catch {
    return false;
  }
}

export async function hashSessionToken(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return bytesToBase64(new Uint8Array(digest));
}

export function createSessionToken() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
