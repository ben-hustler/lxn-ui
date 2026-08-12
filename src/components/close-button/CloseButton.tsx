import type { ButtonHTMLAttributes } from 'react';
import { CloseIcon } from '../icons/icons';
import './close-button.css';

interface CloseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon size in px. Default 20, matching every current consumer. */
  size?: number;
}

// Icon-only dismiss button for modal/popup shells (appraisal-offer's
// OfferModal, appraisal-customer's PopupShell) — ✕ glyph, hover tint.
// Chrome size/shape (36px square on this branch, 44px circle on
// mobile-inspired — see close-button.css) is a branch-specific look, not
// part of this component's contract. Deliberately owns chrome only, not
// placement: every current consumer fixes this to a viewport corner with
// its own responsive top/right insets tied to that modal's own layout, so
// positioning stays the consumer's job via `className`, same as this
// component's own icon size staying a prop rather than baked in.
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
