"use client";

import type { ReactNode, RefObject } from "react";

/**
 * Shell drawer sidebar untuk layar kecil: <aside> off-canvas + tombol tutup
 * + backdrop. Saat terbuka memakai ARIA dialog (jebakan fokus ditangani
 * `useMobileSidebar`); di desktop berperilaku sebagai sidebar statis biasa
 * (tombol tutup & backdrop disembunyikan oleh CSS).
 */
export function MobileDrawer({
  id,
  open,
  onClose,
  drawerRef,
  className = "",
  children,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  drawerRef: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <>
      <aside
        ref={drawerRef}
        id={id}
        className={`sidebar ${open ? "sidebar-open" : ""} ${className}`.trim()}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? "Menu navigasi" : undefined}
      >
        <button
          className="sidebar-close-button"
          type="button"
          aria-label="Tutup menu"
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </aside>
      {open ? (
        <button
          className="sidebar-backdrop"
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          aria-label="Tutup menu"
          onClick={onClose}
        />
      ) : null}
    </>
  );
}
