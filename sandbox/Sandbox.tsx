import { useEffect, useRef, useState } from 'react';
import { Tooltip, CloseButton, useFocusTrap } from '../src/index';

// Minimal exercise of CloseButton + useFocusTrap together — real consumers
// (appraisal-offer's OfferModal, appraisal-customer's PopupShell) add their
// own portal/fade/scrim mechanics around this same pair; none of that is
// lxn-ui's concern, so it's left out here on purpose. Confirms Escape,
// Tab-trapping, and the ✕ click all still call onClose.
function CloseButtonDemo() {
  const [open, setOpen] = useState(false);
  const dialogRef = useFocusTrap<HTMLDialogElement>(() => setOpen(false));

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open, dialogRef]);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <dialog ref={dialogRef} onCancel={(e) => e.preventDefault()} style={{ position: 'relative', padding: 32 }}>
        <CloseButton
          onClick={() => setOpen(false)}
          style={{ position: 'absolute', top: 12, right: 12 }}
        />
        <p style={{ marginTop: 0 }}>Tab/Shift+Tab cycles within this dialog; Escape and the ✕ both close it.</p>
        <input placeholder="focusable field" />
      </dialog>
    </div>
  );
}

// Nothing here ships — this just mounts real components against sample
// content so we can iterate on them live (npm run dev) without needing a
// consumer repo checked out.
export function Sandbox() {
  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: 64,
        display: 'flex',
        gap: 32,
      }}
    >
      <CloseButtonDemo />

      <Tooltip text="Short tip">
        <span
          style={{
            cursor: 'default',
            border: '1px solid #ccc',
            borderRadius: '50%',
            width: 20,
            height: 20,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
          }}
        >
          i
        </span>
      </Tooltip>

      <Tooltip text="A much longer tooltip message, long enough to check that width-measuring and wrapping behave correctly across multiple lines">
        <span style={{ cursor: 'default', textDecoration: 'underline dotted' }}>
          Hover for a long tooltip
        </span>
      </Tooltip>

      {/* Edge-case anchors for manually checking flip/slide behavior — hover
          each corner/edge and confirm the bubble stays fully on-screen while
          the arrow keeps pointing at the dot. */}
      {(
        [
          ['top', '8px', '50%', undefined, undefined],
          ['top-left', '8px', undefined, '8px', undefined],
          ['top-right', '8px', undefined, undefined, '8px'],
          ['bottom-left', undefined, undefined, '8px', undefined],
          ['bottom-right', undefined, undefined, undefined, '8px'],
        ] as const
      ).map(([label, top, left, leftFixed, rightFixed]) => (
        <div
          key={label}
          style={{
            position: 'fixed',
            top,
            left: left ?? leftFixed,
            right: rightFixed,
            bottom: top ? undefined : '8px',
            transform: left === '50%' ? 'translateX(-50%)' : undefined,
          }}
        >
          <Tooltip text={`Edge case: ${label} — long enough to wrap and test sliding`}>
            <span
              style={{
                cursor: 'default',
                border: '1px solid #ccc',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                background: '#fff',
              }}
            >
              i
            </span>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
