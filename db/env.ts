export type DbEnv = {
  url: string;
  configured: boolean;
};

/** Resolve PostgreSQL connection URL dari environment. */
export function resolveDbEnv(
  env: Record<string, string | undefined> = process.env,
): DbEnv {
  const url = env.DATABASE_URL?.trim();
  return {
    url: url ?? "",
    configured: Boolean(url),
  };
}
