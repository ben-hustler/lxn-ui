import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
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
 * off the anchor's center. Dismisses on outside click, Escape, or scroll
 * (scrolling the anchor out from under the popover would otherwise leave it
 * floating disconnected from what it's confirming). */
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
  const popoverRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const reposition = () => {
      const rect = anchor.getBoundingClientRect();
      const anchorCenterX = rect.left + rect.width / 2;

      const fitsAbove = rect.top - ANCHOR_GAP - popover.offsetHeight >= EDGE_MARGIN;
      popover.dataset.placement = fitsAbove ? 'above' : 'below';
      const top = fitsAbove ? rect.top - ANCHOR_GAP - popover.offsetHeight : rect.bottom + ANCHOR_GAP;

      const maxLeft = Math.max(EDGE_MARGIN, window.innerWidth - EDGE_MARGIN - popover.offsetWidth);
      const left = Math.min(Math.max(anchorCenterX - popover.offsetWidth / 2, EDGE_MARGIN), maxLeft);
      const arrowX = Math.min(
        Math.max(anchorCenterX - left, ARROW_HALF_WIDTH),
        popover.offsetWidth - ARROW_HALF_WIDTH,
      );

      popover.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
      popover.style.setProperty('--lxn-confirm-popover-arrow-x', `${Math.round(arrowX)}px`);
    };

    reposition();
    window.addEventListener('resize', reposition);
    // Dismiss rather than chase the anchor down the page — same rationale as
    // Tooltip's dismissOnScroll.
    window.addEventListener('scroll', onClose, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [open, anchorRef, onClose]);

  useEffect(() => {
    if (!open) return;
    // Cancel, not Confirm — a stray Enter/Space shouldn't land on the
    // destructive action by default.
    popoverRef.current?.querySelector<HTMLButtonElement>('button')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
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

  if (!open) return null;

  const portalTarget = anchorRef.current?.closest('dialog') ?? document.body;

  return createPortal(
    <div ref={popoverRef} className="lxn-confirm-popover" role="alertdialog">
      <div className="lxn-confirm-popover-arrow" />
      <div className="lxn-confirm-popover-body">
        {icon && <span className="lxn-confirm-popover-icon">{icon}</span>}
        <span className="lxn-confirm-popover-message">{message}</span>
      </div>
      <div className="lxn-confirm-popover-actions">
        <ButtonMain size="small" variant="tertiary" label={cancelLabel} onClick={onClose} />
        <ButtonMain size="small" variant={destructive ? 'danger' : 'primary'} label={confirmLabel} onClick={onConfirm} />
      </div>
    </div>,
    portalTarget,
  );
}
