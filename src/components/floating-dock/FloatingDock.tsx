import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { TooltipController } from '../tooltip/tooltip-core';
import './floating-dock.css';

// Floating vertical tab dock, fixed to the right edge of the viewport and
// draggable anywhere on screen. Lifted from the inventory dashboard's DashDock
// (lexen-bubble-web-comp/web-app/src/inventory-dashboard/src/dashboard/DashDock.tsx),
// which has the full history of why each piece is shaped the way it is:
//
// - Drag from anywhere on the dock, tabs included. Under DRAG_THRESHOLD_PX of
//   movement is a click (switches tab); over it is a drag, and the click that
//   follows is swallowed in the capture phase.
// - Move/up listeners go on `window` for the life of the gesture. No
//   setPointerCapture: capture retargets the click and the tabs go dead.
// - Text selection is refused on `window` while the pointer is down.
// - Position is a fraction (0-1) of the available travel on each axis, so the
//   dock is always fully on screen at any viewport, with no measuring or
//   clamping. `null` = never moved: the CSS default (right edge, centred).
// - Dropped within SNAP_HOME_PX of the default, it snaps home (a ring shows
//   while it would). Double-clicking the grip also resets.
// - Reported through onPositionChange on drag end only, never per move.
//
// Repositioning is pointer-only; switching tabs stays keyboard-operable.
// A consumer whose side panels push the page sets `--lxn-dock-push` to move
// the default spot; a dock the user has moved stays where they put it.

export interface FloatingDockPosition {
  /** 0 = flush left, 1 = flush right. */
  x: number;
  /** 0 = flush top, 1 = flush bottom. */
  y: number;
}

export interface FloatingDockTab {
  id: string;
  /** Accessible name. */
  label: string;
  /** Hover / keyboard-focus hint. */
  tooltip?: string;
  icon: ReactNode;
}

export interface FloatingDockProps {
  tabs: FloatingDockTab[];
  activeTab: string;
  onChange: (id: string) => void;
  /** Controlled position (`null` = default spot). Leave undefined and the dock keeps its own position while mounted. */
  position?: FloatingDockPosition | null;
  /** Called on drag end, and with `null` on snap home / double-click reset. */
  onPositionChange?: (position: FloatingDockPosition | null) => void;
  'aria-label'?: string;
  className?: string;
}

/** Movement below this (px, from the pointerdown point) stays a click. */
const DRAG_THRESHOLD_PX = 4;
/** Dropped within this distance (px, centre to centre) of the default spot: snaps home. */
const SNAP_HOME_PX = 40;
const GRIP_HINT = 'Drag to move · double-click to reset';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Mirrors floating-dock.css's default placement by hand: right inset 24px (12px at <=640px), vertically centred. */
function nearDefault(pos: FloatingDockPosition, w: number, h: number): boolean {
  const inset = window.matchMedia?.('(max-width: 640px)').matches ? 12 : 24;
  const cx = pos.x * (window.innerWidth - w) + w / 2;
  const cy = pos.y * (window.innerHeight - h) + h / 2;
  return Math.hypot(cx - (window.innerWidth - inset - w / 2), cy - window.innerHeight / 2) <= SNAP_HOME_PX;
}

function GripGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" />
      <circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" />
    </svg>
  );
}

export function FloatingDock({ tabs, activeTab, onChange, position, onPositionChange, 'aria-label': ariaLabel = 'Views', className }: FloatingDockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tooltip = useRef<TooltipController | null>(null);
  const tip = () => (tooltip.current ||= new TooltipController());
  /** Set by a real drag, read by onClickCapture to swallow the click after it. A ref: it must not re-render mid-gesture. */
  const dragged = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);
  /** Live position while dragging; also the stored position when uncontrolled. */
  const [draft, setDraft] = useState<FloatingDockPosition | null>(null);
  /** Same as `draft`, for onEnd: a pointerup in the same task as the last move would read a stale closure. */
  const latest = useRef<FloatingDockPosition | null>(null);
  const detach = useRef<(() => void) | null>(null);
  useEffect(() => () => { detach.current?.(); tooltip.current?.hide(); }, []);

  const shown = draft ?? position ?? null;

  const commit = (next: FloatingDockPosition | null) => {
    if (next === null) { latest.current = null; setDraft(null); }
    onPositionChange?.(next);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Primary button / touch / pen only: a right-click still opens the context menu.
    if (e.button !== 0 || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const g = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, w: rect.width, h: rect.height, sx: e.clientX, sy: e.clientY };
    // Cleared on every press, so a drag that ended off the dock (no click to consume it) can't eat the next real click.
    dragged.current = false;
    latest.current = null;
    const blockSelect = (ev: Event) => ev.preventDefault();

    const onMove = (ev: PointerEvent) => {
      if (!dragged.current) {
        if (Math.hypot(ev.clientX - g.sx, ev.clientY - g.sy) < DRAG_THRESHOLD_PX) return;
        dragged.current = true;
        setDragging(true);
        tip().hide();
        window.getSelection()?.removeAllRanges();
      }
      const availW = window.innerWidth - g.w;
      const availH = window.innerHeight - g.h;
      const next = {
        x: availW > 0 ? clamp01((ev.clientX - g.dx) / availW) : 0,
        y: availH > 0 ? clamp01((ev.clientY - g.dy) / availH) : 0,
      };
      latest.current = next;
      setDraft(next);
      setSnapping(nearDefault(next, g.w, g.h));
    };

    const onEnd = () => {
      setDragging(false);
      setSnapping(false);
      teardown();
      // The draft stays after a drop: clearing it before a controlled parent's
      // write lands would flash the dock back to its old spot for a render.
      if (!dragged.current || !latest.current) return;
      commit(nearDefault(latest.current, g.w, g.h) ? null : latest.current);
    };

    const teardown = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      window.removeEventListener('selectstart', blockSelect);
      detach.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    window.addEventListener('selectstart', blockSelect);
    detach.current = teardown;
  };

  const hint = (text: string | undefined) => (text ? {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => { if (!dragging) tip().show(e.currentTarget, text); },
    onMouseLeave: () => tip().hide(),
    onFocus: (e: FocusEvent<HTMLElement>) => {
      let kb = true;
      try { kb = e.currentTarget.matches(':focus-visible'); } catch { /* old engine: show */ }
      if (kb) tip().show(e.currentTarget, text);
    },
    onBlur: () => tip().hide(),
  } : {});

  const style = shown ? ({ '--lxn-dock-x': String(shown.x), '--lxn-dock-y': String(shown.y) } as CSSProperties) : undefined;
  const classes = ['lxn-floating-dock', shown && 'lxn-floating-dock--moved', dragging && 'lxn-floating-dock--dragging',
    snapping && 'lxn-floating-dock--snap', className].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes} style={style} role="tablist" aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      // Capture phase: a short drag that ends over the tab it started on must not switch to it.
      onClickCapture={(e) => {
        if (!dragged.current) return;
        e.preventDefault();
        e.stopPropagation();
        dragged.current = false;
      }}>
      <span className="lxn-floating-dock__grip" aria-hidden="true" {...hint(GRIP_HINT)}
        onDoubleClick={() => {
          // A double-click selects the nearest word, which can be page text.
          window.getSelection()?.removeAllRanges();
          if (shown) commit(null);
        }}>
        <GripGlyph />
      </span>
      {tabs.map((t) => {
        const on = t.id === activeTab;
        return (
          <button key={t.id} type="button" role="tab" aria-selected={on} aria-label={t.label}
            className={'lxn-floating-dock__tab' + (on ? ' lxn-floating-dock__tab--active' : '')}
            {...hint(t.tooltip)}
            onMouseDown={() => tip().hide()}
            onClick={() => onChange(t.id)}>
            {t.icon}
          </button>
        );
      })}
    </div>
  );
}
