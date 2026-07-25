"use client";

const BENIGN_RESIZE_OBSERVER_MESSAGES = new Set([
  "ResizeObserver loop completed with undelivered notifications.",
  "ResizeObserver loop limit exceeded",
]);

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  window.addEventListener(
    "error",
    (event) => {
      if (!BENIGN_RESIZE_OBSERVER_MESSAGES.has(event.message)) return;

      // Browsers report this layout warning as a window error. vinext's dev
      // overlay treats every window error as fatal even though rendering can
      // safely continue.
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
}

export function DevRuntimeGuard() {
  return null;
}
