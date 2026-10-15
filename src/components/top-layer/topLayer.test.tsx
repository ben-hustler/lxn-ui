import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SingleSelect } from '../single-select/SingleSelect';
import { MultiSelect } from '../multi-select/MultiSelect';
import { DateRangePicker } from '../date-range-picker/DateRangePicker';
import { ConfirmPopover } from '../confirm-popover/ConfirmPopover';
import { TOP_LAYER_CLASS } from './topLayer';

afterEach(() => cleanup());

const OPTIONS = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
];

// Floating panels render in place, inside the component, and go in the top
// layer — not a <body> portal (2026-10-15). In place is what lets them inherit
// a consumer's scoped tokens; jsdom has no Popover API, so this guards the
// placement and the class, not the top layer itself.
function expectInPlace(panel: Element, host: HTMLElement) {
  expect(host.contains(panel)).toBe(true);
  expect(panel.classList.contains(TOP_LAYER_CLASS)).toBe(true);
}

describe('floating panels render in place', () => {
  it('SingleSelect', () => {
    const { container } = render(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    expectInPlace(container.querySelector('.lxn-single-select-panel')!, container);
  });

  it('MultiSelect', () => {
    const { container } = render(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    expectInPlace(container.querySelector('.lxn-multi-select-panel')!, container);
  });

  it('DateRangePicker', () => {
    const { container } = render(
      <DateRangePicker value={{ kind: 'relative', relativeTimeString: 'Last month' }} onChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('combobox'));
    expectInPlace(container.querySelector('.lxn-date-range-preset-panel')!, container);
  });

  it('ConfirmPopover', () => {
    function Host() {
      const anchor = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={anchor}>Remove</button>
          <ConfirmPopover open anchorRef={anchor} onClose={vi.fn()} onConfirm={vi.fn()} message="Sure?" confirmLabel="Yes" />
        </>
      );
    }
    const { container } = render(<Host />);
    expectInPlace(screen.getByRole('alertdialog'), container);
  });
});
