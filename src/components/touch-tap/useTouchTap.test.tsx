import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { useTouchTap } from './useTouchTap';

// jsdom has no PointerEvent — build one by hand so pointerType/clientX/Y exist.
function pointer(el: Element, type: 'pointerDown' | 'pointerUp', init: { pointerType: string; x?: number; y?: number }) {
  const ev = createEvent[type](el);
  Object.defineProperties(ev, {
    pointerType: { value: init.pointerType },
    clientX: { value: init.x ?? 0 },
    clientY: { value: init.y ?? 0 },
  });
  fireEvent(el, ev);
}

function Rows({ onPick }: { onPick: (id: string) => void }) {
  const tap = useTouchTap();
  return (
    <>
      {['a', 'b'].map((id) => (
        <div key={id} data-testid={id} {...tap.bind(() => onPick(id))} />
      ))}
    </>
  );
}

afterEach(cleanup);

describe('useTouchTap', () => {
  it('replays the iOS fast-tap log: touch B, compat click misrouted to A — picks B once, never re-toggles A', () => {
    const onPick = vi.fn();
    render(<Rows onPick={onPick} />);
    const a = screen.getByTestId('a');
    const b = screen.getByTestId('b');

    pointer(a, 'pointerDown', { pointerType: 'touch' });
    pointer(a, 'pointerUp', { pointerType: 'touch' });
    fireEvent.click(a);
    pointer(b, 'pointerDown', { pointerType: 'touch' });
    pointer(b, 'pointerUp', { pointerType: 'touch' });
    fireEvent.click(a); // the misrouted one

    expect(onPick.mock.calls).toEqual([['a'], ['b']]);
  });

  it('a touch that moves past the slop (a scroll) does not activate', () => {
    const onPick = vi.fn();
    render(<Rows onPick={onPick} />);
    const a = screen.getByTestId('a');
    pointer(a, 'pointerDown', { pointerType: 'touch', y: 0 });
    pointer(a, 'pointerUp', { pointerType: 'touch', y: 40 });
    expect(onPick).not.toHaveBeenCalled();
  });

  it('mouse (and any click with no touch before it) still activates via click', () => {
    const onPick = vi.fn();
    render(<Rows onPick={onPick} />);
    const a = screen.getByTestId('a');
    pointer(a, 'pointerDown', { pointerType: 'mouse' });
    pointer(a, 'pointerUp', { pointerType: 'mouse' });
    fireEvent.click(a);
    fireEvent.click(screen.getByTestId('b'));
    expect(onPick.mock.calls).toEqual([['a'], ['b']]);
  });
});
