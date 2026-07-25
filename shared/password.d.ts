export function hashPassword(password: string): Promise<string>;
export function verifyPassword(
  password: string,
  encoded: string | null | undefined,
): Promise<boolean>;
export function hashSessionToken(token: string): Promise<string>;
export function createSessionToken(): string;
