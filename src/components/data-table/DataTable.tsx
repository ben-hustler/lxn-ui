import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDownIcon } from '../icons/icons';
import './data-table.css';

export interface DataTableColumn {
  /** Unique key — also the key each row's `cells` record is looked up by. */
  key: string;
  /** Column header text, e.g. "Units", "Days to Sell". */
  label: string;
}

/** A spanning header row above the individual column headers, e.g. "Sold" /
 * "Cost" / "Profit" grouping several measure columns — built for
 * appraisal-internals' detail tables, whose 8 measures read as 3 groups in
 * the legacy config this replaces. Also how two columns that would
 * otherwise share an identical label (e.g. two columns both titled "Total")
 * stay disambiguated, by group context rather than a re-worded label. */
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

export interface DataTableProps {
  /** Header label for the row-identity column, e.g. "Year → Trim", "Location". */
  rowLabelHeader: string;
  columnGroups: DataTableColumnGroup[];
  rows: DataTableRow[];
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

type StripeClass = 'lxn-data-table-row--stripe-a' | 'lxn-data-table-row--stripe-b';

interface FlatRow {
  row: DataTableRow;
  depth: number;
  stripeClass: StripeClass;
}

/** Depth-first flatten, descending into a row's children only while it's in
 * `expandedKeys` — a collapsed row's children simply aren't in the list, so
 * every visible row (at any depth) is just one more entry to render, with
 * no special "expanded panel" shape to reason about separately.
 *
 * Alternates `stripeClass` by index only among TOP-level siblings (when
 * `inheritedStripe` is unset); every descendant then inherits its
 * top-level ancestor's stripe unchanged, so a drilldown's children read as
 * the same color as their parent rather than continuing their own
 * odd/even count. */
function flattenTree(list: DataTableRow[], expandedKeys: Set<string>, depth = 0, inheritedStripe?: StripeClass): FlatRow[] {
  const out: FlatRow[] = [];
  list.forEach((row, i) => {
    const stripeClass: StripeClass = inheritedStripe ?? (i % 2 === 0 ? 'lxn-data-table-row--stripe-a' : 'lxn-data-table-row--stripe-b');
    out.push({ row, depth, stripeClass });
    if (row.children && row.children.length > 0 && expandedKeys.has(row.key)) {
      out.push(...flattenTree(row.children, expandedKeys, depth + 1, stripeClass));
    }
  });
  return out;
}

/** `sortColumnKey === null` means "sorted by the row-label column's own
 * (caller-supplied) drilldown order" — the default — rather than "no sort
 * indicator anywhere". Exactly one arrow is ever visible: on the row-label
 * column while `null`, or on whichever measure column was last clicked. */
export function DataTable({ rowLabelHeader, columnGroups, rows, maxBodyHeight = 420, onLeafClick, className }: DataTableProps) {
  const columns = useMemo(() => columnGroups.flatMap((g) => g.columns), [columnGroups]);

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

  const classes = ['lxn-data-table', className || ''].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="lxn-data-table-scroll" style={{ maxHeight: maxBodyHeight }}>
        <table className="lxn-data-table-table">
          <thead>
            <tr>
              <th className="lxn-data-table-corner-header" aria-hidden="true" />
              {columnGroups.map((group) => (
                <th key={group.label} colSpan={group.columns.length} className="lxn-data-table-group-header lxn-eyebrow">
                  {group.label}
                </th>
              ))}
            </tr>
            <tr>
              <th
                className="lxn-data-table-row-header-cell"
                aria-sort={sortColumnKey === null ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <button type="button" className="lxn-data-table-row-header-sort-btn lxn-l3" onClick={() => handleSort(null)}>
                  <span>{rowLabelHeader}</span>
                  {sortColumnKey === null && (
                    <ChevronDownIcon
                      size={14}
                      className="lxn-data-table-sort-icon"
                      style={{ transform: sortDirection === 'asc' ? 'rotate(180deg)' : undefined }}
                    />
                  )}
                </button>
              </th>
              {columns.map((column) => {
                const active = sortColumnKey === column.key;
                return (
                  <th key={column.key} className="lxn-data-table-col-header" aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" className="lxn-data-table-sort-btn lxn-l3" onClick={() => handleSort(column.key)}>
                      <span>{column.label}</span>
                      {active && (
                        <ChevronDownIcon
                          size={14}
                          className="lxn-data-table-sort-icon"
                          style={{ transform: sortDirection === 'asc' ? 'rotate(180deg)' : undefined }}
                        />
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {flatRows.map(({ row, depth, stripeClass }) => {
              const isExpandable = Boolean(row.children && row.children.length > 0);
              const isOpen = isExpandable && expandedKeys.has(row.key);
              // A leaf only becomes interactive at all once `onLeafClick` is
              // supplied — otherwise it renders exactly as it did before
              // that prop existed.
              const isLeafClickable = !isExpandable && Boolean(onLeafClick);
              const isInteractive = isExpandable || isLeafClickable;
              const activate = isExpandable ? () => toggleExpanded(row.key) : isLeafClickable ? () => onLeafClick!(row) : undefined;
              const rowClasses = ['lxn-data-table-row', stripeClass, isInteractive ? 'lxn-data-table-row--interactive' : ''].filter(Boolean).join(' ');

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
                    className={`lxn-data-table-row-header-cell ${isOpen ? 'lxn-b3' : 'lxn-b2'}`}
                    style={{ paddingLeft: `calc(var(--space-3) * ${depth + 1})` }}
                  >
                    <span className="lxn-data-table-row-header-inner">
                      {isExpandable && (
                        <ChevronDownIcon
                          size={14}
                          className="lxn-data-table-disclosure-icon"
                          style={{ transform: isOpen ? undefined : 'rotate(-90deg)' }}
                        />
                      )}
                      {row.rowLabel}
                    </span>
                  </th>
                  {columns.map((column) => (
                    <td key={column.key} className={`lxn-data-table-cell lxn-num ${isOpen ? 'lxn-b3' : 'lxn-b2'}`}>
                      {row.cells[column.key]?.display}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
