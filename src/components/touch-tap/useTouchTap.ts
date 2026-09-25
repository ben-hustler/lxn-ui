import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

// How far a finger can drift between down and up and still count as a tap
// rather than the start of a scroll/drag.
const TAP_SLOP_PX = 10;
// How long after a touch-driven activation any click is swallowed as that
// same tap's (possibly misrouted) compatibility click. Observed gap on iOS
// was ~80ms; generous so a slow device doesn't let one through.
const CLICK_SUPPRESS_MS = 800;

/** Activates a row/button on touch RELEASE instead of on `click`, for lists
 * people tap through quickly (MultiSelect options, calendar days).
 *
 * Why (2026-09-25, iOS Safari, confirmed with an on-device event log): tap
 * row A, then quickly tap row B. B gets the pointerdown/touchstart/touchend,
 * but iOS routes the follow-up compatibility mousedown + click to A, the
 * PREVIOUS tap's target, so a click-driven toggle un-picks A and B never
 * lands. `touch-action: manipulation` doesn't stop it. Pointer events are
 * targeted correctly, so for touch the action fires on pointerup, and every
 * click inside the suppression window after it is dropped, including a
 * misrouted one on a different row. Mouse, pen, keyboard and
 * assistive-tech clicks (no touch pointerdown before them) still go through
 * `click` as normal.
 *
 * One instance per list (the suppression window is shared across every row
 * bound from it, which is the point); `bind(action)` per row. */
export function useTouchTap() {
  const startRef = useRef<{ x: number; y: number; el: EventTarget } | null>(null);
  const suppressUntilRef = useRef(0);

  return {
    bind(action: () => void) {
      return {
        onPointerDown(e: ReactPointerEvent) {
          startRef.current = e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY, el: e.currentTarget } : null;
        },
        // iOS fires this once a touch turns into a scroll.
        onPointerCancel() {
          startRef.current = null;
        },
        onPointerUp(e: ReactPointerEvent) {
          const start = startRef.current;
          startRef.current = null;
          if (e.pointerType !== 'touch' || !start || start.el !== e.currentTarget) return;
          if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP_PX) return;
          suppressUntilRef.current = performance.now() + CLICK_SUPPRESS_MS;
          action();
        },
        onClick(_e: ReactMouseEvent) {
          if (performance.now() < suppressUntilRef.current) return;
          action();
        },
      };
    },
  };
}
