// Shared icon set — Lucide (ISC licensed), stroke-only, verbatim path data.
// One file, all icons, same convention appraisal-offer/appraisal-customer
// each used to keep locally in their own icons.tsx — fully centralized here
// as of 2026-08-12 (see lxn-ui/src/components/icons/ICONS.md for the full
// name → source-glyph → license table and notes on what changed visually).
//
// Default stroke is 1.7, not Lucide's own default of 2 — matches the
// "Appraisal Mobile" mockup's own Icon wrapper exactly (its components.jsx:
// "Lucide-style outline, 24x24, 1.7px stroke"), which is the reference this
// set is being built against.
//
// Every glyph below is named for what it's used FOR (matching the existing
// List/Pencil/Trash/Check convention), not for its literal Lucide name —
// ICONS.md is the map from one to the other.

import type { ReactNode, SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height' | 'stroke'> {
  size?: number;
  stroke?: number;
}

function Icon({ size = 24, stroke = 1.7, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** History — Lucide's `list` glyph: three lines + three `.01`-radius dots. */
export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Icon>
  );
}

/** Edit — Lucide's classic `edit` glyph: an outlined page with a pencil
   overlapping its corner. Lucide has since renamed/replaced this with
   `square-pen` (a different pictograph — just a corner pen, no page), but
   this path is the real, widely-shipped pre-rename `edit` glyph, not an
   invented one — kept because it reads more clearly as "edit this record"
   at the sizes this app uses it at than the newer corner-pen glyph does. */
export function PencilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Icon>
  );
}

/** Remove/delete — Lucide's `trash` glyph (the plain variant, no inner
   vertical lines — `trash-2` has those, this doesn't). */
export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </Icon>
  );
}

/** Plain checkmark — Lucide's `check` glyph, no circle around it. Used for
   StatusBadge's "Selected" state and for HistoryCard's inline "CURRENT" tag
   (that tag's own chip supplies any background/color — see 4a mock's
   `barIsSelected` branch — so the icon itself just needs to be a checkmark,
   not a second nested circle-plus-check; a separate `SelectedCheckIcon` with
   its own filled circle used to exist for this and was retired 2026-08-12
   as a duplicate of this glyph). */
export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  );
}

/** Search field's magnifying glass — Lucide's `search` glyph, verbatim. */
export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.34-4.34" />
    </Icon>
  );
}

/** Inline info/tooltip trigger — Lucide's `info` glyph, verbatim. Previously
   two near-duplicate filled circle+"i" glyphs existed (one per project,
   identical path data) that weren't sourced from any real icon set; both
   retired 2026-08-12 in favor of this one shared stroke version. */
export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </Icon>
  );
}

/** HistoryCard's "opens a different appraisal entirely" row glyph — Lucide's
   `arrow-up-right` glyph, verbatim. */
export function ExternalArrowIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </Icon>
  );
}

/** "View Offer" button's external-link glyph — Lucide's `external-link`
   glyph, verbatim. */
export function ViewOfferIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </Icon>
  );
}

/** History/Edit view's "Back" link — Lucide's `chevron-left` glyph,
   verbatim. */
export function BackArrowIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m15 18-6-6 6-6" />
    </Icon>
  );
}

/** Dropdown/pill chevron — Lucide's `chevron-down` glyph, verbatim. */
export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

/** Expand-all/collapse-all toggle (appraisal-customer-page) — Google
   Material Icons' filled `keyboard_double_arrow_down` glyph, verbatim.
   Named for the glyph, not the use (matching ChevronDownIcon's own
   convention) — Material rather than Lucide because that's what was asked
   for verbatim (2026-08-28); Lucide's own equivalent is `chevrons-down`. */
export function ChevronsDownIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <polygon points="18,6.41 16.59,5 12,9.58 7.41,5 6,6.41 12,12.41" />
      <polygon points="18,13 16.59,11.59 12,16.17 7.41,11.59 6,13 12,19" />
    </svg>
  );
}

/** Full-mode card's circle "+" icon — Google Material Icons' filled
   `add_circle` glyph, verbatim (kept as filled Material rather than
   migrated to Lucide's stroke `circle-plus` — explicit call 2026-08-12 to
   leave this one as it was). */
export function AddCircleIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
    </svg>
  );
}

/** Bare "+" (no circle of its own) — Google Material Icons' filled `add`
   glyph, verbatim. Find's "New Customer" row badge draws its own round
   background, so this can't be AddCircleIcon above without doubling up two
   circles. Kept as filled Material rather than migrated to Lucide's stroke
   `plus` — same explicit call as AddCircleIcon above. */
export function PlusIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );
}

/** Reset (amount pill) and Undo (tentative bubble) — same glyph for both,
   per v1's Offer Modal Prototype. Lucide's `rotate-ccw` glyph, verbatim —
   the counter-clockwise direction is what reads as "undo/reset" rather than
   "refresh" (Lucide's clockwise `rotate-cw`), matching what this glyph
   means in both of its uses here. */
export function ResetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </Icon>
  );
}

/** StepIncompleteNotice's leading glyph — Lucide's `circle-alert` glyph,
   verbatim (outlined circle + exclamation mark, matching the production
   banner's real icon in spirit — a grey outlined circle with "!", not a
   filled warning triangle). */
export function WarningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </Icon>
  );
}

/** "Auto-assigned" indicator — Google Material Icons' filled `auto_fix_high`
   glyph, verbatim (the magic-wand-with-sparkles glyph). Sits beside a value
   that the server picked automatically rather than a person selecting it —
   kept as filled Material for the same reason as AddCircleIcon/PlusIcon/
   CloseIcon above (this set mixes stroke Lucide glyphs with a handful of
   filled Material ones by deliberate per-glyph choice, not by convention). */
export function AutoFixHighIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29c-.39-.39-1.02-.39-1.41 0L1.29 18.96c-.39.39-.39 1.02 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05c.39-.39.39-1.02 0-1.41l-2.33-2.35zm-1.03 5.49l-2.12-2.12 2.44-2.44 2.12 2.12-2.44 2.44z" />
    </svg>
  );
}

/** Dismiss glyph for anything that isn't CloseButton's own chrome (e.g.
   ErrorBanner's inline dismiss, which owns its own small transparent button
   and just needs the bare glyph) — Google Material Design's "close" glyph,
   filled, verbatim. Picked 2026-08-10 (see CloseButton.tsx) as canonical
   over a stroked-two-line X that had silently drifted from it despite a
   comment claiming the two matched exactly; CloseButton imports this same
   export rather than keeping its own copy. */
export function CloseIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}
