/**
 * PUBLIC API untuk slice "auth".
 *
 * Slice ini bertanggung jawab untuk: login, logout, session, password.
 *
 * File lain HANYA boleh import dari "./index.ts" ini, bukan langsung ke
 * internal (`db/auth-repo`, `shared/password.mjs`, dll).
 *
 * File yang menjadi anggota slice ini:
 * - db/auth-repo.ts            (server-side auth & session)
 * - shared/password.mjs        (crypto: hash, verify, session token)
 * - app/login/page.tsx         (login UI)
 * - app/api/auth/              (API routes: login, logout)
 * - app/hooks/use-session.ts   (client-side session hook)
 * - app/components/session-gate.tsx (loading/redirect component)
 */

// ============================================================================
// SERVER (digunakan di API routes & server actions)
// ============================================================================

// Auth repo (server-side)
export {
  authenticateWithPassword,
  createAuthSession,
  resolveRequestUser,
  requireRequestUser,
  revokeRequestSession,
  sessionCookie,
  clearedSessionCookie,
  SESSION_COOKIE_NAME,
  AuthenticationError,
} from "../../../db/auth-repo";

// Password & session token primitives
export {
  hashPassword,
  verifyPassword,
  hashSessionToken,
  createSessionToken,
} from "../../../shared/password.mjs";

// ============================================================================
// TYPES (dipakai client & server)
// ============================================================================

export type { AppUser } from "../../../shared/config";
