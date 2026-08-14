import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, SearchIcon } from '../icons/icons';
import './search-select.css';

// Same convention as ConfirmPopover's own position math (confirm-popover/
// ConfirmPopover.tsx) — kept as a local copy rather than a shared util,
// matching this codebase's existing precedent (Tooltip has its own copy too).
const EDGE_MARGIN = 8;
const ANCHOR_GAP = 6;
const MIN_PANEL_WIDTH = 240;

function snapToDevicePixel(px: number): number {
  const dpr = window.devicePixelRatio || 1;
  return Math.round(px * dpr) / dpr;
}

export interface SearchSelectOption {
  id: string;
  label: string;
  /** Informational only (e.g. a Bubble Role) — never a filter. */
  subheader?: string;
  icon?: ReactNode;
}

export interface SearchSelectTriggerArgs {
  selected: SearchSelectOption | undefined;
  open: boolean;
  onClick: () => void;
}

export interface SearchSelectProps {
  value: string;
  options: SearchSelectOption[];
  onSelect: (id: string) => void;
  /** Fires on every keystroke in the search input, undebounced — the caller
   * debounces if the search is a network call (frontend-spec.md: the list
   * is usable immediately without typing, so an empty-query call on open
   * isn't required here — the caller's own last-fetched `options` already
   * covers that). */
  onSearch?: (query: string) => void;
  isLoading?: boolean;
  placeholderLabel?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  /** Replaces the default bordered-box trigger entirely — the returned node
   * owns its own box/hover/border, `onClick` is the only thing that needs
   * wiring up. Lets a host (e.g. appraisal-users' ValueRow) layer its own
   * hover-suppression/box styling directly on the trigger instead of being
   * stuck with an opaque default. */
  renderTrigger?: (args: SearchSelectTriggerArgs) => ReactNode;
  className?: string;
}

/** Generic searchable/typeahead select (lxn-ui, not app-specific). Click the
 * trigger, a panel opens below with a pinned search input on top and a
 * scrollable option list beneath, usable immediately without typing —
 * filtering itself is the caller's job (via `onSearch`/the `options` it
 * feeds back in), this component only renders whatever `options` currently
 * holds. Not a type-directly-into-the-box autocomplete.
 *
 * The panel is portalled and positioned via a `getBoundingClientRect()` +
 * `position: fixed` (ConfirmPopover's own technique, see that component) —
 * NOT `position: absolute` inside the trigger's own box. A plain absolute
 * panel gets clipped by the first ancestor with `overflow` other than
 * visible, which is exactly what appraisal-users' Head-Office modal does
 * (`.users-modal { overflow-y: auto }`, needed for the modal's own content);
 * reported 2026-08-13 as "the dropdowns are getting cut off inside the
 * modal." Portal target mirrors ConfirmPopover's own choice — the enclosing
 * `<dialog>` if the trigger is inside one (so it stays within that dialog's
 * top-layer promotion and renders above the modal's own content instead of
 * behind it), `document.body` otherwise. */
export function SearchSelect({
  value,
  options,
  onSelect,
  onSearch,
  isLoading = false,
  placeholderLabel = 'Select…',
  searchPlaceholder = 'Search',
  emptyLabel = 'No matches',
  renderTrigger,
  className,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    // Checks BOTH refs, not just the trigger's — the panel is portalled
    // elsewhere in the DOM (see file header), so a click landing inside it
    // (the search input, an option) is NOT a descendant of triggerRef any
    // more and would otherwise register as an "outside" click.
    function onDocPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onDocKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocPointerDown);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Clears any leftover typed text so reopening shows an empty search box
    // — but does NOT call onSearch. A caller fetches its own full list once
    // up front (e.g. on mount) and hands it in via `options`; onSearch is
    // reserved for an actual typed query (handleQueryChange, below), not an
    // open/close cycle re-requesting the same unfiltered list.
    setQuery('');
    // A frame after the panel actually mounts, not the same tick — focusing
    // synchronously during the click that opened it can lose to the browser's
    // own post-click focus handling in some environments.
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Position the portalled panel against the trigger's live rect. Re-runs
  // whenever the option list's size could plausibly have changed (its own
  // height affects whether it fits below vs. needs to flip above) — keyed on
  // primitive values (length/isLoading), not the `options` array itself,
  // since callers pass a fresh array reference on every render regardless of
  // whether its contents actually changed.
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

    // Dismiss on scroll rather than chase the anchor (Tooltip/ConfirmPopover's
    // own convention) — EXCEPT when the scroll originated from inside the
    // panel's own option list (`.lxn-search-select-list` is independently
    // scrollable); the panel's own position doesn't change when a user just
    // scrolls through the options, so closing there would make a long list
    // unusable.
    const onScroll = (e: Event) => {
      // e.target is `window` itself for a page-level scroll (not a Node —
      // `instanceof Node` guards that case, since `.contains()` throws on a
      // non-Node argument rather than just returning false).
      const target = e.target;
      if (target instanceof Node && panel.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', onScroll, true);

    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, options.length, isLoading]);

  function toggle() {
    setOpen((v) => !v);
  }

  function handleQueryChange(q: string) {
    setQuery(q);
    onSearch?.(q);
  }

  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
  }

  function handleOptionKeyDown(e: ReactKeyboardEvent<HTMLDivElement>, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(id);
    }
  }

  const trigger = renderTrigger ? (
    renderTrigger({ selected, open, onClick: toggle })
  ) : (
    <button
      type="button"
      className="lxn-search-select-trigger"
      onClick={toggle}
      aria-haspopup="listbox"
      aria-expanded={open}
    >
      <span className="lxn-search-select-trigger-label">{selected ? selected.label : placeholderLabel}</span>
      <ChevronDownIcon size={14} className="lxn-search-select-chevron" />
    </button>
  );

  const portalTarget = open ? (triggerRef.current?.closest('dialog') ?? document.body) : null;

  return (
    // stopPropagation at the root: every click inside this component
    // (trigger, search input, an option) is this widget's own business, not
    // something an ancestor's own click handler should also see — e.g. a
    // host embedding this inside an otherwise-clickable card/row (appraisal-
    // users' UsersCard) needs picking a value to open only the picker, not
    // also fire the card's own onClick. Still works once the panel is
    // portalled elsewhere in the DOM — React bubbles portal content through
    // the React tree it's declared in, not the DOM tree it renders into.
    <div ref={triggerRef} className={['lxn-search-select', className].filter(Boolean).join(' ')} onClick={(e) => e.stopPropagation()}>
      {trigger}
      {open &&
        portalTarget &&
        createPortal(
          <div ref={panelRef} className="lxn-search-select-panel">
            <div className="lxn-search-select-search">
              <SearchIcon size={16} className="lxn-search-select-search-icon" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                placeholder={searchPlaceholder}
                onChange={(e) => handleQueryChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="lxn-search-select-list" role="listbox">
              {isLoading ? (
                <div className="lxn-search-select-empty">Searching…</div>
              ) : options.length === 0 ? (
                <div className="lxn-search-select-empty">{emptyLabel}</div>
              ) : (
                options.map((o) => (
                  <div
                    key={o.id}
                    role="option"
                    tabIndex={0}
                    aria-selected={o.id === value}
                    className="lxn-search-select-option"
                    onClick={() => handleSelect(o.id)}
                    onKeyDown={(e) => handleOptionKeyDown(e, o.id)}
                  >
                    {o.icon && <span className="lxn-search-select-option-icon">{o.icon}</span>}
                    <span className="lxn-search-select-option-text">
                      <span className="lxn-search-select-option-label">{o.label}</span>
                      {o.subheader && <span className="lxn-search-select-option-subheader">{o.subheader}</span>}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>,
          portalTarget,
        )}
    </div>
  );
}
