import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon } from '../icons/icons';
import { useTouchTap } from '../touch-tap/useTouchTap';

export interface ButtonMainMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  /** Renders the row in the negative color (e.g. "Discard draft"). */
  danger?: boolean;
  disabled?: boolean;
}

const EDGE_MARGIN = 8;
const ANCHOR_GAP = 6;
const MIN_PANEL_WIDTH = 220;

const CHEVRON_SIZE = { large: 18, wide: 18, small: 16, xs: 14 } as const;

function snapToDevicePixel(px: number): number {
  const dpr = window.devicePixelRatio || 1;
  return Math.round(px * dpr) / dpr;
}

interface ButtonMainSplitProps {
  variant: string;
  size: keyof typeof CHEVRON_SIZE;
  fullWidth: boolean;
  disabled: boolean;
  menu: ButtonMainMenuItem[];
  menuLabel: string;
  className?: string;
  /** The already-built main ButtonMain <button>. */
  children: ReactNode;
}

// The split half of ButtonMain's `menu` option — kept out of ButtonMain.tsx so
// the plain button stays a hook-free render. Wraps the main button and adds a
// chevron segment + a role="menu" dropdown.
export function ButtonMainSplit({
  variant,
  size,
  fullWidth,
  disabled,
  menu,
  menuLabel,
  className,
  children,
}: ButtonMainSplitProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Set when the menu is opened from the keyboard, so focus moves into it.
  // Mouse/touch opens leave focus alone (no stray focus ring on tap).
  const focusOnOpenRef = useRef<'first' | 'last' | null>(null);
  const menuId = useId();
  const tap = useTouchTap();

  const enabledIndexes = menu.flatMap((item, i) => (item.disabled ? [] : [i]));

  function focusItem(index: number | undefined) {
    if (index !== undefined) itemRefs.current[index]?.focus();
  }
  function focusEdge(edge: 'first' | 'last') {
    focusItem(edge === 'first' ? enabledIndexes[0] : enabledIndexes[enabledIndexes.length - 1]);
  }

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    function isInside(target: Node) {
      return !!(wrapperRef.current?.contains(target) || panelRef.current?.contains(target));
    }
    function onDocPointerDown(e: MouseEvent) {
      if (!isInside(e.target as Node)) setOpen(false);
    }
    function onDocKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    function onDocFocusIn(e: FocusEvent) {
      if (!isInside(e.target as Node)) setOpen(false);
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

  useLayoutEffect(() => {
    if (!open) return;
    const wrapper = wrapperRef.current;
    const panel = panelRef.current;
    if (!wrapper || !panel) return;

    // Same document-coordinate anchoring as SingleSelect's reposition() —
    // `position: absolute`, always below, see that component for the iOS
    // reasoning. Right-aligned to the split button's own right edge, so the
    // menu hangs under the chevron that opened it.
    const reposition = () => {
      const rect = wrapper.getBoundingClientRect();
      const width = Math.max(rect.width, MIN_PANEL_WIDTH);
      const maxLeft = Math.max(EDGE_MARGIN, window.innerWidth - EDGE_MARGIN - width);
      const left = Math.min(Math.max(rect.right - width, EDGE_MARGIN), maxLeft);
      const top = rect.bottom + ANCHOR_GAP;

      const container = panel.offsetParent as HTMLElement | null;
      let originX = -window.scrollX;
      let originY = -window.scrollY;
      if (container && getComputedStyle(container).position !== 'static') {
        const cRect = container.getBoundingClientRect();
        originX = cRect.left + container.clientLeft - container.scrollLeft;
        originY = cRect.top + container.clientTop - container.scrollTop;
      }

      panel.style.minWidth = `${width}px`;
      panel.style.transform = `translate3d(${snapToDevicePixel(left - originX)}px, ${snapToDevicePixel(top - originY)}px, 0)`;
    };

    reposition();
    window.addEventListener('resize', reposition);
    const onScroll = (e: Event) => {
      if (e.target instanceof Node && panel.contains(e.target)) return;
      reposition();
    };
    window.addEventListener('scroll', onScroll, true);

    const focusTarget = focusOnOpenRef.current;
    focusOnOpenRef.current = null;
    if (focusTarget) focusEdge(focusTarget);

    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle() {
    if (disabled) return;
    setOpen((v) => !v);
  }

  function select(item: ButtonMainMenuItem) {
    if (item.disabled) return;
    setOpen(false);
    toggleRef.current?.focus({ preventScroll: true });
    item.onSelect();
  }

  function handleToggleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      focusOnOpenRef.current = 'first';
      setOpen(true);
      if (open) focusEdge('first');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusOnOpenRef.current = 'last';
      setOpen(true);
      if (open) focusEdge('last');
    }
  }

  function handleItemKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const pos = enabledIndexes.indexOf(index);
    let next: number | undefined;
    if (e.key === 'ArrowDown') next = enabledIndexes[(pos + 1) % enabledIndexes.length];
    else if (e.key === 'ArrowUp') next = enabledIndexes[(pos - 1 + enabledIndexes.length) % enabledIndexes.length];
    else if (e.key === 'Home') next = enabledIndexes[0];
    else if (e.key === 'End') next = enabledIndexes[enabledIndexes.length - 1];
    else if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (next === undefined) return;
    e.preventDefault();
    focusItem(next);
  }

  const wrapperClasses = [
    'lxn-btn-main-split',
    `lxn-btn-main-split--${variant}`,
    fullWidth ? 'lxn-btn-main-split--full-width' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const toggleClasses = [
    'lxn-btn-main',
    `lxn-btn-main--${variant}`,
    'lxn-btn-main--split-toggle',
    `lxn-btn-main--split-toggle-${size}`,
    open ? 'lxn-btn-main--pressed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const portalTarget = open ? (wrapperRef.current?.closest('dialog') ?? document.body) : null;

  return (
    <div ref={wrapperRef} className={wrapperClasses}>
      {children}
      <button
        ref={toggleRef}
        type="button"
        className={toggleClasses}
        disabled={disabled}
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onKeyDown={handleToggleKeyDown}
        {...tap.bind(toggle)}
      >
        <ChevronDownIcon size={CHEVRON_SIZE[size]} stroke={2.2} />
      </button>
      {open &&
        portalTarget &&
        createPortal(
          <div ref={panelRef} id={menuId} className="lxn-btn-main-menu" role="menu" aria-label={menuLabel}>
            {menu.map((item, index) => (
              <button
                key={item.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                className={['lxn-btn-main-menu-item', item.danger ? 'lxn-btn-main-menu-item--danger' : '']
                  .filter(Boolean)
                  .join(' ')}
                onKeyDown={(e) => handleItemKeyDown(e, index)}
                {...tap.bind(() => select(item))}
              >
                {item.icon && <span className="lxn-btn-main-menu-item-icon">{item.icon}</span>}
                <span className="lxn-b2 lxn-btn-main-menu-item-label">{item.label}</span>
              </button>
            ))}
          </div>,
          portalTarget,
        )}
    </div>
  );
}
