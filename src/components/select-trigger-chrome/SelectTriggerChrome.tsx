import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { AutoFixHighIcon, ChevronDownIcon, CloseIcon, LoaderIcon } from '../icons/icons';
import { Tooltip } from '../tooltip/Tooltip';
import './select-trigger-chrome.css';

export interface SelectTriggerChromeProps {
  /** Which component's own trigger/chevron/clear CSS to key into —
   * 'single-select' or 'multi-select'. SingleSelect.tsx/MultiSelect.tsx each
   * keep their own <prefix>.css for the box/hover/focus/labeled-layout rules
   * (untouched by this extraction); this component only adds the bits that
   * are identical either way (see select-trigger-chrome.css). */
  classPrefix: 'single-select' | 'multi-select';
  /** Bubble reference style field name, same contract as SingleSelect/
   * MultiSelect's own `label` prop — omit for a plain unlabeled trigger. */
  label?: string;
  /** The already-built closed/open value display (each caller's own
   * plain-text-vs-input swap) — this component only wraps it with the
   * shared box, chevron/clear, and the new saving/auto/note chrome. */
  valueArea: ReactNode;
  /** Whether there's a REAL pick (a raw `value`, resolvable or not — not
   * whether it happens to resolve against `options`) — gates the
   * auto-assigned glyph and the open-state clear (X). Deliberately NOT used
   * to gate `note` (below): a caller can have a note to show (e.g. "(Head
   * Office)") with no real value at all — see SingleSelect's own
   * `displayLabel` escape hatch, built for exactly that case. */
  hasSelection: boolean;
  open: boolean;
  /** Permanent — same as SingleSelect/MultiSelect's own `disabled`. */
  disabled: boolean;
  /** Transient in-flight state (e.g. this field's own save request hasn't
   * resolved yet) — same dimmed/inert treatment as `disabled` but tracked
   * independently (aria-busy, not aria-disabled) so a caller can flip it on
   * and off per save without touching the permanent `disabled` prop. */
  saving: boolean;
  /** Transient in-flight state — this field's own option list is being
   * refetched (e.g. an upstream cascade field changed, or first mount) —
   * same dimmed/inert treatment as `saving` but tracked independently (a
   * caller can have both a value-save and an options-refresh in flight at
   * once) and shows a spinner in the chevron slot instead of the chevron
   * itself, taking priority over the open-state clear (X) too. */
  loading: boolean;
  /** ~500ms green-border flash right after a save lands — the timer lives in
   * the caller (e.g. appraisal-users' Users.tsx clears it via a timeout),
   * this only renders the modifier class while true. */
  justSaved: boolean;
  /** Shows the auto-assigned glyph (AutoFixHighIcon + "Auto-selected by
   * Lexen" tooltip) beside the closed-state value. Never shown without
   * `hasSelection` — nothing to have auto-assigned otherwise. */
  auto: boolean;
  /** Small secondary annotation rendered right after the value, e.g.
   * "(Head Office)" — shown whenever it's given, regardless of
   * `hasSelection` (see that prop's own doc comment). */
  note?: string;
  /** Whether the open-state clear (X) can appear at all — false for a field
   * that's always exactly one of a fixed set (nothing valid to clear back
   * to), same as ValueRow's own `clearable={false}` on its Location row. */
  clearable: boolean;
  /** Names the field for assistive tech (e.g. "Appraiser") — also drives the
   * clear button's own label ("Clear Appraiser" instead of the generic
   * "Clear selection") so a screen-reader user tabbing straight to it still
   * knows which field it belongs to. */
  ariaLabel?: string;
  /** 'default' (16px value text, the Bubble-reference size) or 'compact'
   * (13px) — a closed, two-value set on purpose: a per-instance numeric
   * font-size override would drift into a different size per consumer
   * (14px here, 15px there) with no shared vocabulary for "this one's
   * denser." 'compact' is for a host that needs the row as short as
   * possible (e.g. appraisal-users' three-role-field card). */
  size: 'default' | 'compact';
  listboxId: string;
  activeDescendant?: string;
  onToggle: () => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
  onClear: (e: ReactMouseEvent) => void;
}

/** The default (non-renderTrigger) trigger box shared by SingleSelect and
 * MultiSelect — previously two copy-pasted variants (plain / `label`-boxed)
 * per component. Pulled out once there were FOUR new chrome features
 * (saving, auto, note, clearable) that both components needed identically,
 * rather than pasting a fifth/sixth copy. Genuinely different bits — the
 * value/selection model, the search-input plumbing, the option list (radio
 * check vs. checkbox) — stay in each component; only the outer trigger box
 * lives here. */
export function SelectTriggerChrome({
  classPrefix,
  label,
  valueArea,
  hasSelection,
  open,
  disabled,
  saving,
  loading,
  justSaved,
  auto,
  note,
  clearable,
  ariaLabel,
  size,
  listboxId,
  activeDescendant,
  onToggle,
  onKeyDown,
  onClear,
}: SelectTriggerChromeProps) {
  const inert = disabled || saving || loading;
  // Matches each component's own existing convention: 16px chevron/clear in
  // the taller `label`-boxed layout, 14px in the plain single-line one.
  const iconSize = label ? 16 : 14;
  const cls = (suffix: string) => `lxn-${classPrefix}-${suffix}`;

  const classes = [
    cls('trigger'),
    label ? cls('trigger--labeled') : '',
    disabled ? cls('trigger--disabled') : '',
    saving ? 'lxn-select-trigger--saving' : '',
    loading ? 'lxn-select-trigger--loading' : '',
    justSaved ? 'lxn-select-trigger--just-saved' : '',
    size === 'compact' ? 'lxn-select-trigger--compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      role="combobox"
      tabIndex={inert ? -1 : 0}
      onClick={inert ? undefined : onToggle}
      onKeyDown={inert ? undefined : onKeyDown}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-disabled={disabled}
      aria-busy={saving || loading}
      aria-controls={listboxId}
      aria-activedescendant={activeDescendant}
      aria-label={ariaLabel}
    >
      {label ? <span className={['lxn-label', cls('trigger-field-label')].join(' ')}>{label}</span> : null}
      {/* valueArea and its annotations are grouped into ONE flex item so the
          trigger's own `justify-content: space-between` puts its gap between
          this whole group and the chevron/clear — not between the value and
          the note/auto glyph, which is what happened when they were two
          separate space-between'd siblings (reported 2026-09-03: "Bilbo
          Baggins ... (Head Office) ... chevron" reading as evenly spread out
          instead of the name/tags sitting together). */}
      <span className="lxn-select-trigger-value-group">
        {valueArea}
        {/* Beside the value, not inside it — the OPEN state swaps valueArea
            for a live search input, and neither annotation makes sense
            floating next to that, so both are closed-state only. */}
        {!open && (note || (hasSelection && auto)) ? (
          <span className="lxn-select-trigger-annotations">
            {note ? <span className="lxn-l4 lxn-select-trigger-note">{note}</span> : null}
            {hasSelection && auto ? (
              <Tooltip text="Auto-selected by Lexen" className="lxn-select-trigger-auto-icon">
                <AutoFixHighIcon size={14} />
              </Tooltip>
            ) : null}
          </span>
        ) : null}
      </span>
      {loading ? (
        // The chevron slot's own positioning (in the labeled layout,
        // `position: absolute` + `transform: translateY(-50%)` for vertical
        // centering) can't live on the same element as the spin animation:
        // `transform: rotate(...)` on that element would REPLACE the
        // centering translateY rather than combine with it, since a CSS
        // animation with only a `to` keyframe interpolates the whole
        // `transform` property from its static value toward that keyframe —
        // reading as the icon drifting vertically as the translate collapses,
        // not spinning in place. This wrapper keeps the chevron slot's own
        // position/centering; the animation lives on the plain inner icon,
        // which has no other transform to fight with.
        <span className={cls('chevron')}>
          <LoaderIcon size={iconSize} className="lxn-select-trigger-spinner" aria-hidden="true" />
        </span>
      ) : open && hasSelection && clearable ? (
        <button
          type="button"
          className={[cls('chevron'), cls('clear')].join(' ')}
          aria-label={ariaLabel ? `Clear ${ariaLabel}` : 'Clear selection'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClear}
        >
          <CloseIcon size={iconSize} />
        </button>
      ) : (
        <ChevronDownIcon size={iconSize} className={cls('chevron')} />
      )}
    </div>
  );
}
