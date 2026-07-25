import { and, eq } from "drizzle-orm";
import {
  createSessionToken,
  hashSessionToken,
  verifyPassword,
} from "../shared/password.mjs";
import type { AppUser } from "../shared/config";
import type { AppDb } from "./get-db";
import { authSessions, users } from "./schema";

export const SESSION_COOKIE_NAME = "silayur_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export class AuthenticationError extends Error {
  status: number;

  constructor(message = "Sesi tidak valid atau sudah berakhir.", status = 401) {
    super(message);
    this.name = "AuthenticationError";
    this.status = status;
  }
}

function parseCookies(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!header) return cookies;
  for (const item of header.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 1) continue;
    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    if (key) cookies.set(key, value);
  }
  return cookies;
}

export function sessionCookie(token: string, requestUrl: string): string {
  const secure = new URL(requestUrl).protocol === "https:";
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearedSessionCookie(requestUrl: string): string {
  const secure = new URL(requestUrl).protocol === "https:";
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function toAppUser(row: typeof users.$inferSelect): AppUser {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.roleKey,
    active: Boolean(row.active),
  };
}

export async function authenticateWithPassword(
  db: AppDb,
  username: string,
  password: string,
): Promise<AppUser | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized || !password) return null;
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.username, normalized), eq(users.active, true)))
    .limit(1);
  const row = rows[0];
  if (!row?.passwordHash) return null;
  const valid = await verifyPassword(password, row.passwordHash);
  return valid ? toAppUser(row) : null;
}

export async function createAuthSession(
  db: AppDb,
  userId: string,
): Promise<string> {
  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + SESSION_TTL_SECONDS * 1000,
  ).toISOString();
  await db.insert(authSessions).values({
    tokenHash,
    userId,
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt,
  });
  return token;
}

export async function resolveRequestUser(
  db: AppDb,
  request: Request,
): Promise<AppUser | null> {
  const token = parseCookies(request.headers.get("cookie")).get(
    SESSION_COOKIE_NAME,
  );
  if (!token) return null;
  const tokenHash = await hashSessionToken(token);
  const now = new Date().toISOString();

  const rows = await db
    .select({ session: authSessions, user: users })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(
      and(
        eq(authSessions.tokenHash, tokenHash),
        eq(users.active, true),
      ),
    )
    .limit(1);
  const match = rows[0];
  if (!match) return null;
  if (match.session.expiresAt <= now) {
    await db
      .delete(authSessions)
      .where(eq(authSessions.tokenHash, tokenHash));
    return null;
  }

  await db
    .update(authSessions)
    .set({ lastSeenAt: now })
    .where(eq(authSessions.tokenHash, tokenHash));
  return toAppUser(match.user);
}

export async function requireRequestUser(
  db: AppDb,
  request: Request,
): Promise<AppUser> {
  const user = await resolveRequestUser(db, request);
  if (!user) throw new AuthenticationError();
  return user;
}

export async function revokeRequestSession(
  db: AppDb,
  request: Request,
): Promise<void> {
  const token = parseCookies(request.headers.get("cookie")).get(
    SESSION_COOKIE_NAME,
  );
  if (!token) return;
  const tokenHash = await hashSessionToken(token);
  await db
    .delete(authSessions)
    .where(eq(authSessions.tokenHash, tokenHash));
}
