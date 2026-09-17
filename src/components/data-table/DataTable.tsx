import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDownIcon } from '../icons/icons';
import './data-table.css';

export interface DataTableColumn {
  /** Unique key — also the key each row's `cells` record is looked up by. */
  key: string;
  /** Column header text, e.g. "Units", "Days to Sell". */
  label: string;
}

/** Groups measure columns for the sake of the heavier divider drawn before
 * each group's first column (e.g. 8 measures reading as 3 groups — Sold /
 * Cost / Profit) — `label` is kept for that grouping and for a consumer's
 * own bookkeeping, but is no longer rendered as a spanning header row
 * (2026-09-16 redesign, Figma node 2140:844): the group's own text label
 * was dropped in favor of the divider alone plus the summary row below. */
export interface DataTableColumnGroup {
  label: string;
  columns: DataTableColumn[];
}

export interface DataTableCell {
  /** Compared when this column is sorted. lxn-ui never re-derives a number
   * from `display` — the consumer supplies both, same reasoning as below. */
  sortValue: number;
  /** Pre-formatted display value. lxn-ui doesn't know about currency
   * prefixes, decimal rounding, or unit suffixes — same "consumer owns its
   * own vocabulary" rule as KpiTile's `value` prop. */
  display: ReactNode;
}

export interface DataTableRow {
  /** Stable React key for this row — not rendered anywhere. */
  key: string;
  /** Row-identity label. Pre-join it yourself when more than one dimension
   * identifies a row at a single level (e.g. "2024 · XLE") — a row only
   * ever renders one label; deeper dimensions (e.g. a trim under a year, or
   * a VIN under a trim) belong in `children`, not folded into the label. */
  rowLabel: ReactNode;
  /** One entry per column key declared across `columnGroups`. */
  cells: Record<string, DataTableCell>;
  /** Rows revealed one level down when this row is expanded — same shape,
   * recursively, so a hierarchy of arbitrary depth (e.g. Year → Trim →
   * Vehicle) nests by nesting `children` again inside each child. A row
   * with a non-empty `children` gets a disclosure chevron and indents each
   * descendant level a step further; a leaf row (no `children`, or an empty
   * array) renders exactly like any other row, just without the chevron. */
  children?: DataTableRow[];
}

/** A pinned summary row (e.g. "Avg.") rendered below the column headers,
 * inside the sticky header block rather than as a sortable/expandable body
 * row — it summarizes the whole result set, not one row of it, so it never
 * takes part in sorting or the row tree. */
export interface DataTableSummaryRow {
  /** Row-identity label, e.g. "Avg." */
  label: ReactNode;
  /** One pre-formatted display value per column key declared across
   * `columnGroups` — same "consumer owns its own vocabulary" rule as
   * `DataTableCell.display`. */
  cells: Record<string, ReactNode>;
}

export interface DataTableProps {
  /** Row-identity column header, as one label per nesting level in
   * drilldown order (e.g. `['Year', 'Trim']`, or `['Location']` for a flat,
   * non-drilling table) — DataTable joins them with "→" (the Figma
   * source's own separator, node 2140:844's "Year → Trim") rather than
   * taking a pre-composed string, so the header can never drift from what
   * `rows` actually contains: it's derived from the SAME data a caller's
   * own drilldown-building logic already knows precisely (which levels it
   * kept vs. skipped), not hand-typed prose duplicating that decision. */
  rowLabelHeader: string[];
  /** Fixed width (px) of the row-identity column — NOT just a starting
   * point for auto-sizing. A drilldown's deeper rows get more `paddingLeft`
   * (see the depth-based inline style below), and letting the browser
   * auto-size this column to content meant that padding could grow the
   * column itself once a deep enough row became visible, shifting every
   * later column by a sub-pixel amount — which was enough to flip the
   * group-boundary divider (drawn as `box-shadow`, not a real border,
   * since the sticky header can't use real borders) between rendering
   * crisp and rendering visibly thicker, depending on expand/collapse
   * state (2026-09-17 fix). Longer content than fits truncates with an
   * ellipsis rather than growing the column — the real behavior change
   * this fix trades for pixel-stable dividers. Default 196, matching the
   * Figma source's own row-label column width (node 2140:844). */
  rowLabelColumnWidth?: number;
  columnGroups: DataTableColumnGroup[];
  rows: DataTableRow[];
  /** A pinned summary row (e.g. dataset-wide averages) shown below the
   * column headers. Omit it and the header is just the one row of labels. */
  summaryRow?: DataTableSummaryRow;
  /** Caps the table's height and scrolls vertically past it, header pinned
   * in place — replaced client-side pagination (2026-09-10): the full row
   * set renders at once and scrolls instead of windowing into pages, so a
   * sort or expand never has to reason about "which page is this row on."
   * Default 420px. */
  maxBodyHeight?: number;
  /** Called when a LEAF row (no `children`) is clicked or activated via
   * keyboard — e.g. opening a detail modal for the specific vehicle a
   * drilldown bottomed out at. A branch row (has `children`) never calls
   * this; clicking one always toggles its own expansion instead, the same
   * as it did before this prop existed. Leaf rows only become
   * clickable/focusable at all once this is supplied. */
  onLeafClick?: (row: DataTableRow) => void;
  className?: string;
}

type SortDirection = 'asc' | 'desc';

/** Sorts every level of the tree by the same column/direction, recursively —
 * a drilldown's children are rows just like any other, so they sort the
 * same way their siblings-of-parents do. `sortColumnKey === null` has no
 * `sortValue` to compare (a row's label is a free-form `ReactNode`), but
 * `sortDirection` still has to mean something when the row-label column is
 * re-toggled — `desc` keeps the caller-supplied order, `asc` reverses it —
 * otherwise clicking that arrow flips its icon without changing anything,
 * which reads as "sort is broken". */
function sortTree(list: DataTableRow[], sortColumnKey: string | null, sortDirection: SortDirection): DataTableRow[] {
  const dir = sortDirection === 'asc' ? 1 : -1;
  const sorted = sortColumnKey
    ? [...list].sort((a, b) => ((a.cells[sortColumnKey]?.sortValue ?? 0) - (b.cells[sortColumnKey]?.sortValue ?? 0)) * dir)
    : sortDirection === 'asc'
      ? [...list].reverse()
      : list;
  return sorted.map((row) => (row.children && row.children.length > 0 ? { ...row, children: sortTree(row.children, sortColumnKey, sortDirection) } : row));
}

interface FlatRow {
  row: DataTableRow;
  depth: number;
}

/** Depth-first flatten, descending into a row's children only while it's in
 * `expandedKeys` — a collapsed row's children simply aren't in the list, so
 * every visible row (at any depth) is just one more entry to render, with
 * no special "expanded panel" shape to reason about separately. There are no
 * row/cell borders anywhere in the body (Figma node 2140:844 draws none) —
 * rows are told apart purely by an alternating background, which the caller
 * assigns by each row's position in this flat list, not by anything
 * computed here (depth included): a nested row continues the same
 * strict odd/even alternation as its siblings-in-the-flattened-sense,
 * rather than resetting or pinning to one color. */
function flattenTree(list: DataTableRow[], expandedKeys: Set<string>, depth = 0): FlatRow[] {
  const out: FlatRow[] = [];
  list.forEach((row) => {
    out.push({ row, depth });
    if (row.children && row.children.length > 0 && expandedKeys.has(row.key)) {
      out.push(...flattenTree(row.children, expandedKeys, depth + 1));
    }
  });
  return out;
}

type DividerWeight = 'none' | 'major' | 'minor';

/** Real borders now (2026-09-17 — replacing a `box-shadow`-based approach
 * that fought rendering instability all the way through this file's own
 * history: thicker-than-intended verticals, dividers flickering fully in
 * and out, a header/body alignment mismatch, all downstream of box-shadow
 * never getting the crisp, stable device-pixel treatment a real border
 * does). Box-shadow was only ever chosen because `position: sticky`
 * inside a `border-collapse: collapse` table drops its cells' collapsed
 * borders once it starts stickying (a real Chrome/Firefox bug) — sidestepped
 * now that this table is CSS Grid, not native table layout, at all (see
 * data-table.css's own comment on `.lxn-data-table-table`), which was a
 * bigger rework than just toggling `border-collapse`, but fixes the
 * underlying bug directly instead of avoiding real borders altogether.
 * `weight` draws the divider
 * before a measure-group's first column (e.g. before "Units", "ACV",
 * "Front Profit" — 8 measures reading as 3 groups) at one of two
 * strengths, matching the Figma source's own `border-l` (full weight) on
 * the FIRST one (separating the row-label column from the first measure
 * group) vs. `border-l-[0.5px]` (half weight) on every later one — same
 * color either way, just half the width, so it reads as visibly lighter.
 * `isBottomEdge` draws the line under the LAST header row, whichever row
 * that is (the summary row if there is one, otherwise the column-label
 * row) — never both rows at once, since nothing separates them from each
 * other, only the header block as a whole from the body beneath it. Also
 * full weight, matching the row-label/first-group divider — both are the
 * header block's own outer edges, not an internal seam between two
 * measure columns. */
function dividerClassName(weight: DividerWeight, isBottomEdge: boolean): string {
  const classes: string[] = [];
  if (weight === 'major') classes.push('lxn-data-table-divider-major');
  else if (weight === 'minor') classes.push('lxn-data-table-divider-minor');
  if (isBottomEdge) classes.push('lxn-data-table-divider-bottom');
  return classes.join(' ');
}

/** `sortColumnKey === null` means "sorted by the row-label column's own
 * (caller-supplied) drilldown order" — the default — rather than "no sort
 * indicator anywhere". Exactly one arrow is ever visible: on the row-label
 * column while `null`, or on whichever measure column was last clicked. */
export function DataTable({
  rowLabelHeader,
  rowLabelColumnWidth = 196,
  columnGroups,
  rows,
  summaryRow,
  maxBodyHeight = 420,
  onLeafClick,
  className,
}: DataTableProps) {
  const columns = useMemo(() => columnGroups.flatMap((g) => g.columns), [columnGroups]);
  // The first group's own first column (e.g. "Units") gets the 'major'
  // weight; every later group's first column (e.g. "ACV", "Front Profit")
  // gets 'minor' — see dividerClassName's own comment on why they differ.
  const dividerWeightByKey = useMemo(() => {
    const map = new Map<string, DividerWeight>();
    columnGroups.forEach((group, i) => {
      const key = group.columns[0]?.key;
      if (key) map.set(key, i === 0 ? 'major' : 'minor');
    });
    return map;
  }, [columnGroups]);

  const [sortColumnKey, setSortColumnKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  /** `columnKey === null` re-selects the row-label column (see the note
   * above) — the same toggle logic applies to it as to any measure column. */
  function handleSort(columnKey: string | null) {
    if (sortColumnKey === columnKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumnKey(columnKey);
      setSortDirection('desc');
    }
  }

  function toggleExpanded(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const sortedRows = useMemo(() => sortTree(rows, sortColumnKey, sortDirection), [rows, sortColumnKey, sortDirection]);
  const flatRows = useMemo(() => flattenTree(sortedRows, expandedKeys), [sortedRows, expandedKeys]);

  // The bottom "there's more below" shadow can't be a plain background on
  // `.lxn-data-table-scroll` — every row paints its own opaque stripe
  // background on top of it, so anything painted at the scroll container's
  // OWN background layer would just be hidden behind the rows. It's a real
  // overlay element instead, `position: sticky; bottom: 0` (2026-09-17,
  // corrected right back to this after a brief detour through `position:
  // absolute`, which turned out to scroll away WITH the content in Firefox
  // — contrary to how it behaved in Chrome during testing here. `sticky`
  // is the one mechanism that's reliably pinned-to-viewport-edge-within-a-
  // scroll-container across browsers). The top shadow doesn't need any of
  // this: `<thead>` is already sticky and already stacks above the body
  // rows, so it's just a conditional `boxShadow` on thead itself — no
  // separate element, no header-height measurement. Knowing whether to
  // show either needs actual scroll position, checked on mount/row-set
  // changes and on every scroll.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);

  function checkScrollShadows(el: HTMLDivElement) {
    setShowTopShadow(el.scrollTop > 0);
    setShowBottomShadow(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
  }

  useEffect(() => {
    if (scrollRef.current) checkScrollShadows(scrollRef.current);
  }, [flatRows]);

  const classes = ['lxn-data-table', className || ''].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div
        className="lxn-data-table-scroll"
        style={{ maxHeight: maxBodyHeight }}
        ref={scrollRef}
        onScroll={(e) => checkScrollShadows(e.currentTarget)}
      >
        <table
          className="lxn-data-table-table"
          // A CSS Grid table (2026-09-17 — see data-table.css's own comment
          // on `.lxn-data-table-table` for why `<table>`/`<thead>`/`<tbody>`/
          // `<tr>` keep their real tags despite the `display` override): the
          // row-label column stays a hard fixed width (`rowLabelColumnWidth`,
          // unchanged from before), but every measure column is now
          // `minmax(min-content, 1fr)` — equal width by default, and ONLY a
          // column whose own content genuinely needs more than its equal
          // share takes it, with the rest still splitting whatever's left
          // evenly. Native table auto-layout has no equivalent to this
          // (`table-layout: fixed` would just clip long content instead of
          // growing that one column; `auto` is the old "size everything
          // proportional to its own content" behavior this replaces).
          style={{ gridTemplateColumns: `${rowLabelColumnWidth}px repeat(${columns.length}, minmax(min-content, 1fr))` }}
        >
          <thead className={showTopShadow ? 'lxn-data-table-thead--shadow' : undefined}>
            {/* Taller when this is the ONLY header row (no summaryRow) — a
             * lone column-label row read thin/cramped next to a two-row
             * header block; see `.lxn-data-table-header-row--tall`. */}
            <tr className={!summaryRow ? 'lxn-data-table-header-row--tall' : undefined}>
              <th
                className={`lxn-data-table-row-header-cell ${dividerClassName('none', !summaryRow)}`}
                aria-sort={sortColumnKey === null ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <button type="button" className="lxn-data-table-row-header-sort-btn lxn-l3" onClick={() => handleSort(null)}>
                  <span>{rowLabelHeader.join(' → ')}</span>
                  <ChevronDownIcon
                    size={14}
                    className="lxn-data-table-sort-icon"
                    // Always mounted, at a fixed slot immediately right of
                    // the label — visibility (not conditional rendering)
                    // toggles which column's arrow shows, so activating a
                    // sort never shifts anything else in the row (2026-09-17
                    // CLS fix; an earlier pass only mounted the icon for the
                    // active column, which reflowed the whole button).
                    style={{
                      visibility: sortColumnKey === null ? 'visible' : 'hidden',
                      transform: sortDirection === 'asc' ? 'rotate(180deg)' : undefined,
                    }}
                  />
                </button>
              </th>
              {columns.map((column) => {
                const active = sortColumnKey === column.key;
                return (
                  <th
                    key={column.key}
                    className={['lxn-data-table-col-header', dividerClassName(dividerWeightByKey.get(column.key) ?? 'none', !summaryRow)].filter(Boolean).join(' ')}
                    aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button type="button" className="lxn-data-table-sort-btn lxn-l4" onClick={() => handleSort(column.key)}>
                      {/* Icon BEFORE the label (immediately to its left) —
                       * mirrors the row-label button's icon-after-label
                       * order for the opposite (right) text alignment.
                       * Always mounted, fixed slot, visibility toggled —
                       * same CLS fix as the row-label button above. */}
                      <ChevronDownIcon
                        size={14}
                        className="lxn-data-table-sort-icon"
                        style={{
                          visibility: active ? 'visible' : 'hidden',
                          transform: sortDirection === 'asc' ? 'rotate(180deg)' : undefined,
                        }}
                      />
                      <span>{column.label}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
            {summaryRow && (
              <tr>
                <th className={['lxn-data-table-row-header-cell', 'lxn-data-table-summary-cell', dividerClassName('none', true)].filter(Boolean).join(' ')}>
                  {summaryRow.label}
                </th>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={[
                      'lxn-data-table-cell',
                      'lxn-data-table-summary-cell',
                      'lxn-num',
                      dividerClassName(dividerWeightByKey.get(column.key) ?? 'none', true),
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {summaryRow.cells[column.key]}
                  </td>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {flatRows.map(({ row, depth }, i) => {
              const isExpandable = Boolean(row.children && row.children.length > 0);
              const isOpen = isExpandable && expandedKeys.has(row.key);
              // A leaf only becomes interactive at all once `onLeafClick` is
              // supplied — otherwise it renders exactly as it did before
              // that prop existed.
              const isLeafClickable = !isExpandable && Boolean(onLeafClick);
              const isInteractive = isExpandable || isLeafClickable;
              const activate = isExpandable ? () => toggleExpanded(row.key) : isLeafClickable ? () => onLeafClick!(row) : undefined;
              // Depth 0 reads as the table's normal body copy; any nested
              // level reads smaller/secondary (2026-09-16 redesign) —
              // replacing the old "bump to medium while THIS branch is
              // open" rule, which no longer applies once open branches stay
              // at normal size and only depth distinguishes a row.
              const textClass = depth === 0 ? 'lxn-b2' : 'lxn-l3';
              // Strict odd/even alternation over EVERY visible row, nested
              // or not (2026-09-16 redesign, corrected) — a row's shade
              // never resets at a group boundary and never pins to one
              // color at a given depth; it's purely "does this row's
              // position in the visible list flip the shade from the row
              // above it."
              const stripeClass = i % 2 === 0 ? 'lxn-data-table-row--stripe-a' : 'lxn-data-table-row--stripe-b';
              const rowClasses = [
                'lxn-data-table-row',
                stripeClass,
                isInteractive ? 'lxn-data-table-row--interactive' : '',
                isLeafClickable ? 'lxn-data-table-row--leaf-clickable' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <tr
                  key={row.key}
                  className={rowClasses}
                  onClick={activate}
                  tabIndex={isInteractive ? 0 : undefined}
                  role={isInteractive ? 'button' : undefined}
                  aria-expanded={isExpandable ? isOpen : undefined}
                  onKeyDown={
                    activate
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            activate();
                          }
                        }
                      : undefined
                  }
                >
                  <th
                    scope="row"
                    className={`lxn-data-table-row-header-cell ${textClass}`}
                    // Base padding (--space-3) matches every other cell's own
                    // left inset at depth 0; each level beyond that adds a
                    // full --space-5 step rather than repeating --space-3 —
                    // the original step read as too subtle to tell depth
                    // apart at a glance once there were 2-3 levels of it.
                    style={{ paddingLeft: `calc(var(--space-3) + var(--space-5) * ${depth})` }}
                  >
                    <span className="lxn-data-table-row-header-inner">
                      {isExpandable && (
                        <ChevronDownIcon
                          size={14}
                          className="lxn-data-table-disclosure-icon"
                          style={{ transform: isOpen ? undefined : 'rotate(-90deg)' }}
                        />
                      )}
                      {/* Own truncation target, not the flex row above —
                       * `text-overflow: ellipsis` needs a single text-ish
                       * box to clip; putting it here (with `min-width: 0`
                       * to let it actually shrink inside the flex row)
                       * keeps the disclosure icon itself always fully
                       * visible, truncating only the label next to it. */}
                      <span className="lxn-data-table-row-header-label">{row.rowLabel}</span>
                    </span>
                  </th>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={[
                        'lxn-data-table-cell',
                        'lxn-num',
                        textClass,
                        dividerClassName(dividerWeightByKey.get(column.key) ?? 'none', false),
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {row.cells[column.key]?.display}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* A later sibling of `<table>`, not a background layer, so it
         * paints ON TOP of the last row's own opaque background —
         * `position: sticky; bottom: 0` with zero net height (its negative
         * margin-top cancels its own height) settles at whatever is
         * CURRENTLY the visible bottom edge as long as there's more content
         * below, then comes to rest at its natural (harmless,
         * already-transparent) spot once you've scrolled to the true end.
         * `showBottomShadow` is what actually hides it there — the sticky
         * mechanics alone don't make it disappear, they just stop moving. */}
        <div className="lxn-data-table-bottom-shadow" style={{ opacity: showBottomShadow ? 1 : 0 }} aria-hidden="true" />
      </div>
    </div>
  );
}
