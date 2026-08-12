import type { ReactNode } from 'react';
import './status-badge.css';

type BaseProps = {
  /** A literal CSS color value or var() reference — lxn-ui doesn't know what
   * "open"/"accepted"/"sent"/"responded" mean; each consumer owns its own
   * status vocabulary (colors, icons, labels, tooltips) and just hands this
   * component the resulting background. Text color is fixed white, not a
   * second prop — every current status across both consumers already
   * resolves its own foreground token to white (tokens.css's
   * --color-status-*-fg are all --lxn-neutral-10), so this isn't a
   * simplification that loses a real case, just skips a pair of props that
   * would always be handed the same value. */
  background: string;
  className?: string;
};

// Icon or icon+label only (no label-only mode) — that's the rule this
// component encodes, not every possible chip shape. A text-only status chip
// (e.g. appraisal-customer's pre-existing StatusPill for Open/Accepted/
// Expired/Locked) is a different, not-yet-migrated case; this is deliberately
// narrower, matching what ShareStatusTag's icon+label chips and HomeCard's
// Selected badge both actually need.
type StatusBadgeProps =
  | (BaseProps & { label: string; icon: ReactNode })
  | (BaseProps & { label?: undefined; icon: ReactNode; 'aria-label': string });

export function StatusBadge(props: StatusBadgeProps) {
  const { background, label, icon, className, ...rest } = props;
  const iconOnly = !label;

  const classes = [
    'lxn-status-badge',
    iconOnly ? 'lxn-status-badge--icon-only' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} style={{ background }} {...(iconOnly ? { role: 'img' } : {})} {...rest}>
      <span className="lxn-status-badge-icon">{icon}</span>
      {label ? <span className="lxn-status-badge-label">{label}</span> : null}
    </span>
  );
}
