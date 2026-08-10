// Modal accessibility helper. On mount it remembers the previously-focused
// element and moves focus into the dialog; it traps Tab / Shift+Tab within the
// dialog, calls onClose on Escape, and restores focus to the opener on unmount.
// Attach the returned ref to the dialog's outermost element (give it tabIndex
// -1 so it can hold focus if it has no focusable children).
//
// Moved into lxn-ui 2026-08-10 — was hand-copied byte-for-byte into both
// appraisal-offer and appraisal-customer with zero drift between them.

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T | null>(null);
  // Keep the latest onClose without re-running the effect (callers pass inline
  // arrows that change identity every render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const opener = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );

    // Move focus into the dialog.
    (focusable()[0] ?? node).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, []);

  return ref;
}
