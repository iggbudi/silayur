"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/** Jarak geser ke kanan (px) agar drawer ditutup. */
const SWIPE_DISTANCE = 72;
/** Kecepatan minimum (px/ms) agar sentakan cepat menutup drawer. */
const SWIPE_VELOCITY = 0.5;

type DragState = {
  active: boolean;
  startX: number;
  startY: number;
  offsetX: number;
  locked: boolean;
  lastX: number;
  lastTime: number;
  velocity: number;
};

const IDLE: DragState = {
  active: false,
  startX: 0,
  startY: 0,
  offsetX: 0,
  locked: false,
  lastX: 0,
  lastTime: 0,
  velocity: 0,
};

/**
 * Swipe-to-close untuk drawer mobile (geser ke kanan).
 *
 * Memakai Pointer Events dan butuh `touch-action: pan-y` pada `.sidebar`
 * (lihat CSS) supaya scroll vertikal di dalam drawer tetap berjalan native
 * dan hanya geser horizontal yang ditangani di sini. Saat drag, drawer
 * mengikuti jari via transform inline; saat dilepas, transform dikosongkan
 * sehingga transisi CSS menganimasikan kembali posisi semula atau menutup.
 */
export function useDrawerSwipe(
  drawerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  onClose: () => void,
) {
  const dragRef = useRef<DragState>(IDLE);

  useEffect(() => {
    if (!enabled) return;
    const drawerRefCurrent = drawerRef.current;
    if (!drawerRefCurrent) return;
    // Anotasi eksplisit agar narrowing tetap berlaku di dalam closure.
    const drawer: HTMLElement = drawerRefCurrent;

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType !== "touch") return;
      dragRef.current = {
        active: true,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: 0,
        locked: false,
        lastX: event.clientX,
        lastTime: event.timeStamp,
        velocity: 0,
      };
      drawer.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag.active) return;

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;

      // Tentukan arah setelah melewati ambang kecil (10px).
      if (!drag.locked) {
        if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return;
        const horizontal = Math.abs(deltaX) > Math.abs(deltaY);
        if (!horizontal || deltaX <= 0) {
          // Scroll vertikal atau geser ke kiri → biarkan perilaku bawaan.
          drag.active = false;
          return;
        }
        drag.locked = true;
      }

      const elapsed = Math.max(1, event.timeStamp - drag.lastTime);
      drag.velocity = (event.clientX - drag.lastX) / elapsed;
      drag.lastX = event.clientX;
      drag.lastTime = event.timeStamp;

      const maxDrag = drawer.offsetWidth * 0.6;
      drag.offsetX = Math.min(deltaX, maxDrag);
      drawer.style.transition = "none";
      drawer.style.transform = `translateX(${drag.offsetX}px)`;
    }

    function endDrag(shouldClose: boolean) {
      const drag = dragRef.current;
      if (!drag.active) return;
      drag.active = false;
      // Kosongkan transform inline → transisi CSS mengambil alih animasi.
      drawer.style.transition = "";
      drawer.style.transform = "";
      if (shouldClose) onClose();
    }

    function onPointerUp() {
      const drag = dragRef.current;
      if (!drag.active) return;
      const shouldClose =
        drag.offsetX > SWIPE_DISTANCE || drag.velocity > SWIPE_VELOCITY;
      endDrag(shouldClose);
    }

    function onPointerCancel() {
      endDrag(false);
    }

    drawer.addEventListener("pointerdown", onPointerDown);
    drawer.addEventListener("pointermove", onPointerMove);
    drawer.addEventListener("pointerup", onPointerUp);
    drawer.addEventListener("pointercancel", onPointerCancel);
    return () => {
      drawer.removeEventListener("pointerdown", onPointerDown);
      drawer.removeEventListener("pointermove", onPointerMove);
      drawer.removeEventListener("pointerup", onPointerUp);
      drawer.removeEventListener("pointercancel", onPointerCancel);
      drawer.style.transition = "";
      drawer.style.transform = "";
      dragRef.current = IDLE;
    };
  }, [drawerRef, enabled, onClose]);
}
