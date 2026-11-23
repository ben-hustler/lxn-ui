import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { CheckIcon, SearchIcon } from '../icons/icons';
import { placeAbsolute, showInTopLayer, TOP_LAYER_CLASS } from '../top-layer/topLayer';
import { useTouchTap } from '../touch-tap/useTouchTap';
import { SelectTriggerChrome } from '../select-trigger-chrome/SelectTriggerChrome';
import './multi-select.css';

// Position math copied from SearchSelect.tsx (its own comment explains why
// this is a local copy rather than a shared util — ConfirmPopover has its
// own copy too, same precedent).
const EDGE_MARGIN = 8;
const ANCHOR_GAP = 6;
const MIN_PANEL_WIDTH = 240;

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
  /** Whether the open trigger turns into a type-to-filter search input.
   * Default true. False for a short fixed list where typing adds nothing:
   * the trigger keeps showing the current selection while open, focus stays
   * on the trigger itself, and the arrow keys / Enter / Space drive the list
   * from there. `onSearch` is never called. */
  searchable?: boolean;
  /** The trigger shows "N selected" instead of the comma-joined labels once
   * the labels no longer fit in the box (2026-11-19; was a fixed count of 3).
   * A single pick never summarizes: it truncates with "…". Set this to also
   * summarize past a fixed number of picks, fit or not. Default: none. */
  summarizeAfter?: number;
  /** Placeholder of the search box that sits at the top of the panel when a
   * `renderTrigger` trigger is searchable (a custom trigger has no in-box
   * input to type into). Default "Search…". */
  searchPlaceholder?: string;
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
  searchable = true,
  summarizeAfter,
  searchPlaceholder = 'Search…',
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
  // Whether the current interaction is touch-driven — set from the
  // pointerType of each pointerdown on the trigger/panel (SingleSelect's
  // same field). Two things key off it (2026-09-25, iOS):
  //  - no default/re-anchored highlight: a touch user has no arrow keys or
  //    Enter to act on it, so it just reads as a stray pre-selection;
  //  - no explicit input focus() from a tap handler: on iOS a focus() inside
  //    a user gesture raises the keyboard, so every option tap / clear-X
  //    would pop it even though opening deliberately doesn't.
  // A hardware keyboard's ArrowDown still picks the highlight up from null.
  const touchRef = useRef(false);
  // Option rows toggle on touch release, not click — see useTouchTap for the
  // iOS fast-tap misrouting it works around.
  const optionTap = useTouchTap();
  const defaultHighlight = () => (touchRef.current ? null : 0);
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
    setHighlightedIndex(defaultHighlight());
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
  // Skipped for touch — see touchRef.
  useEffect(() => {
    if (!open) return;
    function onFocusIn(e: FocusEvent) {
      if (touchRef.current) return;
      const target = e.target as Node;
      const home = focusHome();
      if (!home || target === home) return;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        home.focus();
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
    showInTopLayer(panel);

    // In the top layer (topLayer.ts). `position: absolute` in document
    // coordinates, not `position: fixed`, and always below — see
    // SingleSelect.tsx's own reposition() for the iOS keyboard/scroll-rate
    // reasoning (2026-09-25).
    const reposition = () => {
      const rect = trigger.getBoundingClientRect();
      const width = Math.max(rect.width, MIN_PANEL_WIDTH);
      const maxLeft = Math.max(EDGE_MARGIN, window.innerWidth - EDGE_MARGIN - width);
      const left = Math.min(Math.max(rect.left, EDGE_MARGIN), maxLeft);
      const top = rect.bottom + ANCHOR_GAP;

      panel.style.width = `${width}px`;
      placeAbsolute(panel, left, top);
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

  // Where focus lives while open: the search input, or (not searchable) the
  // trigger box's own combobox element.
  function focusHome(): HTMLElement | null {
    if (searchable) return inputRef.current;
    return triggerRef.current?.querySelector<HTMLElement>('[role="combobox"]') ?? null;
  }

  function toggleOpen() {
    if (disabled || saving) return;
    // Touch, already open: a tap anywhere on the box (the greyed selection
    // text, the field label, the padding) means "let me type", not "close"
    // — focus the search input from inside the tap so iOS raises the
    // keyboard. Otherwise only a tap landing exactly on the input itself
    // did (2026-09-25). An outside tap still closes. Skipped with
    // renderTrigger (no in-box input to focus), which keeps its toggle.
    if (open && touchRef.current && inputRef.current) {
      inputRef.current.focus();
      return;
    }
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
    setHighlightedIndex(defaultHighlight());
    onSearch?.(q);
  }

  function toggleOption(id: string) {
    onChange(selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id]);
    // Keep the highlight on whatever was just picked (mouse or keyboard),
    // so subsequent arrow presses continue from there instead of from
    // whatever stale index was last set.
    // Not for touch — see touchRef.
    setHighlightedIndex(touchRef.current ? null : options.findIndex((o) => o.id === id));
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
    // real browser click-focus semantics). Skipped for touch — see touchRef.
    if (!touchRef.current) focusHome()?.focus();
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
    if (!touchRef.current) focusHome()?.focus();
  }

  // Drag-select (desktop mouse only, 2026-11-23): press on a row, drag over
  // others, release. Every row between the anchor and the row under the
  // pointer is set to the OPPOSITE of the anchor's starting state (start on
  // an unchecked row -> paint checked, on a checked row -> paint unchecked),
  // applied over a snapshot of `value` taken at press time, so dragging back
  // toward the anchor shrinks the range and restores what was there. A range
  // (not "rows touched") so a fast drag that skips rows still covers them.
  // Nothing happens until the pointer actually enters a second row — a plain
  // click still goes through toggleOption via `click` as before. Touch is
  // excluded: there a drag is a scroll.
  const dragRef = useRef<{ anchor: number; select: boolean; baseline: string[]; active: boolean } | null>(null);
  // The click that follows a drag's release (on the anchor row, if released
  // back there) must not toggle it a second time.
  const suppressClickRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  function startDrag(e: ReactPointerEvent, index: number, id: string) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    dragRef.current = { anchor: index, select: !selectedSet.has(id), baseline: value, active: false };
  }

  // Drag reaching the list's top / bottom edge (or past it) scrolls the list
  // (2026-11-23), faster the further in / past, and keeps painting the row
  // now under the pointer: rows scrolling under a still pointer get no
  // pointerenter, so the loop paints them itself.
  const listRef = useRef<HTMLDivElement>(null);
  const paintToRef = useRef<(index: number, buttons: number) => void>(() => {});
  useEffect(() => {
    if (!open) return;
    const EDGE = 28;
    const MAX_STEP = 14;
    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    const step = () => {
      raf = 0;
      const list = listRef.current;
      const drag = dragRef.current;
      if (!list || !drag || !pointer) return;
      const r = list.getBoundingClientRect();
      const into = pointer.y < r.top + EDGE ? pointer.y - (r.top + EDGE) : pointer.y > r.bottom - EDGE ? pointer.y - (r.bottom - EDGE) : 0;
      if (!into) return;
      const speed = Math.sign(into) * Math.min(MAX_STEP, Math.max(2, Math.abs(into) / 3));
      const before = list.scrollTop;
      list.scrollTop += speed;
      // The row under the pointer, the pointer held inside the list's box.
      const y = Math.min(Math.max(pointer.y, r.top + 2), r.bottom - 2);
      const x = Math.min(Math.max(pointer.x, r.left + 2), r.right - 2);
      const row = document.elementFromPoint(x, y)?.closest('.lxn-multi-select-option');
      const index = row ? optionRefs.current.indexOf(row as HTMLDivElement) : -1;
      if (index >= 0) paintToRef.current(index, 1);
      if (list.scrollTop !== before) raf = requestAnimationFrame(step);
    };
    function onMove(e: PointerEvent) {
      if (!dragRef.current || e.pointerType !== 'mouse') return;
      pointer = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(step);
    }
    document.addEventListener('pointermove', onMove);
    return () => {
      document.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [open]);

  function paintTo(index: number, buttons: number) {
    const drag = dragRef.current;
    if (!drag) return;
    // Released outside the window: no pointerup reached us.
    if ((buttons & 1) === 0) {
      dragRef.current = null;
      return;
    }
    if (!drag.active && index === drag.anchor) return;
    drag.active = true;
    const [lo, hi] = drag.anchor <= index ? [drag.anchor, index] : [index, drag.anchor];
    // Anchor first, then outward, so newly-picked labels read in drag order.
    const rangeIds = options.slice(lo, hi + 1).map((o) => o.id);
    if (drag.anchor > index) rangeIds.reverse();
    const inRange = new Set(rangeIds);
    const base = new Set(drag.baseline);
    const next = drag.select
      ? [...drag.baseline, ...rangeIds.filter((id) => !base.has(id))]
      : drag.baseline.filter((id) => !inRange.has(id));
    const cur = valueRef.current;
    if (next.length !== cur.length || next.some((id, i) => id !== cur[i])) onChangeRef.current(next);
  }
  paintToRef.current = paintTo;

  useEffect(() => {
    if (!open) return;
    function onUp() {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag?.active) return;
      suppressClickRef.current = true;
      // The click (if any) lands in this same input-event sequence; clear the
      // flag after it so a later real click isn't eaten.
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      if (!touchRef.current) focusHome()?.focus();
    }
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointerup', onUp);
      dragRef.current = null;
    };
  }, [open]);

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
  function handleInputKeyDown(e: ReactKeyboardEvent<HTMLElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Resuming from null (the mouse cleared it) starts back at the top,
      // same as a fresh open — not wherever the keyboard last left off.
      setHighlightedIndex((i) => (i === null ? 0 : Math.min(i + 1, options.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i === null ? 0 : Math.max(i - 1, 0)));
    } else if (e.key === 'Enter' || (!searchable && e.key === ' ')) {
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
  // Once that list wouldn't fit (or past `summarizeAfter` picks), a count
  // instead ("4 selected"), used in both the closed display and the open-state
  // trailing list. Fit is measured on the closed trigger: the full list's
  // width (an off-screen copy in the value's own font) against the room the
  // value group has, rechecked on resize. While open, the last answer stands.
  const fullText = selected.map((o) => o.label).join(', ');
  const closedValueRef = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const v = closedValueRef.current;
    const group = v?.parentElement;
    if (!v || !group) return;
    const check = () => {
      if (selected.length < 2) { setOverflows(false); return; }
      const probe = document.createElement('span');
      const cs = getComputedStyle(v);
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-99999px;top:0;';
      probe.style.font = cs.font;
      probe.style.letterSpacing = cs.letterSpacing;
      probe.textContent = fullText;
      document.body.appendChild(probe);
      const need = probe.getBoundingClientRect().width;
      probe.remove();
      // Room = the group's width minus anything else in it (annotations) and its gaps.
      const others = Array.from(group.children).filter((c) => c !== v);
      const gap = parseFloat(getComputedStyle(group).columnGap) || 0;
      const room = group.clientWidth - others.reduce((n, c) => n + (c as HTMLElement).offsetWidth + gap, 0);
      setOverflows(room > 0 && need > room + 0.5);
    };
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(group);
    return () => ro.disconnect();
  }, [fullText, open, selected.length]);
  const summarized = selected.length > 1 && (overflows || (summarizeAfter != null && selected.length > summarizeAfter));
  const selectedText = summarized ? `${selected.length} selected` : fullText;
  const triggerLabel = selected.length === 0 ? placeholderLabel : selectedText;

  function handleTriggerKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (disabled || saving) return;
    // Not searchable: there's no input, so the open list's keys land here.
    if (open && !searchable && e.target === e.currentTarget) {
      handleInputKeyDown(e);
      return;
    }
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      touchRef.current = false;
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
  const existingList = open && selected.length > 0 ? selectedText : '';
  const valueArea = open && searchable ? (
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
      {existingList && (
        <span className={['lxn-l1', 'lxn-multi-select-trigger-suffix', summarized ? 'lxn-multi-select-trigger-suffix--count' : ''].filter(Boolean).join(' ')}>
          {summarized ? existingList : `, ${existingList}`}
        </span>
      )}
    </span>
  ) : (
    <span
      ref={closedValueRef}
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

  return (
    <div
      ref={triggerRef}
      className={['lxn-multi-select', className].filter(Boolean).join(' ')}
      onClick={(e) => e.stopPropagation()}
      onPointerDownCapture={(e) => {
        touchRef.current = e.pointerType === 'touch';
      }}
    >
      {trigger}
      {open && (
        <div
          ref={panelRef}
          className={['lxn-multi-select-panel', TOP_LAYER_CLASS, size === 'compact' ? 'lxn-multi-select-panel--compact' : '']
            .filter(Boolean)
            .join(' ')}
        >
          {renderTrigger && searchable && (
            // A custom trigger has no in-box input, so search sits atop the list.
            <div className="lxn-multi-select-panel-search">
              <SearchIcon size={14} />
              <input
                ref={inputRef}
                type="text"
                className="lxn-l1 lxn-multi-select-panel-search-input"
                value={query}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-controls={listboxId}
                aria-activedescendant={activeDescendant}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
            </div>
          )}
          <div ref={listRef} id={listboxId} className="lxn-multi-select-list" role="listbox" aria-multiselectable="true">
            {isLoading ? (
              <div className="lxn-l4 lxn-multi-select-empty">Searching…</div>
            ) : options.length === 0 ? (
              <div className="lxn-l4 lxn-multi-select-empty">{emptyLabel}</div>
            ) : (
              options.map((o, index) => {
                const isSelected = selectedSet.has(o.id);
                const isHighlighted = highlightedIndex !== null && index === highlightedIndex;
                const tapHandlers = optionTap.bind(() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  toggleOption(o.id);
                });
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
                    {...tapHandlers}
                    onPointerDown={(e) => {
                      tapHandlers.onPointerDown(e);
                      startDrag(e, index, o.id);
                    }}
                    onPointerEnter={(e) => paintTo(index, e.buttons)}
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
        </div>
      )}
    </div>
  );
}
