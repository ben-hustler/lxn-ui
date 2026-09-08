import type { ReactNode } from 'react';
import './kpi-tile.css';

export type KpiTileTone = 'default' | 'error' | 'won' | 'lost';

/** 'surface' (default): a standalone card — white background + box-shadow,
 * for a tile sitting directly on the page background, per PATTERNS.md's
 * "large static content surfaces separate with box-shadow" rule. 'bordered':
 * no background/shadow of its own, just a hairline border — for a tile
 * nested inside a panel that already supplies the surface (e.g. appraisal-
 * internals' KPI rows living inside its own .intc-filter-editor panel,
 * where a second white background per tile would be redundant/invisible). */
export type KpiTileVariant = 'surface' | 'bordered';

export interface KpiTileProps {
  /** Metric name — "Sold Units", "Days to Sell". */
  label: string;
  /** Pre-formatted display value. lxn-ui doesn't know about currency
   * prefixes, unit suffixes, decimal rounding, or loading/empty conventions
   * — same "consumer owns its own vocabulary" rule as StatusBadge's
   * `background` prop. Pass whatever string/node is already display-ready
   * ("$24,500", "62 Days", "…" while loading, "—" for empty/errored). */
  value: ReactNode;
  /** `'error'` colors the value with `--color-error` — a genuine failure
   * (the metric itself couldn't be computed). `'won'`/`'lost'` color with
   * `--color-data-won`/`--color-data-lost` — the same green/red pair the
   * data-viz palette reserves for a favorable/unfavorable outcome (e.g. Days
   * to Sell under/over threshold, Front Gross positive/negative). lxn-ui
   * doesn't know the threshold; the consumer decides which tone to pass. */
  valueTone?: KpiTileTone;
  /** Optional line below the value — an org/location echo, or an error
   * message explaining why `value` is empty. */
  sublabel?: ReactNode;
  sublabelTone?: KpiTileTone;
  variant?: KpiTileVariant;
  className?: string;
}

export function KpiTile({ label, value, valueTone = 'default', sublabel, sublabelTone = 'default', variant = 'surface', className }: KpiTileProps) {
  const classes = ['lxn-kpi-tile', `lxn-kpi-tile--${variant}`, className || ''].filter(Boolean).join(' ');
  const valueClasses = ['lxn-n2', 'lxn-kpi-tile-value', valueTone !== 'default' ? `lxn-kpi-tile-value--${valueTone}` : ''].filter(Boolean).join(' ');
  const sublabelClasses = ['lxn-l4', 'lxn-kpi-tile-sublabel', sublabelTone !== 'default' ? `lxn-kpi-tile-sublabel--${sublabelTone}` : ''].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <span className="lxn-label">{label}</span>
      <span className={valueClasses}>{value}</span>
      {sublabel != null ? <span className={sublabelClasses}>{sublabel}</span> : null}
    </div>
  );
}
