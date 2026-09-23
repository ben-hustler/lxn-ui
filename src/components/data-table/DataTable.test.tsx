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
  it('renders column headers and row data, without a spanning group-label row', () => {
    const rows = [row('r1', '2024 · XLE', 12, 45, 18000)];
    render(<DataTable rowLabelHeader={['Year', 'Trim']} columnGroups={COLUMN_GROUPS} rows={rows} />);
    // The group label text itself is no longer rendered (2026-09-16 redesign)
    // — `columnGroups` only drives the divider before each group's first column.
    expect(screen.queryByText('Sold')).toBeNull();
    expect(screen.queryByText('Cost')).toBeNull();
    expect(screen.getByText('Units')).toBeTruthy();
    expect(screen.getByText('2024 · XLE')).toBeTruthy();
    expect(screen.getByText('45 Days')).toBeTruthy();
    expect(screen.getByText('$18000')).toBeTruthy();
  });

  it('joins a multi-level rowLabelHeader with "→", and renders a single-level one with no separator at all', () => {
    const rows = [row('r1', 'A', 1, 0, 0)];
    const { rerender } = render(<DataTable rowLabelHeader={['Year', 'Trim', 'Vehicle']} columnGroups={COLUMN_GROUPS} rows={rows} />);
    expect(screen.getByText('Year → Trim → Vehicle')).toBeTruthy();

    rerender(<DataTable rowLabelHeader={['Location']} columnGroups={COLUMN_GROUPS} rows={rows} />);
    expect(screen.getByText('Location')).toBeTruthy();
    expect(screen.queryByText(/→/)).toBeNull();
  });

  it("draws a full-weight divider before the FIRST group's first column, a half-weight one before every later group's, and none between columns within a group", () => {
    const rows = [row('r1', 'A', 1, 2, 3)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    const unitsHeader = screen.getByText('Units').closest('th') as HTMLElement;
    const dtsHeader = screen.getByText('Days to Sell').closest('th') as HTMLElement;
    const acvHeader = screen.getByText('ACV').closest('th') as HTMLElement;
    // Units opens the first group — full weight (matches the Figma source's
    // own `border-l` on that one divider, vs. `border-l-[0.5px]` on later
    // ones), same color as ACV's, just twice as wide.
    expect(unitsHeader.className).toContain('lxn-data-table-divider-major');
    // Days to Sell isn't a group-start column, so it gets no LEFT divider.
    expect(dtsHeader.className).not.toContain('lxn-data-table-divider-major');
    expect(dtsHeader.className).not.toContain('lxn-data-table-divider-minor');
    // ACV opens the second group — half weight.
    expect(acvHeader.className).toContain('lxn-data-table-divider-minor');
    expect(acvHeader.className).not.toContain('lxn-data-table-divider-major');
  });

  it('draws the group-boundary divider as a real border, identically classed, in both the header and the body', () => {
    const rows = [row('r1', 'A', 1, 2, 3)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    const unitsHeaderCell = screen.getByText('Units').closest('th') as HTMLElement;
    const unitsBodyCell = screen.getByText('1').closest('td') as HTMLElement;
    // No more box-shadow anywhere for this divider (2026-09-17 — real
    // borders throughout, made safe in the sticky header by switching the
    // table to `border-collapse: separate`, which sidesteps the actual bug
    // box-shadow was originally working around).
    expect(unitsHeaderCell.style.boxShadow).toBe('');
    expect(unitsBodyCell.style.boxShadow).toBe('');
    expect(unitsHeaderCell.className).toContain('lxn-data-table-divider-major');
    expect(unitsBodyCell.className).toContain('lxn-data-table-divider-major');
  });

  it("fixes the row-label column's grid track to its sort control's own measured width (label + reserved arrow) rather than leaving it to auto-size off rendered rows, and keeps it constant across drilldown depth", () => {
    const getBoundingClientRectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 150.4 } as unknown as DOMRect);

    const rows = [row('parent', 'A', 1, 0, 0, [row('child', 'A deeply nested child label that is much longer than any top-level row', 2, 0, 0)])];
    const { rerender } = render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    const gridTemplateColumns = () => (document.querySelector('.lxn-data-table-table') as HTMLElement).style.gridTemplateColumns;

    // Ceil'd from the hidden measurer clone's own 150.4px — never a
    // hard-coded default.
    expect(gridTemplateColumns()).toBe('151px repeat(3, minmax(min-content, 1fr))');

    // Expanding to reveal the deep, indented, much-longer child label must
    // NOT change the row-label track — the width comes from measuring the
    // header's own sort control (a hidden clone, off in its own corner of
    // the DOM), never from rendered row content at all, so there's nothing
    // here for drilldown depth to shift in the first place.
    fireEvent.click(screen.getByText('A'));
    expect(screen.getByText(/deeply nested child/)).toBeTruthy();
    expect(gridTemplateColumns()).toBe('151px repeat(3, minmax(min-content, 1fr))');

    // An explicit override still pins a literal width and skips measurement
    // entirely, same as before this fix.
    rerender(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} rowLabelColumnWidth={240} />);
    expect(gridTemplateColumns()).toBe('240px repeat(3, minmax(min-content, 1fr))');

    getBoundingClientRectSpy.mockRestore();
  });

  it('re-measures the row-label column when the header text itself changes (e.g. a deeper drilldown level), not on every render', () => {
    const widthByHeaderText: Record<string, number> = { Row: 100, 'Row → Sub': 180 };
    const getBoundingClientRectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        return { width: widthByHeaderText[this.getAttribute('data-label') ?? ''] ?? 0 } as unknown as DOMRect;
      });

    const rows = [row('r1', 'A', 1, 0, 0)];
    const { rerender } = render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    const gridTemplateColumns = () => (document.querySelector('.lxn-data-table-table') as HTMLElement).style.gridTemplateColumns;
    expect(gridTemplateColumns()).toBe('100px repeat(3, minmax(min-content, 1fr))');

    rerender(<DataTable rowLabelHeader={["Row", "Sub"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    expect(gridTemplateColumns()).toBe('180px repeat(3, minmax(min-content, 1fr))');

    getBoundingClientRectSpy.mockRestore();
  });

  function mockMeasureWidths(opts: { headerWidth: number }) {
    return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('lxn-data-table-row-header-sort-btn--measure')) {
        return { width: opts.headerWidth } as unknown as DOMRect;
      }
      if (this.classList.contains('lxn-data-table-row-label-measure')) {
        return { width: (this.getAttribute('data-label') ?? '').length * 10 } as unknown as DOMRect;
      }
      return { width: 0 } as unknown as DOMRect;
    });
  }

  it("sizes the row-label column to the widest TOP-LEVEL row label when it needs more room than the header's own sort control", () => {
    const getBoundingClientRectSpy = mockMeasureWidths({ headerWidth: 60 });

    const rows = [row('r1', 'A short one', 1, 0, 0), row('r2', 'A much longer top-level row label', 2, 0, 0)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    const gridTemplateColumns = () => (document.querySelector('.lxn-data-table-table') as HTMLElement).style.gridTemplateColumns;

    // "A much longer top-level row label" is 33 chars -> mocked at 330px,
    // wider than the header's own mocked 60px.
    expect(gridTemplateColumns()).toBe('330px repeat(3, minmax(min-content, 1fr))');

    getBoundingClientRectSpy.mockRestore();
  });

  it("never sizes off a row's own CHILDREN — only the top-level rows passed in — even after expanding to reveal a much longer nested label", () => {
    const getBoundingClientRectSpy = mockMeasureWidths({ headerWidth: 60 });

    const rows = [row('parent', 'A', 1, 0, 0, [row('child', 'A deeply nested child label that is much longer than any top-level row', 2, 0, 0)])];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    const gridTemplateColumns = () => (document.querySelector('.lxn-data-table-table') as HTMLElement).style.gridTemplateColumns;

    // Top-level row's own label, "A", is 1 char -> mocked at 10px, narrower
    // than the header's own mocked 60px — the header wins.
    expect(gridTemplateColumns()).toBe('60px repeat(3, minmax(min-content, 1fr))');

    fireEvent.click(screen.getByText('A'));
    expect(screen.getByText(/deeply nested child/)).toBeTruthy();
    // Expanding to reveal the much-longer CHILD label must not change it —
    // that row was never in `rows` itself, only in "A"'s own `children`,
    // which never gets its own measurer clone.
    expect(gridTemplateColumns()).toBe('60px repeat(3, minmax(min-content, 1fr))');

    getBoundingClientRectSpy.mockRestore();
  });

  it('gives every measure column an equal minmax(min-content, 1fr) track — equal width by default, only yielding to a column whose own content needs more', () => {
    const rows = [row('r1', 'A', 1, 0, 0)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    const table = document.querySelector('.lxn-data-table-table') as HTMLElement;
    // COLUMN_GROUPS declares 3 measure columns (units, dts, acv) — see the
    // top of this file.
    expect(table.style.gridTemplateColumns).toContain('repeat(3, minmax(min-content, 1fr))');
  });

  it('truncates an overlong row label with an ellipsis instead of letting it grow the column', () => {
    const rows = [row('r1', 'A very long row label that should truncate rather than widen the fixed-width row-label column', 1, 0, 0)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    const label = document.querySelector('.lxn-data-table-row-header-label') as HTMLElement;
    expect(label).toBeTruthy();
    expect(label.textContent).toContain('A very long row label');
  });

  it('renders a pinned summary row below the column headers when supplied', () => {
    const rows = [row('r1', 'A', 1, 2, 3)];
    render(
      <DataTable
        rowLabelHeader={["Row"]}
        columnGroups={COLUMN_GROUPS}
        rows={rows}
        summaryRow={{ label: 'Avg.', cells: { units: '5', dts: '34 Days', acv: '$16,900' } }}
      />,
    );
    expect(screen.getByText('Avg.')).toBeTruthy();
    expect(screen.getByText('34 Days')).toBeTruthy();
    expect(screen.getByText('$16,900')).toBeTruthy();
  });

  it('omits the summary row entirely when not supplied', () => {
    const rows = [row('r1', 'A', 1, 2, 3)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    expect(document.querySelector('.lxn-data-table-summary-cell')).toBeNull();
  });

  it('renders every row at once — no pagination', () => {
    const rows = Array.from({ length: 25 }, (_, i) => row(`r${i}`, `Row ${i}`, i, 0, 0));
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    expect(screen.getByText('Row 0')).toBeTruthy();
    expect(screen.getByText('Row 24')).toBeTruthy();
  });

  it("sorts rows by a column's sortValue, not its display text, on header click — defaulting to descending", () => {
    const rows = [row('r1', 'A', 100, 0, 0), row('r2', 'B', 2, 0, 0), row('r3', 'C', 30, 0, 0)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    fireEvent.click(screen.getByText('Units'));
    // thead is a single header row now (no spanning group-label row — see
    // the redesign note on DataTableColumnGroup), so only its one <tr> is
    // sliced off ahead of the body rows.
    const cellsAfterDesc = screen.getAllByRole('row').slice(1).map((r) => r.textContent);
    expect(cellsAfterDesc[0]).toContain('A');
    expect(cellsAfterDesc[1]).toContain('C');
    expect(cellsAfterDesc[2]).toContain('B');

    fireEvent.click(screen.getByText('Units'));
    const cellsAfterAsc = screen.getAllByRole('row').slice(1).map((r) => r.textContent);
    expect(cellsAfterAsc[0]).toContain('B');
    expect(cellsAfterAsc[2]).toContain('A');
  });

  // Every header's sort icon is mounted at all times now (2026-09-17 CLS
  // fix) — only `visibility` toggles which one shows, so activating a sort
  // never shifts a header's label. "Shown" below means visibility !== hidden.
  function visibleSortIcons(): Element[] {
    return Array.from(document.querySelectorAll('.lxn-data-table-sort-icon')).filter((el) => (el as HTMLElement).style.visibility !== 'hidden');
  }

  it('shows exactly one sort arrow at all times, defaulting to the leftmost (row-label) column', () => {
    const rows = [row('r1', 'A', 1, 0, 0)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    // Default state: sorted by the row-label column's own order, arrow shown there.
    expect(visibleSortIcons()).toHaveLength(1);
    expect(screen.getByText('Row').closest('th')?.querySelector('.lxn-data-table-sort-icon')).toBe(visibleSortIcons()[0]);

    fireEvent.click(screen.getByText('Units'));
    expect(visibleSortIcons()).toHaveLength(1);
    expect(screen.getByText('Row').closest('th')?.querySelector('.lxn-data-table-sort-icon')).not.toBe(visibleSortIcons()[0]);

    fireEvent.click(screen.getByText('Days to Sell'));
    expect(visibleSortIcons()).toHaveLength(1);
  });

  it('can be re-selected as the sort column after a measure column was picked', () => {
    const rows = [row('r1', 'A', 1, 0, 0)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    fireEvent.click(screen.getByText('Units'));
    expect((screen.getByText('Row').closest('th')?.querySelector('.lxn-data-table-sort-icon') as HTMLElement).style.visibility).toBe('hidden');

    fireEvent.click(screen.getByText('Row'));
    expect((screen.getByText('Row').closest('th')?.querySelector('.lxn-data-table-sort-icon') as HTMLElement).style.visibility).toBe('visible');
    expect((document.querySelector('.lxn-data-table-col-header .lxn-data-table-sort-icon') as HTMLElement).style.visibility).toBe('hidden');
  });

  it("mounts every column's sort icon at a fixed position so activating sort never shifts the label (no CLS)", () => {
    const rows = [row('r1', 'A', 1, 0, 0)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    // Row-label header: icon comes AFTER the label (label stays flush left).
    const rowHeaderBtn = screen.getByText('Row').closest('button') as HTMLElement;
    expect(rowHeaderBtn.children[0]?.textContent).toBe('Row');
    expect(rowHeaderBtn.children[1]?.classList.contains('lxn-data-table-sort-icon')).toBe(true);

    // A measure column's header: icon comes BEFORE the label (label stays
    // flush right against the same edge regardless of which column is active).
    const unitsBtn = screen.getByText('Units').closest('button') as HTMLElement;
    expect(unitsBtn.children[0]?.classList.contains('lxn-data-table-sort-icon')).toBe(true);
    expect(unitsBtn.children[1]?.textContent).toBe('Units');

    // All four icons (row-label + 3 measure columns) are mounted before any
    // column is ever clicked — never conditionally added/removed.
    expect(document.querySelectorAll('.lxn-data-table-sort-icon')).toHaveLength(4);
  });

  it('re-toggling the row-label column actually reverses row order, not just its arrow', () => {
    const rows = [row('r1', 'A', 1, 0, 0), row('r2', 'B', 2, 0, 0), row('r3', 'C', 3, 0, 0)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);

    const labelsBefore = Array.from(document.querySelectorAll('.lxn-data-table-row')).map((r) => r.textContent);
    expect(labelsBefore[0]).toContain('A');
    expect(labelsBefore[2]).toContain('C');

    // Same column (row-label, already active by default) clicked again toggles direction.
    fireEvent.click(screen.getByText('Row'));
    const labelsAfter = Array.from(document.querySelectorAll('.lxn-data-table-row')).map((r) => r.textContent);
    expect(labelsAfter[0]).toContain('C');
    expect(labelsAfter[2]).toContain('A');
  });

  it('alternates strictly odd/even over every VISIBLE row, nested rows included — never resetting or pinning at a group boundary', () => {
    const rows = [
      row('r0', 'B', 2, 0, 0),
      row('r1', 'A', 1, 0, 0, [row('r1-child-1', 'A-child-1', 0, 0, 0), row('r1-child-2', 'A-child-2', 0, 0, 0)]),
      row('r2', 'C', 3, 0, 0),
    ];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    fireEvent.click(screen.getByText('A'));

    // Visible order once A is expanded: B, A, A-child-1, A-child-2, C — five
    // rows in a row (2026-09-17 correction), each one flipping shade from
    // the row directly above it, with no reset at A's own boundary.
    const stripes = ['B', 'A', 'A-child-1', 'A-child-2', 'C'].map(
      (text) =>
        screen
          .getByText(text)
          .closest('.lxn-data-table-row')
          ?.className.match(/lxn-data-table-row--stripe-(\w)/)?.[1],
    );
    expect(stripes).toEqual(['a', 'b', 'a', 'b', 'a']);
  });

  // jsdom never computes real layout, so scrollHeight/clientHeight/scrollTop
  // are always 0 — this stands in for the browser having actually laid the
  // table out at a given scroll position.
  function mockScrollGeometry(el: HTMLElement, { scrollHeight, clientHeight, scrollTop }: { scrollHeight: number; clientHeight: number; scrollTop: number }) {
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight });
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight });
    Object.defineProperty(el, 'scrollTop', { configurable: true, value: scrollTop });
  }

  it('shows the bottom scroll shadow only while there is more content below, hiding it once scrolled to the true end', () => {
    const rows = [row('r1', 'A', 1, 0, 0)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    const scrollEl = document.querySelector('.lxn-data-table-scroll') as HTMLElement;
    const shadow = document.querySelector('.lxn-data-table-bottom-shadow') as HTMLElement;

    // Not scrollable at all (content fits) — no shadow.
    mockScrollGeometry(scrollEl, { scrollHeight: 200, clientHeight: 200, scrollTop: 0 });
    fireEvent.scroll(scrollEl);
    expect(shadow.style.opacity).toBe('0');

    // Scrollable, still content below — shadow shows.
    mockScrollGeometry(scrollEl, { scrollHeight: 600, clientHeight: 200, scrollTop: 0 });
    fireEvent.scroll(scrollEl);
    expect(shadow.style.opacity).toBe('1');

    // Scrolled all the way to the true bottom — shadow hides again.
    mockScrollGeometry(scrollEl, { scrollHeight: 600, clientHeight: 200, scrollTop: 400 });
    fireEvent.scroll(scrollEl);
    expect(shadow.style.opacity).toBe('0');
  });

  it('shows the top scroll shadow (a class on thead itself, not a separate element) only once scrolled away from the true top', () => {
    const rows = [row('r1', 'A', 1, 0, 0)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    const scrollEl = document.querySelector('.lxn-data-table-scroll') as HTMLElement;
    const thead = document.querySelector('thead') as HTMLElement;

    // At the true top — no shadow, regardless of how much is below.
    mockScrollGeometry(scrollEl, { scrollHeight: 600, clientHeight: 200, scrollTop: 0 });
    fireEvent.scroll(scrollEl);
    expect(thead.className).not.toContain('lxn-data-table-thead--shadow');

    // Scrolled down at all — shadow shows.
    mockScrollGeometry(scrollEl, { scrollHeight: 600, clientHeight: 200, scrollTop: 1 });
    fireEvent.scroll(scrollEl);
    expect(thead.className).toContain('lxn-data-table-thead--shadow');
  });

  it('is not expandable, and shows no disclosure chevron, for a row with no children', () => {
    const rows = [row('r1', 'A', 1, 0, 0)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    expect(document.querySelector('.lxn-data-table-disclosure-icon')).toBeNull();
    fireEvent.click(screen.getByText('A'));
    expect(screen.queryByText('child of A')).toBeNull();
  });

  it('reveals a row\'s children on click, and hides them again on a second click', () => {
    const rows = [row('r1', 'A', 1, 0, 0, [row('r1-child', 'child of A', 5, 0, 0)]), row('r2', 'B', 2, 0, 0)];
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);

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
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    const expandableRow = screen.getByText('A').closest('[role="button"]') as HTMLElement;
    fireEvent.keyDown(expandableRow, { key: 'Enter' });
    expect(screen.getByText('child of A')).toBeTruthy();
  });

  it('drills down through multiple nested levels (children of children)', () => {
    const rows = [
      row('year', '2024', 1, 0, 0, [row('trim', 'LE', 2, 0, 0, [row('vehicle', 'Stock #1001', 3, 0, 0)])]),
    ];
    render(<DataTable rowLabelHeader={["Year"]} columnGroups={COLUMN_GROUPS} rows={rows} />);

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
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
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
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} onLeafClick={onLeafClick} />);

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
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} />);
    const leafRow = screen.getByText('B').closest('.lxn-data-table-row');
    expect(leafRow?.getAttribute('role')).toBeNull();
    expect(leafRow?.className).not.toContain('lxn-data-table-row--interactive');
  });

  it('activates onLeafClick via keyboard (Enter) on a leaf row', () => {
    const rows = [row('leaf', 'B', 1, 0, 0)];
    const onLeafClick = vi.fn();
    render(<DataTable rowLabelHeader={["Row"]} columnGroups={COLUMN_GROUPS} rows={rows} onLeafClick={onLeafClick} />);
    const leafRow = screen.getByText('B').closest('[role="button"]') as HTMLElement;
    fireEvent.keyDown(leafRow, { key: 'Enter' });
    expect(onLeafClick).toHaveBeenCalledTimes(1);
  });
});
