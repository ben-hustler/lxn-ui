import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { KpiTile } from './KpiTile';

afterEach(() => cleanup());

describe('<KpiTile>', () => {
  it('renders the label, value, and sublabel', () => {
    render(<KpiTile label="Sold Units" value="128" sublabel="org obid_123" />);
    expect(screen.getByText('Sold Units')).toBeTruthy();
    expect(screen.getByText('128')).toBeTruthy();
    expect(screen.getByText('org obid_123')).toBeTruthy();
  });

  it('omits the sublabel entirely when none is given', () => {
    const { container } = render(<KpiTile label="Sold Units" value="128" />);
    expect(container.querySelector('.lxn-kpi-tile-sublabel')).toBeNull();
  });

  it('applies the error tone class to the value only when valueTone is "error"', () => {
    const { rerender, container } = render(<KpiTile label="Days to Sell" value="62 Days" />);
    expect(container.querySelector('.lxn-kpi-tile-value--error')).toBeNull();

    rerender(<KpiTile label="Days to Sell" value="94 Days" valueTone="error" />);
    expect(container.querySelector('.lxn-kpi-tile-value--error')).toBeTruthy();
    expect(container.querySelector('.lxn-kpi-tile-sublabel--error')).toBeNull();
  });

  it('applies the error tone class to the sublabel independently of valueTone', () => {
    const { container } = render(<KpiTile label="ACV" value="—" sublabel="Query failed" sublabelTone="error" />);
    expect(container.querySelector('.lxn-kpi-tile-value--error')).toBeNull();
    expect(container.querySelector('.lxn-kpi-tile-sublabel--error')).toBeTruthy();
  });
});
