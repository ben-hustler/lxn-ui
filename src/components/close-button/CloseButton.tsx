import type { ButtonHTMLAttributes } from 'react';
import './close-button.css';

interface CloseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon size in px. Default 20, matching every current consumer. */
  size?: number;
}

// Material Design "close" glyph, picked 2026-08-10 as canonical over
// appraisal-customer's stroked-two-line X — the two had silently drifted
// despite a comment in appraisal-offer's own icons.tsx claiming they matched
// exactly.
function CloseGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}

// Icon-only dismiss button for modal/popup shells (appraisal-offer's
// OfferModal, appraisal-customer's PopupShell) — 36px square, ✕ glyph,
// hover tint. Deliberately owns chrome only, not placement: every current
// consumer fixes this to a viewport corner with its own responsive
// top/right insets tied to that modal's own layout, so positioning stays
// the consumer's job via `className`, same as this component's own size
// staying a prop rather than baked in.
export function CloseButton({ size = 20, className, ...rest }: CloseButtonProps) {
  return (
    <button
      type="button"
      aria-label="Close"
      className={className ? `lxn-close-btn ${className}` : 'lxn-close-btn'}
      {...rest}
    >
      <CloseGlyph size={size} />
    </button>
  );
}
