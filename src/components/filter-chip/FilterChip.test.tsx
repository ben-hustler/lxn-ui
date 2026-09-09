import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FilterChip } from './FilterChip';

afterEach(() => cleanup());

describe('<FilterChip>', () => {
  it('renders a locked chip as a plain, non-interactive span with no × when onRemove is omitted', () => {
    const { container } = render(<FilterChip label="Civic" />);
    expect(screen.getByText('Civic')).toBeTruthy();
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('.lxn-filter-chip-x')).toBeNull();
  });

  it('renders a removable chip as a button, and clicking anywhere on it fires onRemove', () => {
    const onRemove = vi.fn();
    render(<FilterChip label="Civic" onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Civic' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
