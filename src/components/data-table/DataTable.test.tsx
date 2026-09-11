import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DataTable, type DataTableColumnGroup, type DataTableRow } from './DataTable';

afterEach(() => cleanup());

const COLUMN_GROUPS: DataTableColumnGroup[] = [
  { label: 'Sold', columns: [{ key: 'units', label: 'Units' }, { key: 'dts', label: 'Days to Sell' }] },
  { label: 'Cost', columns: [{ key: 'acv', label: 'ACV' }] },
];

function row(key: string, rowLabel: string, units: number, dts: number, acv: number, children?: DataTableRow[]): DataTableRow {
  return {
    key,
    rowLabel,
    cells: {
      units: { sortValue: units, display: String(units) },
      dts: { sortValue: dts, display: `${dts} Days` },
      acv: { sortValue: acv, display: `$${acv}` },
    },
    children,
  };
}

describe('<DataTable>', () => {
  it('renders group headers, column headers, and row data', () => {
    const rows = [row('r1', '2024 · XLE', 12, 45, 18000)];
    render(<DataTable rowLabelHeader="Year / Trim" columnGroups={COLUMN_GROUPS} rows={rows} />);
    expect(screen.getByText('Sold')).toBeTruthy();
    expect(screen.getByText('Cost')).toBeTruthy();
    expect(screen.getByText('Units')).toBeTruthy();
    expect(screen.getByText('2024 · XLE')).toBeTruthy();
    expect(screen.getByText('45 Days')).toBeTruthy();
    expect(screen.getByText('$18000')).toBeTruthy();
  });

  it('renders every row at once — no pagination', () => {
    const rows = Array.from({ length: 25 }, (_, i) => row(`r${i}`, `Row ${i}`, i, 0, 0));
    render(<DataTable rowLabelHeader="Row" columnGroups={COLUMN_GROUPS} rows={rows} />);
    expect(screen.getByText('Row 0')).toBeTruthy();
    expect(screen.getByText('Row 24')).toBeTruthy();
  });

  it("sorts rows by a column's sortValue, not its display text, on header click — defaulting to descending", () => {
    const rows = [row('r1', 'A', 100, 0, 0), row('r2', 'B', 2, 0, 0), row('r3', 'C', 30, 0, 0)];
    render(<DataTable rowLabelHeader="Row" columnGroups={COLUMN_GROUPS} rows={rows} />);
    fireEvent.click(screen.getByText('Units'));
    const cellsAfterDesc = screen.getAllByRole('row').slice(2).map((r) => r.textContent);
    expect(cellsAfterDesc[0]).toContain('A');
    expect(cellsAfterDesc[1]).toContain('C');
    expect(cellsAfterDesc[2]).toContain('B');

    fireEvent.click(screen.getByText('Units'));
    const cellsAfterAsc = screen.getAllByRole('row').slice(2).map((r) => r.textContent);
    expect(cellsAfterAsc[0]).toContain('B');
    expect(cellsAfterAsc[2]).toContain('A');
  });

  it('shows exactly one sort arrow at all times, defaulting to the leftmost (row-label) column', () => {
    const rows = [row('r1', 'A', 1, 0, 0)];
    render(<DataTable rowLabelHeader="Row" columnGroups={COLUMN_GROUPS} rows={rows} />);
    // Default state: sorted by the row-label column's own order, arrow shown there.
    expect(document.querySelectorAll('.lxn-data-table-sort-icon')).toHaveLength(1);
    expect(screen.getByText('Row').closest('th')?.querySelector('.lxn-data-table-sort-icon')).toBeTruthy();

    fireEvent.click(screen.getByText('Units'));
    expect(document.querySelectorAll('.lxn-data-table-sort-icon')).toHaveLength(1);
    expect(screen.getByText('Row').closest('th')?.querySelector('.lxn-data-table-sort-icon')).toBeNull();

    fireEvent.click(screen.getByText('Days to Sell'));
    expect(document.querySelectorAll('.lxn-data-table-sort-icon')).toHaveLength(1);
  });

  it('can be re-selected as the sort column after a measure column was picked', () => {
    const rows = [row('r1', 'A', 1, 0, 0)];
    render(<DataTable rowLabelHeader="Row" columnGroups={COLUMN_GROUPS} rows={rows} />);
    fireEvent.click(screen.getByText('Units'));
    expect(screen.getByText('Row').closest('th')?.querySelector('.lxn-data-table-sort-icon')).toBeNull();

    fireEvent.click(screen.getByText('Row'));
    expect(screen.getByText('Row').closest('th')?.querySelector('.lxn-data-table-sort-icon')).toBeTruthy();
    expect(document.querySelector('.lxn-data-table-col-header .lxn-data-table-sort-icon')).toBeNull();
  });

  it('re-toggling the row-label column actually reverses row order, not just its arrow', () => {
    const rows = [row('r1', 'A', 1, 0, 0), row('r2', 'B', 2, 0, 0), row('r3', 'C', 3, 0, 0)];
    render(<DataTable rowLabelHeader="Row" columnGroups={COLUMN_GROUPS} rows={rows} />);

    const labelsBefore = Array.from(document.querySelectorAll('.lxn-data-table-row')).map((r) => r.textContent);
    expect(labelsBefore[0]).toContain('A');
    expect(labelsBefore[2]).toContain('C');

    // Same column (row-label, already active by default) clicked again toggles direction.
    fireEvent.click(screen.getByText('Row'));
    const labelsAfter = Array.from(document.querySelectorAll('.lxn-data-table-row')).map((r) => r.textContent);
    expect(labelsAfter[0]).toContain('C');
    expect(labelsAfter[2]).toContain('A');
  });

  it('alternates background only by top-level position, and children keep their ancestor\'s color', () => {
    const rows = [
      row('r1', 'A', 1, 0, 0, [row('r1-child-1', 'A-child-1', 0, 0, 0), row('r1-child-2', 'A-child-2', 0, 0, 0)]),
      row('r2', 'B', 2, 0, 0),
      row('r3', 'C', 3, 0, 0),
    ];
    render(<DataTable rowLabelHeader="Row" columnGroups={COLUMN_GROUPS} rows={rows} />);
    fireEvent.click(screen.getByText('A'));

    const stripeOf = (text: string) =>
      screen
        .getByText(text)
        .closest('.lxn-data-table-row')
        ?.className.match(/lxn-data-table-row--stripe-\w/)?.[0];

    const aStripe = stripeOf('A');
    const bStripe = stripeOf('B');
    const cStripe = stripeOf('C');

    // Top-level rows alternate (A and C share a stripe; B, in between, differs).
    expect(aStripe).toBe(cStripe);
    expect(aStripe).not.toBe(bStripe);

    // Both of A's children inherit A's own stripe rather than alternating themselves.
    expect(stripeOf('A-child-1')).toBe(aStripe);
    expect(stripeOf('A-child-2')).toBe(aStripe);
  });

  it('is not expandable, and shows no disclosure chevron, for a row with no children', () => {
    const rows = [row('r1', 'A', 1, 0, 0)];
    render(<DataTable rowLabelHeader="Row" columnGroups={COLUMN_GROUPS} rows={rows} />);
    expect(document.querySelector('.lxn-data-table-disclosure-icon')).toBeNull();
    fireEvent.click(screen.getByText('A'));
    expect(screen.queryByText('child of A')).toBeNull();
  });

  it('reveals a row\'s children on click, and hides them again on a second click', () => {
    const rows = [row('r1', 'A', 1, 0, 0, [row('r1-child', 'child of A', 5, 0, 0)]), row('r2', 'B', 2, 0, 0)];
    render(<DataTable rowLabelHeader="Row" columnGroups={COLUMN_GROUPS} rows={rows} />);

    // Only the row with children gets a disclosure chevron.
    expect(document.querySelectorAll('.lxn-data-table-disclosure-icon')).toHaveLength(1);
    expect(screen.queryByText('child of A')).toBeNull();

    fireEvent.click(screen.getByText('A'));
    expect(screen.getByText('child of A')).toBeTruthy();

    fireEvent.click(screen.getByText('A'));
    expect(screen.queryByText('child of A')).toBeNull();

    // The childless row never opens.
    fireEvent.click(screen.getByText('B'));
    expect(screen.queryByText('child of A')).toBeNull();
  });

  it('expands a row via keyboard (Enter) when it has children', () => {
    const rows = [row('r1', 'A', 1, 0, 0, [row('r1-child', 'child of A', 5, 0, 0)])];
    render(<DataTable rowLabelHeader="Row" columnGroups={COLUMN_GROUPS} rows={rows} />);
    const expandableRow = screen.getByText('A').closest('[role="button"]') as HTMLElement;
    fireEvent.keyDown(expandableRow, { key: 'Enter' });
    expect(screen.getByText('child of A')).toBeTruthy();
  });

  it('drills down through multiple nested levels (children of children)', () => {
    const rows = [
      row('year', '2024', 1, 0, 0, [row('trim', 'LE', 2, 0, 0, [row('vehicle', 'Stock #1001', 3, 0, 0)])]),
    ];
    render(<DataTable rowLabelHeader="Year" columnGroups={COLUMN_GROUPS} rows={rows} />);

    expect(screen.queryByText('LE')).toBeNull();
    fireEvent.click(screen.getByText('2024'));
    expect(screen.getByText('LE')).toBeTruthy();
    expect(screen.queryByText('Stock #1001')).toBeNull();

    fireEvent.click(screen.getByText('LE'));
    expect(screen.getByText('Stock #1001')).toBeTruthy();
  });

  it('sorts children recursively by the same column and direction as their parents', () => {
    const rows = [
      row('p1', 'Parent', 1, 0, 0, [row('c-lo', 'low', 2, 0, 0), row('c-hi', 'high', 9, 0, 0)]),
    ];
    render(<DataTable rowLabelHeader="Row" columnGroups={COLUMN_GROUPS} rows={rows} />);
    fireEvent.click(screen.getByText('Parent'));
    fireEvent.click(screen.getByText('Units')); // descending by default

    // Expandable rows carry role="button" (for the disclosure affordance),
    // so they're invisible to getAllByRole('row') — query by lxn-ui's own
    // row class instead to reliably capture every body row.
    const labels = Array.from(document.querySelectorAll('.lxn-data-table-row')).map((r) => r.textContent);
    expect(labels[1]).toContain('high');
    expect(labels[2]).toContain('low');
  });

  it('calls onLeafClick with the row when a childless row is clicked, and never for a row with children', () => {
    const rows = [row('parent', 'A', 1, 0, 0, [row('child', 'A-child', 2, 0, 0)]), row('leaf', 'B', 3, 0, 0)];
    const onLeafClick = vi.fn();
    render(<DataTable rowLabelHeader="Row" columnGroups={COLUMN_GROUPS} rows={rows} onLeafClick={onLeafClick} />);

    // Clicking the branch row still just expands — never fires onLeafClick.
    fireEvent.click(screen.getByText('A'));
    expect(onLeafClick).not.toHaveBeenCalled();
    expect(screen.getByText('A-child')).toBeTruthy();

    // A leaf row calls back with its own DataTableRow.
    fireEvent.click(screen.getByText('B'));
    expect(onLeafClick).toHaveBeenCalledTimes(1);
    expect(onLeafClick.mock.calls[0]![0]).toMatchObject({ key: 'leaf', rowLabel: 'B' });

    // The leaf's own children (none) never enter — clicking it doesn't toggle anything visible.
    expect(document.querySelectorAll('.lxn-data-table-disclosure-icon')).toHaveLength(1);
  });

  it('leaves a childless row non-interactive (no role, not clickable) when onLeafClick is not supplied', () => {
    const rows = [row('leaf', 'B', 1, 0, 0)];
    render(<DataTable rowLabelHeader="Row" columnGroups={COLUMN_GROUPS} rows={rows} />);
    const leafRow = screen.getByText('B').closest('.lxn-data-table-row');
    expect(leafRow?.getAttribute('role')).toBeNull();
    expect(leafRow?.className).not.toContain('lxn-data-table-row--interactive');
  });

  it('activates onLeafClick via keyboard (Enter) on a leaf row', () => {
    const rows = [row('leaf', 'B', 1, 0, 0)];
    const onLeafClick = vi.fn();
    render(<DataTable rowLabelHeader="Row" columnGroups={COLUMN_GROUPS} rows={rows} onLeafClick={onLeafClick} />);
    const leafRow = screen.getByText('B').closest('[role="button"]') as HTMLElement;
    fireEvent.keyDown(leafRow, { key: 'Enter' });
    expect(onLeafClick).toHaveBeenCalledTimes(1);
  });
});
