import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FloatingDock } from './FloatingDock';

afterEach(() => cleanup());

const tabs = [
  { id: 'a', label: 'Alpha', icon: <span>A</span> },
  { id: 'b', label: 'Beta', icon: <span>B</span> },
];

// jsdom has no PointerEvent constructor with clientX/Y; a MouseEvent of the same type carries them.
const pointer = (type: string, x: number, y: number) => act(() => { window.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true })); });

describe('<FloatingDock>', () => {
  it('a click on a tab switches to it', () => {
    const onChange = vi.fn();
    render(<FloatingDock tabs={tabs} activeTab="a" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Beta' }));
    expect(onChange).toHaveBeenCalledWith('b');
    expect(screen.getByRole('tab', { name: 'Alpha' }).getAttribute('aria-selected')).toBe('true');
  });

  it('a drag past the threshold moves the dock, reports the position on drop and swallows the click', () => {
    const onChange = vi.fn();
    const onPositionChange = vi.fn();
    render(<FloatingDock tabs={tabs} activeTab="a" onChange={onChange} onPositionChange={onPositionChange} />);
    const beta = screen.getByRole('tab', { name: 'Beta' });
    fireEvent(beta, new MouseEvent('pointerdown', { button: 0, clientX: 500, clientY: 300, bubbles: true }));
    pointer('pointermove', 400, 200);
    pointer('pointerup', 400, 200);
    fireEvent.click(beta);
    expect(onChange).not.toHaveBeenCalled();
    expect(onPositionChange).toHaveBeenCalledTimes(1);
    const dock = screen.getByRole('tablist');
    expect(dock.className).toContain('lxn-floating-dock--moved');
    // The next plain click works again.
    fireEvent.click(beta);
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('movement under the threshold stays a click and does not move the dock', () => {
    const onPositionChange = vi.fn();
    render(<FloatingDock tabs={tabs} activeTab="a" onChange={() => {}} onPositionChange={onPositionChange} />);
    fireEvent(screen.getByRole('tab', { name: 'Beta' }), new MouseEvent('pointerdown', { button: 0, clientX: 500, clientY: 300, bubbles: true }));
    pointer('pointermove', 502, 301);
    pointer('pointerup', 502, 301);
    expect(onPositionChange).not.toHaveBeenCalled();
    expect(screen.getByRole('tablist').className).not.toContain('lxn-floating-dock--moved');
  });

  it('double-clicking the grip resets a moved dock', () => {
    const onPositionChange = vi.fn();
    const { container } = render(<FloatingDock tabs={tabs} activeTab="a" onChange={() => {}} position={{ x: 0.2, y: 0.3 }} onPositionChange={onPositionChange} />);
    fireEvent.doubleClick(container.querySelector('.lxn-floating-dock__grip')!);
    expect(onPositionChange).toHaveBeenCalledWith(null);
  });
});
