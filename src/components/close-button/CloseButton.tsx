import type { ButtonHTMLAttributes } from 'react';
import { CloseIcon } from '../icons/icons';
import './close-button.css';

interface CloseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon size in px. Default 20, matching every current consumer. */
  size?: number;
}

// Icon-only dismiss button for modal/popup shells — ✕ glyph, hover tint,
// meant to float fixed to a viewport corner (36px white square on this
// branch, 44px circle on mobile-inspired — see close-button.css).
//
// @deprecated 2026-08-18 — every consumer (appraisal-offer, -customer,
// -users) moved the ✕ to sit inside the modal card itself (top-right corner,
// or a sticky header on views that can scroll) instead of floating fixed to
// the viewport. That look is now just a bare `CloseIcon` in a plain button,
// styled locally per consumer rather than through this shared chrome — see
// each app's own `*-close-icon-btn` class. Left in place (unreleased, no
// version bump) since nothing currently imports it after that migration, but
// don't reach for it in new work.
export function CloseButton({ size = 20, className, ...rest }: CloseButtonProps) {
  return (
    <button
      type="button"
      aria-label="Close"
      className={className ? `lxn-close-btn ${className}` : 'lxn-close-btn'}
      {...rest}
    >
      <CloseIcon size={size} />
    </button>
  );
}
