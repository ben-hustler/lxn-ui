import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../src/index';

// main has no visual components or tokens (see README.md) — this sandbox
// only exercises the one thing that lives here: useFocusTrap. For
// ButtonMain/CloseButton/Tooltip demos, switch to the bubble-inspired or
// mobile-inspired branch and run its own sandbox.
function FocusTrapDemo() {
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
        <button type="button" onClick={() => setOpen(false)} style={{ position: 'absolute', top: 12, right: 12 }}>
          ✕
        </button>
        <p style={{ marginTop: 0 }}>Tab/Shift+Tab cycles within this dialog; Escape and ✕ both close it.</p>
        <input placeholder="focusable field" />
      </dialog>
    </div>
  );
}

export function Sandbox() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: 64 }}>
      <FocusTrapDemo />
    </div>
  );
}
