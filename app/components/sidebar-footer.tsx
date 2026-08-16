"use client";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Footer sidebar standar (avatar inisial, nama, role, tombol Keluar).
 * Dipakai semua halaman agar posisi & tampilan konsisten — footer selalu
 * di pojok kiri bawah sidebar.
 */
export function SidebarFooter({
  name,
  roleLabel,
  onLogout,
}: {
  name: string;
  roleLabel: string;
  onLogout: () => void;
}) {
  return (
    <div className="sidebar-footer">
      <div className="avatar">{getInitials(name)}</div>
      <div>
        <strong>{name}</strong>
        <span>{roleLabel}</span>
      </div>
      <div className="sidebar-footer-actions">
        <button className="logout-button" type="button" onClick={onLogout}>
          Keluar
        </button>
      </div>
    </div>
  );
}
