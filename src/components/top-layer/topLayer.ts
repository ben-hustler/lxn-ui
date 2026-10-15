import './top-layer.css';

// Floating panels (dropdowns, menus, confirm popovers) live in the browser's
// top layer (2026-10-15), not in a <body> portal. The panel stays where it's
// rendered in the DOM, so it inherits the consumer's CSS variables and fonts
// even when they're scoped to a component root, and the top layer puts it
// above every z-index, overflow clip and transformed ancestor — a consumer's
// pop-up included. The portal made each consumer re-declare tokens on
// `body > .panel` and lift the panel's z-index over its own modal.
//
// Manual popovers (`popover="manual"`), so each component keeps its own
// dismissal rules. Where the Popover API is missing (jsdom, very old browsers)
// the panel just stays in place, positioned as before.

/** Add to a panel's className: zeroes the UA's [popover] styling. */
export const TOP_LAYER_CLASS = 'lxn-top-layer';

/** Lifts `panel` into the top layer. Call from a layout effect, before measuring. */
export function showInTopLayer(panel: HTMLElement): void {
  if (typeof panel.showPopover !== 'function') return;
  panel.setAttribute('popover', 'manual');
  if (isInTopLayer(panel)) return;
  try {
    panel.showPopover();
  } catch {
    // Detached mid-render: it stays in place, which still works.
  }
}

function isInTopLayer(panel: HTMLElement): boolean {
  try {
    return panel.matches(':popover-open');
  } catch {
    // jsdom doesn't know the pseudo-class.
    return false;
  }
}

// Same technique as Tooltip's own snapToDevicePixel (tooltip-core.ts).
// Math.round() alone snaps to whole CSS pixels, which aren't whole DEVICE
// pixels once devicePixelRatio != 1 (125%/150% Windows scaling is the common
// case) — the compositor then anti-aliases the panel at a fractional physical
// pixel, reading as blur (reported 2026-08-11 as "the popover is blurry").
export function snapToDevicePixel(px: number): number {
  const dpr = window.devicePixelRatio || 1;
  return Math.round(px * dpr) / dpr;
}

/**
 * Moves a `position: absolute; top: 0; left: 0` panel so its top-left sits at
 * a viewport point. Absolute, not fixed, for panels with an input — see
 * PATTERNS.md (iOS keyboard). In the top layer the containing block is the
 * initial containing block, so that's document coordinates. In the fallback
 * it's the nearest positioned ancestor.
 */
export function placeAbsolute(panel: HTMLElement, left: number, top: number): void {
  let originX = -window.scrollX;
  let originY = -window.scrollY;
  if (!isInTopLayer(panel)) {
    const container = panel.offsetParent as HTMLElement | null;
    if (container && getComputedStyle(container).position !== 'static') {
      const cRect = container.getBoundingClientRect();
      originX = cRect.left + container.clientLeft - container.scrollLeft;
      originY = cRect.top + container.clientTop - container.scrollTop;
    }
  }
  panel.style.transform = `translate3d(${snapToDevicePixel(left - originX)}px, ${snapToDevicePixel(top - originY)}px, 0)`;
}
