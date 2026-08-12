// Shared icon set — Lucide (ISC licensed), stroke-only, verbatim path data.
// One file, all icons, same convention appraisal-offer/appraisal-customer
// each already use locally for their own icons.tsx — this is that same idea
// promoted to lxn-ui once a glyph is needed by more than one consumer (the
// same reasoning Tooltip was promoted for, see README's "What this is for").
//
// Default stroke is 1.7, not Lucide's own default of 2 — matches the
// "Appraisal Mobile" mockup's own Icon wrapper exactly (its components.jsx:
// "Lucide-style outline, 24x24, 1.7px stroke"), which is the reference this
// set is being built against.

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

/** Edit — Lucide's `edit` glyph: an outlined box with a pencil overlapping
   its corner. (Lucide's newer `square-pen` variant has slightly different
   coordinates for the same idea — this is the classic `edit` path.) */
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
