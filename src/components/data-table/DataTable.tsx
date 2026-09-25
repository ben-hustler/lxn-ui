import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  /** Fixed width (px) of the row-identity column — an explicit override,
   * not a starting point for auto-sizing. Leave it unset (the default,
   * 2026-09-21) and DataTable measures the header's row-label SORT CONTROL
   * (the "Year → Trim" button, plus the arrow's own reserved slot) AND every
   * TOP-LEVEL row's own label (`rows` itself — depth 0, exactly what's on
   * screen before any drilldown expansion), and pins the column to whichever
   * of those actually needs the most room. Deeper rows — a drilldown's own
   * `children`, only ever on screen after an expand — are NEVER part of that
   * measurement: they get more `paddingLeft` the deeper they go (see the
   * depth-based inline style below) and can carry far longer leaf labels
   * than anything visible at the top, and letting either of those size or
   * grow the column would shift the group-boundary divider (a real
   * `border-left` off this same grid track) every time a row expanded or a
   * long leaf label scrolled into view. Longer row content than the
   * measured width still truncates with an ellipsis rather than growing the
   * column, exactly as before (2026-09-17 fix) — only WHERE the width comes
   * from changed, not that behavior. Pass this prop explicitly to pin a
   * literal width instead of measuring (still constant across drilldown
   * depth, same as always). */
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
  rowLabelColumnWidth,
  columnGroups,
  rows,
  summaryRow,
  maxBodyHeight = 420,
  onLeafClick,
  className,
}: DataTableProps) {
  const rowLabelHeaderText = rowLabelHeader.join(' → ');
  const rowLabelMeasureRef = useRef<HTMLSpanElement>(null);
  const rowLabelRowsMeasureRef = useRef<HTMLDivElement>(null);
  const [measuredRowLabelWidth, setMeasuredRowLabelWidth] = useState<number | null>(null);

  /** Measures the row-label column's required width off TWO hidden clones —
   * never the real header button or real body cells, both of which are
   * deliberately capped/clipped to whatever the column already is and would
   * just report that back. The result is the wider of:
   *
   * 1. The header's own sort control (`.lxn-data-table-row-header-sort-btn
   *    --measure` below) — label + the arrow's own reserved slot. The clone
   *    always renders the arrow (same as the real button), so switching
   *    which column is sorted, which only ever toggles that icon's
   *    `visibility`, never needs more room than what's already measured in.
   * 2. Every TOP-LEVEL row's own label (`.lxn-data-table-row-label-measure`
   *    below, one per `rows` entry — depth 0 only, exactly what's on screen
   *    before any drilldown expansion) — so a typical, unexpanded view of
   *    the table doesn't needlessly truncate a row label just because the
   *    header itself happened to be short (e.g. "Location").
   *
   * Deliberately NOT any row's `children` — those only come on screen after
   * an expand, and sizing off them would defeat the entire point of this
   * measurement being fixed in the first place: reopening the same "no
   * layout shift on drilldown" problem this whole scheme exists to avoid.
   *
   * Runs before paint (`useLayoutEffect`, not `useEffect`) so the first
   * PAINTED frame is already at the corrected width — nothing here should
   * ever visibly flash at the 196px fallback below. Skipped entirely once a
   * caller pins `rowLabelColumnWidth` explicitly. */
  useLayoutEffect(() => {
    if (rowLabelColumnWidth != null) return;
    const headerEl = rowLabelMeasureRef.current;
    if (!headerEl) return;
    let widest = headerEl.getBoundingClientRect().width;
    const rowClones = rowLabelRowsMeasureRef.current?.children ?? [];
    for (const clone of Array.from(rowClones)) {
      widest = Math.max(widest, clone.getBoundingClientRect().width);
    }
    setMeasuredRowLabelWidth(Math.ceil(widest));
  }, [rowLabelHeaderText, rows, rowLabelColumnWidth]);

  // Last-resort fallback for the one render before measurement lands (or an
  // environment with no real layout engine at all) — not a default meant to
  // describe any particular table's own content width anymore; see
  // `rowLabelColumnWidth`'s own doc comment.
  const effectiveRowLabelColumnWidth = rowLabelColumnWidth ?? measuredRowLabelWidth ?? 196;

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
          // row-label column stays a hard fixed width (`effectiveRowLabelColumnWidth`
          // — measured from the header's own sort control by default, see
          // `rowLabelColumnWidth`'s doc comment), but every measure column is
          // now `minmax(min-content, 1fr)` — equal width by default, and
          // ONLY a column whose own content genuinely needs more than its
          // equal share takes it, with the rest still splitting whatever's
          // left evenly. Native table auto-layout has no equivalent to this
          // (`table-layout: fixed` would just clip long content instead of
          // growing that one column; `auto` is the old "size everything
          // proportional to its own content" behavior this replaces).
          style={{ gridTemplateColumns: `${effectiveRowLabelColumnWidth}px repeat(${columns.length}, minmax(min-content, 1fr))` }}
        >
          <thead className={showTopShadow ? 'lxn-data-table-thead--shadow' : undefined}>
            {/* Taller when this is the ONLY header row (no summaryRow) — a
             * lone column-label row read thin/cramped next to a two-row
             * header block; see `.lxn-data-table-header-row--tall`. */}
            <tr className={summaryRow ? 'lxn-data-table-header-row--labels' : 'lxn-data-table-header-row--tall'}>
              <th
                className={`lxn-data-table-row-header-cell ${dividerClassName('none', !summaryRow)}`}
                aria-sort={sortColumnKey === null ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <button type="button" className="lxn-data-table-row-header-sort-btn lxn-l3" onClick={() => handleSort(null)}>
                  <span className="lxn-data-table-row-header-sort-label">{rowLabelHeaderText}</span>
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
      {/* Hidden clone of the row-label sort control, existing purely to be
       * MEASURED (see the `useLayoutEffect` above) — a sibling of the
       * scroll container, deliberately outside `<table>`/`<tr>` so it can
       * never itself become a grid item and shift the real column tracks.
       * Always renders the arrow icon unconditionally, same as the real
       * button, so the measured width already reserves its slot regardless
       * of which column is currently sorted.
       *
       * The label itself is a `data-label` attribute rendered via
       * `content: attr(data-label)` (the CSS below), not a real text child
       * — a `::before` pseudo-element still lays out as an ordinary flex
       * item and sizes this span's `getBoundingClientRect()` exactly as a
       * real text node would, but it's never part of the DOM's actual
       * `textContent`. Without that indirection this clone's label would be
       * a second copy of the exact same visible text as the real header
       * button (e.g. "Row"), which every OTHER test/consumer in this file
       * already finds via `getByText` — that duplicate silently turned a
       * single-match query into a "found 2 elements" failure. Same reason
       * the icon below carries its own `--measure` class rather than the
       * real `lxn-data-table-sort-icon` one: this icon's `visibility` never
       * toggles (it's always meant to occupy space, sort state or not), so
       * anything counting/asserting on real sort icons via that class —
       * correctly, since only the real header icons ever change
       * `visibility` — would otherwise pick up this one too. */}
      <span
        ref={rowLabelMeasureRef}
        className="lxn-data-table-row-header-sort-btn lxn-data-table-row-header-sort-btn--measure lxn-l3"
        aria-hidden="true"
        data-label={rowLabelHeaderText}
      >
        <ChevronDownIcon size={14} className="lxn-data-table-sort-icon--measure" />
      </span>
      {/* One hidden clone per TOP-LEVEL row (`rows` itself, depth 0 only —
       * see the `useLayoutEffect` above), so the column is also sized to fit
       * whatever's actually on screen before any drilldown expansion, not
       * just the header. Only a STRING `rowLabel` gets a clone — `rowLabel`
       * is typed as `ReactNode` generally, but the `data-label`/`::before`
       * trick (same reasoning as the header clone above, avoiding a second
       * query-able copy of the row's own visible text) only works for a
       * plain string; an arbitrary ReactNode label just doesn't contribute
       * to this measurement rather than risking a duplicate live copy of
       * whatever markup it actually is. Same reason the disclosure icon
       * below carries its own `--measure` class: a real
       * `.lxn-data-table-disclosure-icon` count is meaningful (exactly one
       * per currently-expanded branch) and this clone's icon, which never
       * expands anything, would otherwise inflate it. */}
      <div ref={rowLabelRowsMeasureRef} className="lxn-data-table-row-label-measure-container" aria-hidden="true">
        {rows
          .filter((row): row is DataTableRow & { rowLabel: string } => typeof row.rowLabel === 'string')
          .map((row) => (
            <span
              key={row.key}
              className="lxn-data-table-row-label-measure lxn-b2"
              data-label={row.rowLabel}
            >
              {row.children && row.children.length > 0 && (
                <ChevronDownIcon size={14} className="lxn-data-table-disclosure-icon--measure" />
              )}
            </span>
          ))}
      </div>
    </div>
  );
}
