import Link from "next/link";

export function SessionGate({
  title = "Memuat sesi…",
  message = "Mengalihkan ke halaman masuk bila sesi tidak tersedia.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <main className="session-gate">
      <div className="session-gate-card">
        <h1>{title}</h1>
        <p>{message}</p>
        <Link href="/login">Buka login</Link>
      </div>
    </main>
  );
}
