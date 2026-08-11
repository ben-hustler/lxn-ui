import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { ButtonMain } from '../button-main/ButtonMain';
import './confirm-popover.css';

// Keeps the popover this far from the viewport edge when it slides, and how
// far it sits from the anchor before flipping sides — same convention as
// Tooltip's positioning (tooltip-core.ts), reimplemented here as a plain
// React component (not an imperative singleton controller) because this
// needs to render interactive children (Cancel/Confirm buttons), not just a
// text label.
const EDGE_MARGIN = 8;
const ANCHOR_GAP = 10;
const ARROW_HALF_WIDTH = 8;
// Same durations/easing as Tooltip's own show()/hide() (tooltip-core.ts) —
// kept visually consistent across lxn-ui's two floating-bubble patterns.
const ENTER_MS = 160;
const EXIT_MS = 120;

interface ConfirmPopoverProps {
  open: boolean;
  /** The element this popover is anchored to — also the click target that's
   * exempted from the outside-click dismissal (so clicking the anchor again
   * while open doesn't immediately reopen it via a second, unrelated
   * handler AND close it via this one). */
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onConfirm: () => void;
  message: ReactNode;
  icon?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Styles the confirm action as a destructive (red) ButtonMain instead of
   * primary teal — e.g. Remove/Delete. Default false. */
  destructive?: boolean;
}

/** Small anchored popover for a confirm-before-you-act prompt (icon + message
 * + Cancel/Confirm) that doesn't warrant a full modal — e.g. "Remove this
 * customer?" hanging off the Remove button itself. Positions above the
 * anchor by default, flipping below when there isn't room, and slides
 * horizontally to stay clear of the viewport edge without moving its arrow
 * off the anchor's center. Fades/slides in and out (see ENTER_MS/EXIT_MS
 * above) — same motion as Tooltip's own bubble, split across two nested
 * elements the same way Tooltip splits `outer`/`bubble`: an outer wrapper
 * positioned via `transform: translate3d(...)` (position), and an inner one
 * animated via the Web Animations API (opacity/translateY) — one element
 * can't own both without the two `transform` writes fighting each other.
 * Dismisses on outside click, Escape, or scroll (scrolling the anchor out
 * from under the popover would otherwise leave it floating disconnected
 * from what it's confirming). */
export function ConfirmPopover({
  open,
  anchorRef,
  onClose,
  onConfirm,
  message,
  icon,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
}: ConfirmPopoverProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  // Stays true for EXIT_MS after `open` goes false, so the exit animation
  // below has time to play before this actually unmounts — same idea as
  // Customer.tsx's own popup-fade pattern, adapted for a component that
  // mounts/unmounts via React rather than owning one persistent DOM node.
  const [rendered, setRendered] = useState(open);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = undefined;
      }
      setRendered(true);
      return;
    }
    if (!rendered) return;
    exitTimeoutRef.current = setTimeout(() => setRendered(false), EXIT_MS);
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, [open, rendered]);

  useLayoutEffect(() => {
    if (!rendered) return;
    const anchor = anchorRef.current;
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!anchor || !outer || !inner) return;

    const reposition = () => {
      const rect = anchor.getBoundingClientRect();
      const anchorCenterX = rect.left + rect.width / 2;

      const fitsAbove = rect.top - ANCHOR_GAP - outer.offsetHeight >= EDGE_MARGIN;
      outer.dataset.placement = fitsAbove ? 'above' : 'below';
      const top = fitsAbove ? rect.top - ANCHOR_GAP - outer.offsetHeight : rect.bottom + ANCHOR_GAP;

      const maxLeft = Math.max(EDGE_MARGIN, window.innerWidth - EDGE_MARGIN - outer.offsetWidth);
      const left = Math.min(Math.max(anchorCenterX - outer.offsetWidth / 2, EDGE_MARGIN), maxLeft);
      const arrowX = Math.min(Math.max(anchorCenterX - left, ARROW_HALF_WIDTH), outer.offsetWidth - ARROW_HALF_WIDTH);

      outer.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
      outer.style.setProperty('--lxn-confirm-popover-arrow-x', `${Math.round(arrowX)}px`);
    };

    let cleanupListeners = () => {};
    if (open) {
      reposition();
      window.addEventListener('resize', reposition);
      // Dismiss rather than chase the anchor down the page — same rationale
      // as Tooltip's dismissOnScroll.
      window.addEventListener('scroll', onClose, true);
      cleanupListeners = () => {
        window.removeEventListener('resize', reposition);
        window.removeEventListener('scroll', onClose, true);
      };
    }

    inner.getAnimations().forEach((a) => a.cancel());
    inner.animate(
      open
        ? [
            { opacity: 0, transform: 'translateY(6px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ]
        : [
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(6px)' },
          ],
      { duration: open ? ENTER_MS : EXIT_MS, easing: open ? 'ease-out' : 'ease-in', fill: 'forwards' },
    );

    return cleanupListeners;
  }, [rendered, open, anchorRef, onClose]);

  useEffect(() => {
    if (!open) return;
    // Cancel, not Confirm — a stray Enter/Space shouldn't land on the
    // destructive action by default.
    innerRef.current?.querySelector<HTMLButtonElement>('button')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (innerRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open, onClose, anchorRef]);

  if (!rendered) return null;

  const portalTarget = anchorRef.current?.closest('dialog') ?? document.body;

  return createPortal(
    <div ref={outerRef} className="lxn-confirm-popover" role="alertdialog">
      <div ref={innerRef} className="lxn-confirm-popover-inner">
        <div className="lxn-confirm-popover-arrow" />
        <div className="lxn-confirm-popover-body">
          {icon && <span className="lxn-confirm-popover-icon">{icon}</span>}
          <span className="lxn-confirm-popover-message">{message}</span>
        </div>
        <div className="lxn-confirm-popover-actions">
          <ButtonMain size="small" variant="tertiary" label={cancelLabel} onClick={onClose} />
          <ButtonMain size="small" variant={destructive ? 'danger' : 'primary'} label={confirmLabel} onClick={onConfirm} />
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
