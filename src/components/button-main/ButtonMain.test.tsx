import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonMain } from './ButtonMain';

afterEach(() => cleanup());

function renderSplit(overrides: Partial<Parameters<typeof ButtonMain>[0]> = {}) {
  const onClick = vi.fn();
  const onDuplicate = vi.fn();
  const onDiscard = vi.fn();
  render(
    <ButtonMain
      label="Save"
      onClick={onClick}
      menu={[
        { id: 'dup', label: 'Save as copy', onSelect: onDuplicate },
        { id: 'off', label: 'Unavailable', onSelect: vi.fn(), disabled: true },
        { id: 'discard', label: 'Discard', onSelect: onDiscard, danger: true },
      ]}
      {...overrides}
    />,
  );
  return { onClick, onDuplicate, onDiscard };
}

describe('<ButtonMain menu>', () => {
  it('renders a plain button with no chevron when menu is omitted', () => {
    render(<ButtonMain label="Save" />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('runs the main action from the main segment without opening the menu', () => {
    const { onClick } = renderSplit();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens from the chevron, runs the picked item, then closes', () => {
    const { onClick, onDuplicate } = renderSplit();
    const toggle = screen.getByRole('button', { name: 'More options' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Save as copy' }));
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on Escape and on an outside click', () => {
    renderSplit();
    const toggle = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(toggle);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(toggle);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens from ArrowDown with focus on the first item, and arrows skip disabled items', () => {
    renderSplit();
    fireEvent.keyDown(screen.getByRole('button', { name: 'More options' }), { key: 'ArrowDown' });
    const first = screen.getByRole('menuitem', { name: 'Save as copy' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Discard' }));
  });

  it('disables both segments while loading', () => {
    renderSplit({ loading: true });
    for (const button of screen.getAllByRole('button')) expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});
