import { useEffect, useMemo, type ReactNode } from 'react';
import { TooltipController } from './tooltip-core';

interface TooltipProps {
  text: string;
  children: ReactNode;
  className?: string;
}

// Generic hover/focus tooltip anchor. Wrap any element — an info icon, a
// stale pill, a status dot — the anchor's own markup is untouched; the
// tooltip itself is an imperatively managed DOM node outside React (see
// tooltip-core.ts), not a per-hover portal mount/unmount.
export function Tooltip({ text, children, className }: TooltipProps) {
  // One controller per <Tooltip> instance — cheap (just three DOM nodes,
  // lazily created on first show()), and avoids cross-instance show/hide
  // races that a single page-wide singleton would have on rapid hover.
  const controller = useMemo(() => new TooltipController(), []);

  useEffect(() => () => controller.destroy(), [controller]);

  // tabIndex makes this focusable on purpose (keyboard-accessible tooltip
  // reveal, not just hover) — DO NOT nest this inside a <label> that's
  // associated with a different form control (e.g. wrapping a phone/email
  // <input>'s label text + an info icon in the same <label>). A focusable
  // element inside such a label competes with the label's native "click
  // anywhere → focus the input" behavior, breaking the input's own click
  // target (appraisal-customer's Phone/Email "i" icons, 2026-08-06 — see
  // CreateCustomerCard.tsx: the fix was making <Tooltip> a SIBLING of the
  // <label>, not a descendant, not changing anything here). If this needs
  // to sit visually next to a label's text, keep it out of the <label>
  // element itself.
  return (
    <span
      className={className}
      tabIndex={0}
      onMouseEnter={(e) => controller.show(e.currentTarget, text)}
      onMouseLeave={() => controller.hide()}
      onFocus={(e) => controller.show(e.currentTarget, text)}
      onBlur={() => controller.hide()}
    >
      {children}
    </span>
  );
}
