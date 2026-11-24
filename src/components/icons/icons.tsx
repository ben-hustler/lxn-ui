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

/** Success/confirmed status glyph — Google Material Icons Rounded'
   `check_circle` glyph, verbatim (path as exported from the Appraisal
   Webcomps Figma, node 71:683). Filled with currentColor, so the caller sets
   the color. First use: appraisal-offer's "Accepted Offer" heading. */
export function CheckCircleIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM9.29 16.29L5.7 12.7C5.31 12.31 5.31 11.68 5.7 11.29C6.09 10.9 6.72 10.9 7.11 11.29L10 14.17L16.88 7.29C17.27 6.9 17.9 6.9 18.29 7.29C18.68 7.68 18.68 8.31 18.29 8.7L10.7 16.29C10.32 16.68 9.68 16.68 9.29 16.29Z" />
    </svg>
  );
}

/** Price-tag glyph — Google Material Icons' filled `sell` glyph, verbatim
   (path from @material-design-icons/svg filled/sell.svg; same shape as
   fonts.gstatic.com materialicons/sell/v6). Filled with
   currentColor, so the caller sets the color. First use: appraisal-offer's
   location picker, beside locations that have an offer. */
export function SellIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="m21.41 11.41-8.83-8.83c-.37-.37-.88-.58-1.41-.58H4c-1.1 0-2 .9-2 2v7.17c0 .53.21 1.04.59 1.41l8.83 8.83c.78.78 2.05.78 2.83 0l7.17-7.17c.78-.78.78-2.04-.01-2.83zM6.5 8C5.67 8 5 7.33 5 6.5S5.67 5 6.5 5 8 5.67 8 6.5 7.33 8 6.5 8z" />
    </svg>
  );
}

/** Print glyph — Google Material Icons' filled `local_printshop` glyph,
   verbatim. Same printer lxn-pdf-generator's offer sheet (and lxn-doc-viewer)
   already use for their own Print/Download actions. First use:
   appraisal-offer's accepted-state "Print Offer" button. */
export function PrintIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
    </svg>
  );
}

/** DateRangePicker's date-display trigger glyph — Lucide's `calendar` glyph,
   verbatim. */
export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </Icon>
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

/** Filter button glyph (Internal Comps header, 2026-09-08) — Bootstrap
   Icons' `sliders` glyph, verbatim. Not a Lucide/Material glyph like every
   other icon in this file, and that's fine: this set's actual rule (per
   ICONS.md) is "verbatim copy of a real, published icon, tracked here," not
   "must all come from one library" — Bootstrap's `sliders` is the real
   glyph a stakeholder pointed at (three rows, each a line + an offset round
   handle), and neither Lucide's `sliders-vertical` (a different, vertical-
   bars pictograph) nor a redrawn approximation matches it. Native 16x16
   viewBox kept as-is rather than force-fit to this file's usual 24x24 —
   verbatim means the real path data, not a resized copy of it. */
export function SlidersIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...rest}>
      <path
        fillRule="evenodd"
        d="M11.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M9.05 3a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0V3zM4.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M2.05 8a2.5 2.5 0 0 1 4.9 0H16v1H6.95a2.5 2.5 0 0 1-4.9 0H0V8zm9.45 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-2.45 1a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0v-1z"
      />
    </svg>
  );
}

/** "Return to the app" glyph — Google Material Symbols Outlined
   `exit_to_app` (weight 400, 24px), verbatim: a box with an arrow entering
   it from the left. Material Symbols draws on a 960-unit grid with its origin
   at the bottom-left, so the native `0 -960 960 960` viewBox is kept, as
   SlidersIcon keeps its own. First use: the vehicle component's create-mode
   "Save and: Return" button (Appraisal Webcomps Figma, node 2331:793). */
export function ReturnToAppIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M200-120q-33 0-56.5-23.5T120-200v-160h80v160h560v-560H200v160h-80v-160q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm220-160-56-58 102-102H120v-80h346L364-622l56-58 200 200-200 200Z" />
    </svg>
  );
}

/** Loading spinner glyph — Lucide's `loader-circle` glyph verbatim (a single
   ~270° arc, not a full ring), so a caller's own CSS rotation reads as
   continuous spinning rather than a static "C". No motion of its own — see
   SelectTriggerChrome's `.lxn-select-trigger-spinner` for the animation. */
export function LoaderIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </Icon>
  );
}

/** Email / Send glyph — Google Material Icons' filled `mail` glyph, verbatim
   (path from @material-design-icons/svg filled/mail.svg). Filled with
   currentColor. First use: appraisal-offer's Send button and the
   individual-sections modal's email action (carried over from the Lit offer
   sheet, which used the same Material glyph). */
export function MailIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}

/** "More" (horizontal ellipsis) glyph — Google Material Icons' filled
   `more_horiz` glyph, verbatim. First use: appraisal-offer's Preview card,
   opening the individual-sections modal. */
export function MoreHorizIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}

/** Left arrow (shaft + head) — Lucide's `arrow-left` glyph, verbatim. Not
   BackArrowIcon, which is a bare chevron: Figma's "Return to appraisal" link
   shows a full arrow. First use: appraisal-offer's Offer card. */
export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </Icon>
  );
}

/** Locked glyph — Lucide's `lock` glyph, verbatim. First use:
   appraisal-offer's locked-Customize notice (replaces the Lit offer sheet's
   hand-drawn 13px lock). */
export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Icon>
  );
}

/** Drag handle (2x3 dots) — Google Material Icons' filled `drag_indicator`
   glyph, verbatim. Filled Material rather than Lucide's stroke
   `grip-vertical` because Lucide's r=1 stroked dots vanish at the 14–16px
   this is used at. First use: appraisal-offer's Layout section rows. */
export function DragHandleIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}

/** Vertical double arrow — Google Material Icons' filled `height` glyph,
   verbatim. First use: appraisal-offer's amount scrubber (hold + drag
   vertically to change the offer amount). */
export function HeightIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M13 6.99h3L12 3 8 6.99h3v10.02H8L12 21l4-3.99h-3z" />
    </svg>
  );
}

/** Dashboard tab (dock) — Lucide's `panels-top-left`: a framed panel with a top bar and a left column.
   Same glyph inventory-dashboard's dock uses (its LayoutDashIcon). */
export function LayoutDashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </Icon>
  );
}

/** Charts tab (dock) — inventory-dashboard's design-handoff `barChart` glyph (its BarChartIcon): an L axis with
   three bars. Not from a public set; see ICONS.md. */
export function BarChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3v18h18" />
      <rect x="7" y="11" width="3" height="6" rx="0.5" />
      <rect x="12.5" y="7" width="3" height="10" rx="0.5" />
      <rect x="18" y="13" width="3" height="4" rx="0.5" />
    </Icon>
  );
}

/** Personal scope (view chips) — Lucide's `user` glyph. Same glyph inventory-dashboard's view chips use. */
export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  );
}

/** Location / area scope (view chips) — inventory-dashboard's design-handoff `pin` glyph (its PinIcon). Not from a
   public set (Lucide's `map-pin` is a different outline); see ICONS.md. */
export function PinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21s-7-6.4-7-11a7 7 0 0 1 14 0c0 4.6-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </Icon>
  );
}

/** Organization scope (view chips) — Google Material Icons `public` (filled). Same glyph inventory-dashboard uses. */
export function GlobeIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}

/** Edit a saved view (view chip pencil) — Ionicons `pencil-sharp` (filled, 512 viewBox). Same glyph inventory-dashboard uses. */
export function PencilSharpIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M362.7 19.32L314.34 67.7l129.94 129.95 48.38-48.37a16 16 0 000-22.63L385.33 19.32a16 16 0 00-22.63 0zM291.72 90.32L19.32 362.7 0 512l149.29-19.33 272.4-272.39-129.97-129.96z" />
    </svg>
  );
}

/** Default view toggle — Lucide's classic `heart` glyph; `filled` fills it (on) instead of stroking it (off).
   Same glyph and states inventory-dashboard's view editor uses. */
export function HeartIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Icon {...props} {...(filled ? { fill: 'currentColor', stroke: 0 } : {})}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </Icon>
  );
}

/** Grid view (list/grid toggle) — Lucide's `layout-grid` glyph. Same glyph inventory-dashboard's toggle uses. */
export function GridViewIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Icon>
  );
}

/** Open / not-done status circle — Google Material Icons Rounded `radio_button_unchecked`, verbatim. The empty
   partner of `CheckCircleIcon` (same 10-unit radius). Filled with currentColor, so the caller sets the color. */
export function OpenCircleIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
    </svg>
  );
}

/** Vehicle placeholder (no photo) — Ionicons `car-sport` (filled, 512 viewBox), verbatim. Filled with currentColor,
   so the caller sets the color. */
export function CarIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M494.26,276.22c-3.6-40.41-9.53-48.28-11.77-51.24-5.15-6.84-13.39-11.31-22.11-16l0,0a3.6,3.6,0,0,1-.91-5.68A15.93,15.93,0,0,0,464,190.77,16.27,16.27,0,0,0,447.65,176h-15.6a17,17,0,0,0-2,.13,8.5,8.5,0,0,0-1.41-.47l0,0c-9.24-19.53-21.89-46.27-48.11-59.32C341.64,97,270,96,256,96s-85.64,1-124.48,20.31c-26.22,13.05-38.87,39.79-48.11,59.32l-.08.16a6.52,6.52,0,0,0-1.35.34,17,17,0,0,0-2-.13H64.35A16.27,16.27,0,0,0,48,190.77a15.93,15.93,0,0,0,4.59,12.47,3.6,3.6,0,0,1-.91,5.68l0,0c-8.72,4.72-17,9.19-22.11,16-2.24,3-8.16,10.83-11.77,51.24-2,22.74-2.3,46.28-.73,61.44,3.29,31.5,9.46,50.54,9.72,51.33a16,16,0,0,0,13.2,10.87h0V400a16,16,0,0,0,16,16h56a16,16,0,0,0,16-16h0c8.61,0,14.6-1.54,20.95-3.18a158.83,158.83,0,0,1,28-4.91C207.45,389,237.79,388,256,388c17.84,0,49.52,1,80.08,3.91a159.16,159.16,0,0,1,28.11,4.93c6.08,1.56,11.85,3,19.84,3.15h0a16,16,0,0,0,16,16h56a16,16,0,0,0,16-16v-.12h0A16,16,0,0,0,485.27,389c.26-.79,6.43-19.83,9.72-51.33C496.56,322.5,496.28,299,494.26,276.22ZM112.33,189.31c8-17,17.15-36.24,33.44-44.35,23.54-11.72,72.33-17,110.23-17s86.69,5.24,110.23,17c16.29,8.11,25.4,27.36,33.44,44.35l1,2.17a8,8,0,0,1-7.44,11.42C360,202,290,199.12,256,199.12s-104,2.95-137.28,3.85a8,8,0,0,1-7.44-11.42C111.63,190.81,112,190.06,112.33,189.31Zm11.93,79.63A427.17,427.17,0,0,1,72.42,272c-10.6,0-21.53-3-23.56-12.44-1.39-6.35-1.24-9.92-.49-13.51C49,243,50,240.78,55,240c13-2,20.27.51,41.55,6.78,14.11,4.15,24.29,9.68,30.09,14.06C129.55,263,128,268.64,124.26,268.94Zm221.38,82c-13.16,1.5-39.48.95-89.34.95s-76.17.55-89.33-.95c-13.58-1.51-30.89-14.35-19.07-25.79,7.87-7.54,26.23-13.18,50.68-16.35S233.38,304,256.2,304s32.12,1,57.62,4.81,44.77,9.52,50.68,16.35C375.28,337.4,359.21,349.35,345.64,351Zm117.5-91.39c-2,9.48-13,12.44-23.56,12.44a455.91,455.91,0,0,1-52.84-3.06c-3.06-.29-4.48-5.66-1.38-8.1,5.71-4.49,16-9.91,30.09-14.06,21.28-6.27,33.55-8.78,44.09-6.69,2.57.51,3.93,3.27,4.09,5A40.64,40.64,0,0,1,463.14,259.56Z" />
    </svg>
  );
}

