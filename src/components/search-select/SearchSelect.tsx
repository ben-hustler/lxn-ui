import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { ChevronDownIcon, SearchIcon } from '../icons/icons';
import './search-select.css';

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
 * holds. Not a type-directly-into-the-box autocomplete. */
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
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Keeps the open-effect below from needing onSearch in its dependency
  // array (a caller-supplied inline arrow changes identity every render).
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
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
    setQuery('');
    // Refreshes to the full list on every open, not just the first —
    // without this, a caller backing several independent SearchSelects with
    // the same search endpoint (e.g. one per role field, all querying the
    // same location's roster) would show whatever query the LAST-open one
    // left behind instead of the current full list. Harmless extra network
    // call for a caller with only one instance.
    onSearchRef.current?.('');
    // A frame after the panel actually mounts, not the same tick — focusing
    // synchronously during the click that opened it can lose to the browser's
    // own post-click focus handling in some environments.
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

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

  return (
    // stopPropagation at the root: every click inside this component
    // (trigger, search input, an option) is this widget's own business, not
    // something an ancestor's own click handler should also see — e.g. a
    // host embedding this inside an otherwise-clickable card/row (appraisal-
    // users' UsersCard) needs picking a value to open only the picker, not
    // also fire the card's own onClick.
    <div ref={rootRef} className={['lxn-search-select', className].filter(Boolean).join(' ')} onClick={(e) => e.stopPropagation()}>
      {trigger}
      {open && (
        <div className="lxn-search-select-panel">
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
        </div>
      )}
    </div>
  );
}
