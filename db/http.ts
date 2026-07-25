export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, { status: 200, ...init });
}

export function jsonError(
  error: unknown,
  status = 500,
  extra?: Record<string, unknown>,
): Response {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unexpected server error";
  const publicMessage =
    status >= 500 && process.env.NODE_ENV === "production"
      ? "Layanan sedang bermasalah. Silakan coba kembali."
      : message;
  return Response.json(
    { ok: false, error: publicMessage, ...extra },
    { status },
  );
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (origin !== new URL(request.url).origin) {
    throw new Error("Permintaan lintas origin ditolak.");
  }
}
