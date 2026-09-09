import { CloseIcon } from '../icons/icons';
import './filter-chip.css';

export interface FilterChipProps {
  label: string;
  /** Omit for a locked chip (e.g. Internal Comps' Make/Lookback — fixed
   * vehicle context or never-empty, respectively): renders as a plain,
   * non-interactive `<span>` with no hover `×`, same convention as
   * inventory-dashboard's own `ActiveFilterChip` ("Omit for protected
   * filters — they render without an ×"). When given, the WHOLE chip is the
   * click target (not just the `×`) — the `×` glyph is a hover/focus-visible
   * affordance, not a separate hit target. Expected to update optimistically
   * (remove the value from state immediately, correct afterward only if the
   * underlying save fails) rather than this component waiting on anything —
   * it has no "pending" visual of its own. */
  onRemove?: () => void;
  className?: string;
}

export function FilterChip({ label, onRemove, className }: FilterChipProps) {
  const classes = ['lxn-filter-chip', className || ''].filter(Boolean).join(' ');

  if (!onRemove) {
    return (
      <span className={classes}>
        <span className="lxn-filter-chip-label">{label}</span>
      </span>
    );
  }

  return (
    <button type="button" className={`${classes} lxn-filter-chip--removable`} onClick={onRemove} aria-label={`Remove ${label}`}>
      <span className="lxn-filter-chip-label">{label}</span>
      <span className="lxn-filter-chip-x">
        <CloseIcon size={10} />
      </span>
    </button>
  );
}
