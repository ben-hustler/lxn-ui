import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon } from '../icons/icons';
import { SelectTriggerChrome } from '../select-trigger-chrome/SelectTriggerChrome';
import './single-select.css';

// Position math copied from MultiSelect.tsx / SearchSelect.tsx — same
// precedent (ConfirmPopover has its own copy too) rather than a shared util.
const EDGE_MARGIN = 8;
const ANCHOR_GAP = 6;
const MIN_PANEL_WIDTH = 240;

function snapToDevicePixel(px: number): number {
  const dpr = window.devicePixelRatio || 1;
  return Math.round(px * dpr) / dpr;
}

export interface SingleSelectOption {
  id: string;
  label: string;
  /** Informational only — never a filter. */
  subheader?: string;
}

export interface SingleSelectTriggerArgs {
  selected: SingleSelectOption | null;
  open: boolean;
  onClick: () => void;
}

export interface SingleSelectProps {
  value: string | null;
  options: SingleSelectOption[];
  /** Called with the picked option's id, or `null` when the clear-X (see
   * mirror of MultiSelect's clear-to-`[]`) resets the field back to
   * nothing selected. */
  onChange: (value: string | null) => void;
  /** Fires on every keystroke in the search input, undebounced — same
   * contract as MultiSelect/SearchSelect's onSearch (the caller debounces a
   * network search itself). */
  onSearch?: (query: string) => void;
  isLoading?: boolean;
  /** Persistent field name shown inside the trigger box, above the value —
   * the Bubble reference style ("Make" / "Trim (Optional)" sitting inside
   * the box with the value or placeholder below it). Omitting it falls back
   * to a plain single-line trigger with no persistent label, for a caller
   * that renders its own field label outside the component. */
  label?: string;
  placeholderLabel?: string;
  emptyLabel?: string;
  /** Replaces the default bordered-box trigger entirely, same contract as
   * MultiSelect's renderTrigger. */
  renderTrigger?: (args: SingleSelectTriggerArgs) => ReactNode;
  className?: string;
  /** Read-only: shows `value`'s label but the trigger can't be opened, same
   * as a native `<select disabled>`. Removed from the tab order
   * (`tabIndex={-1}`, like a disabled native control) rather than merely
   * non-interactive, and `renderTrigger`'s own `onClick` still no-ops the
   * same way. */
  disabled?: boolean;
  /** Transient in-flight state (e.g. this field's own save hasn't resolved
   * yet) — same dimmed/inert treatment as `disabled` (blocks reopening,
   * removed from the tab order) but tracked independently, since a caller
   * flips this on and off per save without touching the permanent `disabled`
   * prop. Only rendered by the default (non-`renderTrigger`) trigger. */
  saving?: boolean;
  /** Shows the auto-assigned glyph (AutoFixHighIcon + "Auto-selected by
   * Lexen" tooltip) beside the closed-state value — never shown without a
   * real selection. Only rendered by the default trigger. */
  auto?: boolean;
  /** Small secondary annotation rendered right after the closed-state value,
   * e.g. "(Head Office)" — same gating as `auto`. Only rendered by the
   * default trigger. */
  note?: string;
  /** Whether the open-state clear (X) can appear at all. Default true —
   * false for a field that's always exactly one of a fixed set (nothing
   * valid to clear back to). Only affects the default trigger. */
  clearable?: boolean;
  /** ~500ms green-border flash right after a save lands — the timer lives in
   * the caller, this only renders the modifier class while true. Only
   * rendered by the default trigger. */
  justSaved?: boolean;
  /** Names the field for assistive tech (e.g. "Appraiser") on the default
   * trigger's own `role="combobox"` element, and derives the clear button's
   * label ("Clear Appraiser" instead of the generic "Clear selection") —
   * useful once a page has several of these side by side. No effect with
   * `renderTrigger` (the custom trigger owns its own aria attributes). */
  ariaLabel?: string;
  /** Overrides the closed-state (and open-state input placeholder) label
   * text regardless of whether `value` resolves against `options` — for a
   * caller that needs to show an informational stand-in name with no real,
   * selectable id behind it (e.g. appraisal-users' Appraiser row showing a
   * Head-Office appraiser's name while nothing's actually been assigned in
   * the roster — see ValueRow.tsx). Doesn't affect which option (if any)
   * renders as picked in the list, or the auto/clearable gating below
   * (`hasSelection`, driven by the raw `value`) — purely a display override. */
  displayLabel?: string;
  /** 'default' (16px value text) or 'compact' (13px) — see
   * SelectTriggerChrome's own doc comment for why this is a closed
   * two-value set rather than a raw font-size override. Only affects the
   * default trigger. */
  size?: 'default' | 'compact';
}

/** Generic single-value searchable dropdown (lxn-ui, not app-specific) — a
 * standalone sibling of MultiSelect/SearchSelect, not a variant of either.
 * The typeahead lives INSIDE the trigger box (MultiSelect's precedent, not
 * SearchSelect's separate search bar), but because there's only ever one
 * value there's nothing to push rightward while typing: the currently
 * selected label sits in the input's own `placeholder` slot, so it reads
 * grey (same ::placeholder token every other input here uses) and vanishes
 * the instant a keystroke lands — ordinary placeholder behavior, not a
 * custom fade. Picking a row ALWAYS closes the panel (unlike MultiSelect,
 * which stays open for repeated picks) — there's only one slot to fill, so
 * every click is necessarily the last one. Filtering is the caller's job via
 * onSearch/options, same as MultiSelect/SearchSelect — this component only
 * renders whatever `options` currently holds. */
export function SingleSelect({
  value,
  options,
  onChange,
  onSearch,
  isLoading = false,
  label,
  placeholderLabel = 'Select…',
  emptyLabel = 'No matches',
  renderTrigger,
  className,
  disabled = false,
  saving = false,
  auto = false,
  note,
  clearable = true,
  justSaved = false,
  ariaLabel,
  displayLabel,
  size = 'default',
}: SingleSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Keyboard-navigated highlight, independent of aria-selected (the actual
  // picked-or-not state) — see MultiSelect.tsx's own comment on this same
  // field, byte-for-byte the same reasoning here.
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(0);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const listboxId = useId();
  const optionId = (id: string) => `${listboxId}-option-${id}`;
  // Every option SingleSelect has ever been handed, keyed by id — same
  // "stays resolvable after a live search's `options` stops including it"
  // purpose as MultiSelect's own knownOptionsRef.
  const knownOptionsRef = useRef<Map<string, SingleSelectOption>>(new Map());
  for (const o of options) knownOptionsRef.current.set(o.id, o);

  const optionsById = new Map(options.map((o) => [o.id, o] as const));
  const selected = value ? (optionsById.get(value) ?? knownOptionsRef.current.get(value) ?? null) : null;

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onDocKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    // Tab (or any other keyboard-driven focus change) landing outside the
    // trigger/panel closes the same way an outside click does.
    function onDocFocusIn(e: FocusEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDocPointerDown);
    document.addEventListener('keydown', onDocKeyDown);
    document.addEventListener('focusin', onDocFocusIn);
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown);
      document.removeEventListener('keydown', onDocKeyDown);
      document.removeEventListener('focusin', onDocFocusIn);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHighlightedIndex(0);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Kept current every render so the cleanup below (which only fires on the
  // open -> closed transition) reads the query/onSearch as of the actual
  // moment of closing, not as of whenever the panel opened.
  const queryRef = useRef(query);
  queryRef.current = query;
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => {
    if (!open) return;
    return () => {
      // Closing (pick, Escape, outside click, tab-away, re-clicking the
      // trigger) always clears the search — otherwise a caller's own
      // filtered `options` state can go stale on reopen. Skipped when the
      // query's already empty, same "no-op search is still a real re-search
      // to the caller" reasoning as MultiSelect.
      if (queryRef.current) {
        setQuery('');
        onSearchRef.current?.('');
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open || highlightedIndex === null) return;
    // jsdom (unit tests) doesn't implement scrollIntoView at all.
    optionRefs.current[highlightedIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [open, highlightedIndex]);

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const reposition = () => {
      const rect = trigger.getBoundingClientRect();
      const width = Math.max(rect.width, MIN_PANEL_WIDTH);
      const maxLeft = Math.max(EDGE_MARGIN, window.innerWidth - EDGE_MARGIN - width);
      const left = Math.min(Math.max(rect.left, EDGE_MARGIN), maxLeft);

      const fitsBelow = rect.bottom + ANCHOR_GAP + panel.offsetHeight <= window.innerHeight - EDGE_MARGIN;
      const top = fitsBelow
        ? rect.bottom + ANCHOR_GAP
        : Math.max(EDGE_MARGIN, rect.top - ANCHOR_GAP - panel.offsetHeight);

      panel.style.width = `${width}px`;
      panel.style.transform = `translate3d(${snapToDevicePixel(left)}px, ${snapToDevicePixel(top)}px, 0)`;
    };

    reposition();
    window.addEventListener('resize', reposition);
    const onScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof Node && panel.contains(target)) return;
      reposition();
    };
    window.addEventListener('scroll', onScroll, true);

    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, options.length, isLoading]);

  function toggleOpen() {
    if (disabled || saving) return;
    setOpen((v) => !v);
  }

  function handleQueryChange(q: string) {
    setQuery(q);
    // Reset to the top result on every keystroke, same reasoning (and same
    // deliberate non-dependence on `options` itself) as MultiSelect.
    setHighlightedIndex(0);
    onSearch?.(q);
  }

  // Every pick is a full close, not a toggle — there's only one slot, so
  // clicking any row (already-selected or not) is necessarily the last
  // action a user takes in this dropdown. The `open` -> false transition
  // above handles clearing the query/search.
  function selectOption(id: string) {
    onChange(id);
    setOpen(false);
  }

  function handleOptionKeyDown(e: ReactKeyboardEvent<HTMLDivElement>, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectOption(id);
    }
  }

  // Red X that takes over the chevron's own slot while open AND something
  // is actually selected — see MultiSelect.tsx's own byte-for-byte comment
  // on this same pattern. stopPropagation so the click doesn't also bubble
  // to the trigger's own onClick (re-toggling `open`); onMouseDown
  // preventDefault keeps focus on the search input the same way the option
  // rows do.
  function clearSelection(e: ReactMouseEvent) {
    e.stopPropagation();
    onChange(null);
    inputRef.current?.focus();
  }

  function handleInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i === null ? 0 : Math.min(i + 1, options.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i === null ? 0 : Math.max(i - 1, 0)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex === null) return;
      const option = options[highlightedIndex];
      if (!option) return;
      selectOption(option.id);
    }
  }

  function handleTriggerKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (disabled || saving) return;
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setOpen(true);
    }
  }

  // `displayLabel` wins even over a resolved `selected` — a caller reaches
  // for it precisely to show something OTHER than whatever `value` would
  // otherwise resolve to (see that prop's own doc comment).
  const triggerLabel = displayLabel ?? (selected ? selected.label : placeholderLabel);
  const hasDisplay = selected !== null || displayLabel != null;

  // OPEN: a single full-width input replaces the value display. Its
  // `placeholder` is the CURRENTLY SELECTED option's label (falling back to
  // `placeholderLabel` when nothing's selected yet) rather than a fixed
  // string — that's what makes the selection read as grey, in-place text
  // until the user types, and then vanish on the first keystroke, purely via
  // the browser's own placeholder-vs-value swap. No MultiSelect-style
  // grow-to-content mirror is needed here: there's no trailing suffix to
  // push rightward, so the input can simply fill the box.
  const valueArea = open ? (
    <span className="lxn-single-select-trigger-value lxn-single-select-trigger-value--editing">
      <input
        ref={inputRef}
        type="text"
        className="lxn-l1 lxn-single-select-trigger-input"
        value={query}
        placeholder={triggerLabel}
        onChange={(e) => handleQueryChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleInputKeyDown}
      />
    </span>
  ) : (
    <span className={['lxn-l1', 'lxn-single-select-trigger-value', hasDisplay ? '' : 'is-placeholder'].filter(Boolean).join(' ')}>
      {triggerLabel}
    </span>
  );

  // Points the combobox at whichever row the arrow keys currently have
  // highlighted, so AT/screen-reader users get told which option Enter will
  // act on next — undefined (omitted) once closed or with no options.
  const activeDescendant =
    open && highlightedIndex !== null && options[highlightedIndex] ? optionId(options[highlightedIndex].id) : undefined;

  const trigger = renderTrigger ? (
    renderTrigger({ selected, open, onClick: toggleOpen })
  ) : (
    <SelectTriggerChrome
      classPrefix="single-select"
      label={label}
      valueArea={valueArea}
      // Raw `value`, not `selected` — a value that's set but doesn't resolve
      // against `options`/knownOptionsRef (e.g. displayLabel's own use case)
      // still counts as "there's a real pick to clear/mark auto-assigned",
      // same as the old ValueRow.tsx gated its clear icon on the raw id
      // rather than a resolved option.
      hasSelection={value !== null}
      open={open}
      disabled={disabled}
      saving={saving}
      loading={isLoading}
      justSaved={justSaved}
      auto={auto}
      note={note}
      clearable={clearable}
      ariaLabel={ariaLabel}
      size={size}
      listboxId={listboxId}
      activeDescendant={activeDescendant}
      onToggle={toggleOpen}
      onKeyDown={handleTriggerKeyDown}
      onClear={clearSelection}
    />
  );

  const portalTarget = open ? (triggerRef.current?.closest('dialog') ?? document.body) : null;

  return (
    <div
      ref={triggerRef}
      className={['lxn-single-select', className].filter(Boolean).join(' ')}
      onClick={(e) => e.stopPropagation()}
    >
      {trigger}
      {open &&
        portalTarget &&
        createPortal(
          <div
            ref={panelRef}
            className={['lxn-single-select-panel', size === 'compact' ? 'lxn-single-select-panel--compact' : '']
              .filter(Boolean)
              .join(' ')}
          >
            <div id={listboxId} className="lxn-single-select-list" role="listbox">
              {isLoading ? (
                <div className="lxn-l4 lxn-single-select-empty">Searching…</div>
              ) : options.length === 0 ? (
                <div className="lxn-l4 lxn-single-select-empty">{emptyLabel}</div>
              ) : (
                options.map((o, index) => {
                  const isSelected = o.id === value;
                  const isHighlighted = highlightedIndex !== null && index === highlightedIndex;
                  return (
                    <div
                      key={o.id}
                      ref={(el) => {
                        optionRefs.current[index] = el;
                      }}
                      id={optionId(o.id)}
                      role="option"
                      tabIndex={0}
                      aria-selected={isSelected}
                      className={['lxn-single-select-option', isHighlighted ? 'is-highlighted' : ''].filter(Boolean).join(' ')}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setHighlightedIndex(null)}
                      onClick={() => selectOption(o.id)}
                      onKeyDown={(e) => handleOptionKeyDown(e, o.id)}
                    >
                      <span className="lxn-single-select-option-check" aria-hidden="true">
                        {isSelected && <CheckIcon size={11} />}
                      </span>
                      <span className="lxn-single-select-option-text">
                        <span className="lxn-l1 lxn-single-select-option-label">{o.label}</span>
                        {o.subheader && <span className="lxn-l4 lxn-single-select-option-subheader">{o.subheader}</span>}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          portalTarget,
        )}
    </div>
  );
}
