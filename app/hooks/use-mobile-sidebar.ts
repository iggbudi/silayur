"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

const DESKTOP_BREAKPOINT = 820;

/** Elemen yang bisa menerima fokus di dalam drawer (untuk jebakan Tab). */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export type MobileSidebarController = {
  open: boolean;
  close: () => void;
  toggle: () => void;
  /** Ref ke elemen <aside> drawer — pasang di MobileDrawer. */
  drawerRef: RefObject<HTMLElement | null>;
  /** Ref ke tombol hamburger — pasang di MobileMenuButton. */
  triggerRef: RefObject<HTMLButtonElement | null>;
};

/**
 * State drawer mobile: buka/tutup, kunci scroll body, tutup via Escape,
 * auto-tutup saat layar melewati breakpoint desktop, plus jebakan fokus
 * (Tab tidak boleh keluar dari drawer) dan pemulihan fokus ke tombol
 * hamburger saat drawer ditutup.
 */
export function useMobileSidebar(): MobileSidebarController {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    if (!open) return;

    const drawer = drawerRef.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    // Pindahkan fokus ke dalam drawer (tombol tutup bila ada) agar konteks
    // keyboard pindah ke dialog.
    const initialFocus =
      drawer?.querySelector<HTMLElement>(".sidebar-close-button") ?? drawer;
    initialFocus?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab" || !drawer) return;

      const focusables = Array.from(
        drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      // Jebakan Tab: wrap dari elemen pertama ke terakhir (dan sebaliknya).
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handleResize() {
      if (window.innerWidth > DESKTOP_BREAKPOINT) close();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      // Kembalikan fokus ke tombol yang membuka drawer.
      previouslyFocused?.focus();
    };
  }, [close, open]);

  return { open, close, toggle, drawerRef, triggerRef };
}
