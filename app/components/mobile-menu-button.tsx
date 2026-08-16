"use client";

import type { RefObject } from "react";

/**
 * Tombol hamburger untuk membuka/tutup drawer mobile. `controls` wajib
 * menunjuk ke `id` dari MobileDrawer yang dibukanya.
 */
export function MobileMenuButton({
  open,
  onToggle,
  controls,
  triggerRef,
}: {
  open: boolean;
  onToggle: () => void;
  controls: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={triggerRef}
      className="menu-button"
      type="button"
      aria-label={open ? "Tutup menu" : "Buka menu"}
      aria-controls={controls}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={onToggle}
    >
      ☰
    </button>
  );
}
