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
import './multi-select.css';

// Position math copied from SearchSelect.tsx (its own comment explains why
// this is a local copy rather than a shared util — ConfirmPopover has its
// own copy too, same precedent).
const EDGE_MARGIN = 8;
const ANCHOR_GAP = 6;
const MIN_PANEL_WIDTH = 240;

function snapToDevicePixel(px: number): number {
  const dpr = window.devicePixelRatio || 1;
  return Math.round(px * dpr) / dpr;
}

export interface MultiSelectOption {
  id: string;
  label: string;
  /** Informational only — never a filter. */
  subheader?: string;
}

export interface MultiSelectTriggerArgs {
  selected: MultiSelectOption[];
  open: boolean;
  onClick: () => void;
}

export interface MultiSelectProps {
  value: string[];
  options: MultiSelectOption[];
  onChange: (value: string[]) => void;
  /** Fires on every keystroke in the search input, undebounced — same
   * contract as SearchSelect's onSearch (the caller debounces a network
   * search itself). */
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
   * SearchSelect's renderTrigger. */
  renderTrigger?: (args: MultiSelectTriggerArgs) => ReactNode;
  className?: string;
  /** Read-only: shows `value`'s labels but the trigger can't be opened, same
   * as a native `<select disabled>` — for a field whose value is fixed by
   * something other than direct user choice (e.g. a value derived from a
   * parent record) but should still read as "this is a multi-select field",
   * not a plain label. Removed from the tab order (`tabIndex={-1}`, like a
   * disabled native control) rather than merely non-interactive, and
   * `renderTrigger`'s own `onClick` still no-ops the same way. */
  disabled?: boolean;
  /** Transient in-flight state (e.g. this field's own save hasn't resolved
   * yet) — same dimmed/inert treatment as `disabled` (blocks reopening,
   * removed from the tab order) but tracked independently, since a caller
   * flips this on and off per save without touching the permanent `disabled`
   * prop. Only rendered by the default (non-`renderTrigger`) trigger. */
  saving?: boolean;
  /** Shows the auto-assigned glyph (AutoFixHighIcon + "Auto-selected by
   * Lexen" tooltip) beside the closed-state value — never shown without at
   * least one selection. Only rendered by the default trigger. */
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
  /** Names the field for assistive tech (e.g. "Colors") on the default
   * trigger's own `role="combobox"` element, and derives the clear button's
   * label ("Clear Colors" instead of the generic "Clear selection") — useful
   * once a page has several of these side by side. No effect with
   * `renderTrigger` (the custom trigger owns its own aria attributes). */
  ariaLabel?: string;
  /** 'default' (16px value text) or 'compact' (13px) — see
   * SelectTriggerChrome's own doc comment for why this is a closed
   * two-value set rather than a raw font-size override. Only affects the
   * default trigger. */
  size?: 'default' | 'compact';
}

/** Generic multi-value searchable dropdown (lxn-ui, not app-specific) —
 * SearchSelect's sibling for "choose any number" instead of "choose one".
 * Selecting an option toggles it and the panel STAYS OPEN (unlike
 * SearchSelect, which closes on select) so a user can pick several in one
 * pass; closing is an explicit outside-click/Escape/re-click-trigger action.
 * Filtering is the caller's job via onSearch/options, same as SearchSelect —
 * this component only renders whatever `options` currently holds and knows
 * nothing about where they came from (a live analytics query, a static list,
 * anything). */
export function MultiSelect({
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
  size = 'default',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Keyboard-navigated highlight, independent of aria-selected (the actual
  // picked-or-not state) — this is just "which row would Enter act on next".
  // An index into the current (possibly filtered) `options` array, or null
  // when no row is keyboard-highlighted (the mouse took over — see the
  // option row's onMouseEnter below). Mouse hover and the keyboard highlight
  // are mutually exclusive so only one row is ever shown as active at once:
  // moving the mouse over the list clears this back to null (plain CSS
  // :hover takes it from there), and the next arrow-key press starts fresh
  // from the top rather than resuming wherever the keyboard last left off.
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(0);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const listboxId = useId();
  const optionId = (id: string) => `${listboxId}-option-${id}`;
  // Every option MultiSelect has ever been handed, keyed by id — grows over
  // the component's lifetime, never shrinks. This is what lets a selected
  // item stay resolvable in the trigger preview even after a live search's
  // `options` prop stops including it (typing "auto" no longer containing
  // "Manual"), without needing the caller to merge it back into the search
  // results just to keep it visible — the dropdown below still renders
  // strictly from the current `options`, so a filtered-out item still
  // won't show up as a row there. Kept in a ref (not state) because writing
  // it doesn't need to trigger a render on its own — it only ever matters
  // to the very same render's `selected` computation below, which reads it
  // synchronously.
  const knownOptionsRef = useRef<Map<string, MultiSelectOption>>(new Map());
  for (const o of options) knownOptionsRef.current.set(o.id, o);

  const selectedSet = new Set(value);
  // Ordered by `value` (selection order), NOT by `options`'s current
  // order — `options` can be actively reordered by an in-progress search
  // (e.g. typing "go" turning [red, green, gold] into [gold, green] by
  // relevance) and the preview text below (triggerLabel/existingList) must
  // stay stable while typing, not reshuffle just because the live order
  // did. Resolved against the CURRENT `options` first (freshest data — e.g.
  // an updated subheader count), falling back to knownOptionsRef for an id
  // the current search excluded.
  const optionsById = new Map(options.map((o) => [o.id, o] as const));
  const selected = value
    .map((id) => optionsById.get(id) ?? knownOptionsRef.current.get(id))
    .filter((o): o is MultiSelectOption => o !== undefined);

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
    // trigger/panel closes the same way an outside click does — otherwise a
    // keyboard-only user tabbing past the field leaves a disconnected
    // floating panel on screen. This never fights the OTHER focusin
    // listener below (the one that yanks focus back to the input): that one
    // only acts when focus lands INSIDE the trigger/panel, this one only
    // acts when it lands OUTSIDE — the two conditions never overlap.
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

  // Kept current every render (not just when this effect below re-runs) so
  // its cleanup — which only fires on the open -> closed transition, since
  // `open` is this effect's only dependency — reads the query/onSearch as
  // of the actual moment of closing, not as of whenever the panel opened.
  const queryRef = useRef(query);
  queryRef.current = query;
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => {
    if (!open) return;
    return () => {
      // Closing (Escape, outside click, tab-away, re-clicking the trigger)
      // always clears the search — otherwise a caller's own filtered
      // `options` state can go stale: it'd still reflect the last typed
      // query on reopen even though the visible input resets to blank.
      // Skipped when the query's already empty, same "no-op search is
      // still a real re-search to the caller" reasoning as everywhere else
      // in this file.
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

  // Hard guarantee, not just a best-effort — the option row's own onMouseDown
  // preventDefault + toggleOption's explicit refocus (below) both try to stop
  // focus from ever leaving the input, but real browsers don't all sequence
  // mousedown/focus/click identically, so relying on predicting every path
  // was still losing focus intermittently ("loses focus sometimes"). This
  // reactively corrects any drift instead: whenever focus lands anywhere else
  // inside the trigger or the panel (an option row, a checkbox, anything)
  // while open, it's yanked straight back to the input on the same tick — so
  // the caret is guaranteed to keep flashing there until the dropdown
  // actually closes. Scoped to inside the trigger/panel only, so it never
  // fights the outside-click-close handler above.
  useEffect(() => {
    if (!open) return;
    function onFocusIn(e: FocusEvent) {
      const target = e.target as Node;
      if (target === inputRef.current) return;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        inputRef.current?.focus();
      }
    }
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [open]);

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
    // Reset to the top result on every keystroke — this is the actual
    // "the filtered result set just changed" moment. Deliberately NOT
    // watching `options` itself via an effect for this (a prior version
    // did): a caller can hand down a brand new `options` array reference
    // on every render for reasons that have nothing to do with search (e.g.
    // a cascading Make -> Model list recomputed inline, unmemoized, on
    // every parent re-render) — keying off identity there stomped the
    // "hide the highlight" reset below right after an Enter-driven pick.
    setHighlightedIndex(0);
    onSearch?.(q);
  }

  function toggleOption(id: string) {
    onChange(selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id]);
    // Keep the highlight on whatever was just picked (mouse or keyboard),
    // so subsequent arrow presses continue from there instead of from
    // whatever stale index was last set.
    setHighlightedIndex(options.findIndex((o) => o.id === id));
    // Clear the typed query once a pick is made (mouse or keyboard), but
    // ONLY when the search had narrowed the list down to exactly one result
    // — the "type camr, camry's the only option left, hit Enter (or click
    // it)" pattern. A broader search (e.g. typing "200" to pick several
    // 2000s-model trims) deliberately leaves the query in place so the
    // filtered list stays put and the user can keep clicking through it
    // instead of retyping the search before every pick. Also skipped when
    // the query's already empty: onSearch('') is a real re-search as far as
    // the caller's concerned (a no-op query is still a query), not a pure
    // no-op — firing it needlessly can reset caller-side state (e.g. a
    // fetched `options` list) that had nothing to do with this pick.
    if (query && options.length === 1) {
      setQuery('');
      onSearch?.('');
    }
    // Picking an option must never blur the search input — the caret should
    // keep flashing there until the whole combobox closes. The option row's
    // own onMouseDown already stops the browser from shifting focus to it in
    // the first place; this is the guaranteed fallback (also what makes the
    // behavior assertable from a test, since jsdom doesn't fully replicate
    // real browser click-focus semantics).
    inputRef.current?.focus();
  }

  // Red X that takes over the chevron's own slot while open AND something
  // is actually selected (same spot, same size, same flex/absolute
  // positioning, via the shared lxn-multi-select-chevron class) rather than
  // adding a separate icon alongside it — no extra width, no padding change
  // needed. An empty selection has nothing to clear, so the plain chevron
  // stays put in that case even while open. Clears the whole selection in
  // one click rather than making the user toggle every option off
  // individually. stopPropagation so the click doesn't also bubble to the
  // trigger's own onClick (which would immediately re-toggle `open`);
  // onMouseDown preventDefault for the same reason as the option rows above
  // — never let focus leave the search input while the panel is open.
  function clearSelection(e: ReactMouseEvent) {
    e.stopPropagation();
    onChange([]);
    inputRef.current?.focus();
  }

  function handleOptionKeyDown(e: ReactKeyboardEvent<HTMLDivElement>, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleOption(id);
    }
  }

  // Lives on the search input, not the option rows — the focusin guard
  // above keeps real focus pinned to the input the whole time the panel is
  // open, so this is the only element that will ever actually see these
  // keydowns in a real browser.
  function handleInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Resuming from null (the mouse cleared it) starts back at the top,
      // same as a fresh open — not wherever the keyboard last left off.
      setHighlightedIndex((i) => (i === null ? 0 : Math.min(i + 1, options.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i === null ? 0 : Math.max(i - 1, 0)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex === null) return;
      const option = options[highlightedIndex];
      if (!option) return;
      // Captured before toggleOption's own setQuery('') below takes
      // effect — React state updates don't land synchronously, so `query`
      // and `options` here still read as they were when Enter was pressed.
      const searchWillClear = query !== '' && options.length === 1;
      toggleOption(option.id);
      if (searchWillClear) {
        // Hide the highlight rather than leaving it on the just-picked row
        // (toggleOption's own re-anchoring) — the search resetting is
        // effectively a fresh listing, so the first arrow press after it
        // should land on the top result, same as a brand new open. Skipped
        // whenever toggleOption didn't actually clear the search (query was
        // already empty, or more than one result was still showing) —
        // nothing reset, so the highlight has no reason to move either; it
        // stays re-anchored on the just-picked row like a mouse click.
        setHighlightedIndex(null);
      }
    }
  }

  // Comma-joined list of every selected label, not a "N selected" summary —
  // the trigger box's own overflow:hidden/text-overflow:ellipsis (CSS)
  // truncates it with "…" once it no longer fits, rather than switching to a
  // count once there's more than one. Used for the CLOSED display only.
  const triggerLabel = selected.length === 0 ? placeholderLabel : selected.map((o) => o.label).join(', ');

  function handleTriggerKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (disabled || saving) return;
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setOpen(true);
    }
  }

  // OPEN: the input sits first (left) and grows to exactly fit what's
  // typed — a hidden same-font mirror via CSS Grid (lxn-multi-select-trigger-
  // growwrap's `::after`, sized from `data-value`), not the native `size`
  // attribute (which estimates by average character count and left a visible
  // gap). Immediately after it: a comma and the already-selected labels
  // trailing off to the right — typing pushes that list rightward instead of
  // the whole value vanishing into an empty search box. CLOSED: the plain
  // comma-joined `triggerLabel` above.
  //
  // The wrapper span around <input> is ALWAYS rendered (never conditional on
  // existingList) — only its modifier class and data-value toggle. Making
  // that wrapper conditional was the actual bug behind "focus lost after the
  // very first pick": existingList flips from '' to non-empty on that pick,
  // and a conditional wrapper changes the tree shape at that exact point, so
  // React unmounts the old <input> and mounts a brand new (unfocused) one —
  // 2nd+ picks never showed the bug because the tree shape was already
  // stable by then. A stable wrapper keeps the same DOM node throughout.
  const existingList = open && selected.length > 0 ? selected.map((o) => o.label).join(', ') : '';
  const valueArea = open ? (
    <span className="lxn-multi-select-trigger-value lxn-multi-select-trigger-value--editing">
      <span
        className={['lxn-l1', 'lxn-multi-select-trigger-growwrap', existingList ? '' : 'lxn-multi-select-trigger-growwrap--fill']
          .filter(Boolean)
          .join(' ')}
        data-value={query}
      >
        <input
          ref={inputRef}
          type="text"
          className="lxn-l1 lxn-multi-select-trigger-input"
          value={query}
          placeholder={existingList ? '' : placeholderLabel}
          onChange={(e) => handleQueryChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleInputKeyDown}
        />
      </span>
      {existingList && <span className="lxn-l1 lxn-multi-select-trigger-suffix">, {existingList}</span>}
    </span>
  ) : (
    <span
      className={['lxn-l1', 'lxn-multi-select-trigger-value', selected.length === 0 ? 'is-placeholder' : '']
        .filter(Boolean)
        .join(' ')}
    >
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
      classPrefix="multi-select"
      label={label}
      valueArea={valueArea}
      hasSelection={selected.length > 0}
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
      className={['lxn-multi-select', className].filter(Boolean).join(' ')}
      onClick={(e) => e.stopPropagation()}
    >
      {trigger}
      {open &&
        portalTarget &&
        createPortal(
          <div
            ref={panelRef}
            className={['lxn-multi-select-panel', size === 'compact' ? 'lxn-multi-select-panel--compact' : '']
              .filter(Boolean)
              .join(' ')}
          >
            <div id={listboxId} className="lxn-multi-select-list" role="listbox" aria-multiselectable="true">
              {isLoading ? (
                <div className="lxn-l4 lxn-multi-select-empty">Searching…</div>
              ) : options.length === 0 ? (
                <div className="lxn-l4 lxn-multi-select-empty">{emptyLabel}</div>
              ) : (
                options.map((o, index) => {
                  const isSelected = selectedSet.has(o.id);
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
                      className={['lxn-multi-select-option', isHighlighted ? 'is-highlighted' : ''].filter(Boolean).join(' ')}
                      // Mousedown is what the browser uses to shift focus to
                      // a clicked focusable element, ahead of the click event
                      // itself — prevent that so the search input never
                      // blurs (and its caret keeps flashing) while picking
                      // options. toggleOption's own explicit refocus below
                      // is the belt to this suspenders.
                      onMouseDown={(e) => e.preventDefault()}
                      // The mouse taking over the highlight, in the flesh —
                      // see the highlightedIndex state comment above.
                      onMouseEnter={() => setHighlightedIndex(null)}
                      onClick={() => toggleOption(o.id)}
                      onKeyDown={(e) => handleOptionKeyDown(e, o.id)}
                    >
                      <span className="lxn-multi-select-option-checkbox" aria-hidden="true">
                        {isSelected && <CheckIcon size={11} />}
                      </span>
                      <span className="lxn-multi-select-option-text">
                        <span className="lxn-l1 lxn-multi-select-option-label">{o.label}</span>
                        {o.subheader && <span className="lxn-l4 lxn-multi-select-option-subheader">{o.subheader}</span>}
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
