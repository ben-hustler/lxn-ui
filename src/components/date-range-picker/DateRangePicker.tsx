import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CheckIcon, BackArrowIcon, CalendarIcon } from '../icons/icons';
import './date-range-picker.css';

// Position math copied from SearchSelect.tsx (see that component's own
// comment on why this is a local copy, not a shared util).
const EDGE_MARGIN = 8;
const ANCHOR_GAP = 6;
const PRESET_MIN_PANEL_WIDTH = 200;
const CALENDAR_MIN_PANEL_WIDTH = 260;

function snapToDevicePixel(px: number): number {
  const dpr = window.devicePixelRatio || 1;
  return Math.round(px * dpr) / dpr;
}

function positionPanel(trigger: HTMLElement, panel: HTMLElement, minWidth: number) {
  const rect = trigger.getBoundingClientRect();
  const width = Math.max(rect.width, minWidth);
  const maxLeft = Math.max(EDGE_MARGIN, window.innerWidth - EDGE_MARGIN - width);
  const left = Math.min(Math.max(rect.left, EDGE_MARGIN), maxLeft);

  const fitsBelow = rect.bottom + ANCHOR_GAP + panel.offsetHeight <= window.innerHeight - EDGE_MARGIN;
  const top = fitsBelow
    ? rect.bottom + ANCHOR_GAP
    : Math.max(EDGE_MARGIN, rect.top - ANCHOR_GAP - panel.offsetHeight);

  panel.style.width = `${width}px`;
  panel.style.transform = `translate3d(${snapToDevicePixel(left)}px, ${snapToDevicePixel(top)}px, 0)`;
}

// Shared by both the preset and the calendar panel below — same anchor/flip
// technique as SearchSelect/MultiSelect's own position effects, just pulled
// into one hook since this component owns two independent trigger/panel
// pairs instead of one.
function useFloatingPanel(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  minWidth: number,
  sizeDep: unknown,
) {
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const reposition = () => positionPanel(trigger, panel, minWidth);
    reposition();
    window.addEventListener('resize', reposition);
    const onScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof Node && panel.contains(target)) return;
      reposition();
    };
    window.addEventListener('scroll', onScroll, true);

    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, minWidth, sizeDep]);
}

export type DateRangeValue =
  | { kind: 'relative'; relativeTimeString: string }
  | { kind: 'custom'; from: string; to: string };

export interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** Relative-time preset labels, e.g. "Last 12 months" — sent back verbatim
   * as `relativeTimeString` on select. Caller-supplied because lxn-ui has no
   * opinion on which presets a given filter should offer. */
  presets?: string[];
  customLabel?: string;
  /** Persistent field name shown inside the preset box, above its value —
   * the Bubble reference style, same as MultiSelect's own `label` prop. */
  label?: string;
  className?: string;
}

const DEFAULT_PRESETS = [
  'Today',
  'Yesterday',
  'This week',
  'Last week',
  'Last 7 days',
  'Last 30 days',
  'Last 60 days',
  'Last 90 days',
  'This month',
  'Last month',
  'This quarter',
  'Last quarter',
  'Last 3 months',
  'Last 6 months',
  'Last 12 months',
  'Last 24 months',
  'Last 36 months',
  'Last 60 months',
  'This year',
  'Last year',
];

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoOf(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function toIso(d: Date): string {
  return isoOf(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
function addDays(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
}
function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));
}
function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function endOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}
function startOfWeekMonday(d: Date): Date {
  const dow = (d.getUTCDay() + 6) % 7;
  return addDays(d, -dow);
}
function endOfWeekSunday(d: Date): Date {
  return addDays(startOfWeekMonday(d), 6);
}
function startOfQuarter(d: Date): Date {
  const m = Math.floor(d.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(d.getUTCFullYear(), m, 1));
}
function endOfQuarter(d: Date): Date {
  const m = Math.floor(d.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(d.getUTCFullYear(), m + 3, 0));
}
function startOfYear(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}
function endOfYear(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 11, 31));
}

/** Resolves lxn-ui's own default preset vocabulary — plus "Last N days/
 * months/years" generally — into an actual date range, so a caller doesn't
 * have to compute one just to have the calendar/date-display trigger show
 * real dates instead of the bare preset name. Matched case-insensitively;
 * a caller-supplied preset string this can't parse resolves to `null` (the
 * calendar then falls back to today's month with nothing highlighted).
 *
 * Semantics follow the same well-known convention as (e.g.) daterange-
 * picker.js's default ranges: "This X" is the FULL current period —
 * including its not-yet-elapsed days — "Last X" is the full PRIOR period,
 * and "Last N days/months/years" is a trailing window of that size ending
 * today (inclusive). */
export function resolveRelativeRange(relativeTimeString: string): { from: string; to: string } | null {
  const today = todayUTC();
  const key = relativeTimeString.trim().toLowerCase();
  const range = (from: Date, to: Date) => ({ from: toIso(from), to: toIso(to) });

  switch (key) {
    case 'today':
      return range(today, today);
    case 'yesterday': {
      const y = addDays(today, -1);
      return range(y, y);
    }
    case 'this week':
      return range(startOfWeekMonday(today), endOfWeekSunday(today));
    case 'last week': {
      const s = addDays(startOfWeekMonday(today), -7);
      return range(s, addDays(s, 6));
    }
    case 'this month':
      return range(startOfMonth(today), endOfMonth(today));
    case 'last month': {
      const s = startOfMonth(addMonths(today, -1));
      return range(s, endOfMonth(s));
    }
    case 'this quarter':
      return range(startOfQuarter(today), endOfQuarter(today));
    case 'last quarter': {
      const s = startOfQuarter(addMonths(today, -3));
      return range(s, endOfQuarter(s));
    }
    case 'this year':
      return range(startOfYear(today), endOfYear(today));
    case 'last year': {
      const s = startOfYear(addMonths(today, -12));
      return range(s, endOfYear(s));
    }
    default:
      break;
  }

  let m = key.match(/^last (\d+) days?$/);
  if (m) {
    const n = Number(m[1]);
    return range(addDays(today, -(n - 1)), today);
  }
  m = key.match(/^last (\d+) months?$/);
  if (m) {
    const n = Number(m[1]);
    return range(addMonths(today, -n), today);
  }
  m = key.match(/^last (\d+) years?$/);
  if (m) {
    const n = Number(m[1]);
    return range(addMonths(today, -n * 12), today);
  }

  return null;
}

function boundsOf(value: DateRangeValue): { from: string; to: string } | null {
  return value.kind === 'custom' ? { from: value.from, to: value.to } : resolveRelativeRange(value.relativeTimeString);
}

/** Same "own year hidden, other years shown" rule as `formatDateRangeLabel`
 * (below), factored out so the calendar trigger's own from/to inputs can
 * show each side's placeholder in that exact format — typing back what's
 * already displayed round-trips through `parseTypedDate` below. */
function formatBoundDate(iso: string): string {
  const currentYear = new Date().getUTCFullYear();
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  if (d.getUTCFullYear() !== currentYear) opts.year = 'numeric';
  return d.toLocaleDateString('en-US', opts);
}

/** Legacy chip-formatting rule (bubble-internal-comps-v4-summary.md "Visible
 * filter chips"), extended to resolve a relative preset into real dates
 * first: a custom range — or a relative preset `resolveRelativeRange` can
 * parse — shows each date without its year when that date falls in the
 * current UTC year, with the year included otherwise. An unresolvable
 * relative preset falls back to its own label verbatim, since there's
 * nothing else to show. */
export function formatDateRangeLabel(value: DateRangeValue): string {
  const bounds = boundsOf(value);
  if (!bounds) return value.kind === 'relative' ? value.relativeTimeString : '';
  return `${formatBoundDate(bounds.from)} – ${formatBoundDate(bounds.to)}`;
}

function monthOf(value: DateRangeValue): { year: number; month: number } {
  const bounds = boundsOf(value);
  const base = bounds ? new Date(bounds.to) : new Date();
  return { year: base.getUTCFullYear(), month: base.getUTCMonth() };
}

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

function monthIndexFromName(name: string): number | null {
  const key = name.toLowerCase().replace(/\.$/, '');
  if (key.length < 3) return null;
  const index = MONTH_NAMES.findIndex((m) => m.startsWith(key));
  return index === -1 ? null : index;
}

/** Builds an ISO date only if year/month/day round-trip through Date.UTC
 * unchanged — rejects a rolled-over date (e.g. Feb 30) rather than silently
 * normalizing it to Mar 2. */
function isoIfValid(year: number, month: number, day: number): string | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month || d.getUTCDate() !== day) return null;
  return isoOf(year, month, day);
}

/** Parses whatever a caller types into one of the calendar trigger's own
 * from/to inputs — deliberately NOT `new Date(string)`, whose "9/15/2026"
 * parses in the LOCAL timezone while "2026-09-15" parses as UTC, an
 * inconsistency that would silently shift the resulting day near a timezone
 * boundary (this whole component otherwise treats every date as a bare UTC
 * calendar day, never a timezone-aware instant). Accepts three shapes,
 * matched in order: ISO/slash "2026-09-15" or "2026/09/15"; US slash
 * "9/15/2026", "9/15/26" (two-digit year → 2000+yy), or "9/15" (year
 * omitted → `fallbackYear`); and the month-name form `formatBoundDate`
 * itself renders, "Sep 15" or "September 15, 2026" (year omitted →
 * `fallbackYear` too — the same "hide the current year" convention that
 * format uses). Returns `null` for anything else, including a
 * calendar-invalid date (Feb 30) — the caller then just leaves the field's
 * typed text uncommitted rather than guessing. */
function parseTypedDate(raw: string, fallbackYear: number): string | null {
  const text = raw.trim();
  if (!text) return null;

  let m = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return isoIfValid(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  m = text.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) {
    const month = Number(m[1]) - 1;
    const day = Number(m[2]);
    let year = fallbackYear;
    if (m[3]) {
      year = Number(m[3]);
      if (m[3].length === 2) year += 2000;
    }
    return isoIfValid(year, month, day);
  }

  m = text.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/);
  if (m) {
    const month = monthIndexFromName(m[1]!);
    if (month === null) return null;
    return isoIfValid(m[3] ? Number(m[3]) : fallbackYear, month, Number(m[2]));
  }

  return null;
}

interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
}

/** Monday-first month grid, sized to exactly this month's own weeks (no
 * padding out to a forced 6 rows) — matches the reference mockup, which
 * shows 5 rows for a 30-day month starting on a Tuesday. */
function buildMonthCells(year: number, month: number): DayCell[] {
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  const cells: DayCell[] = [];
  for (let i = firstWeekday; i > 0; i--) {
    const d = daysInPrevMonth - i + 1;
    cells.push({ iso: isoOf(prevYear, prevMonth, d), day: d, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: isoOf(year, month, d), day: d, inMonth: true });
  }
  let trailing = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ iso: isoOf(nextYear, nextMonth, trailing), day: trailing, inMonth: false });
    trailing++;
  }
  return cells;
}

/** Generic relative-preset-or-custom-range picker (lxn-ui, not app-specific)
 * — replaces Embeddable's own LexenDateRangePicker widget now that this data
 * is queried directly rather than through Embeddable's hosted components.
 *
 * Two independent triggers side by side, matching the Bubble reference:
 * a searchable preset combobox on the left (type to filter, or pick "Custom
 * range" to switch to manual dates) and a date-display trigger on the right
 * that expands into a calendar. Only one of the two panels is ever open —
 * they share a single `openPanel` state rather than two booleans.
 *
 * The calendar has no Apply/Cancel of its own: clicking a day always clears
 * whatever range was showing and starts a fresh anchor: the NEXT click
 * completes the range (swapping the two dates if picked out of order) and
 * commits it via onChange — the panel stays open so the range can keep being
 * adjusted; it closes only via outside click or Escape, same as the preset
 * panel. A relative preset is
 * resolved to real dates via `resolveRelativeRange` (same vocabulary as
 * DEFAULT_PRESETS, plus "Last N days/months/years" generally) so the
 * calendar can highlight it and the date-display trigger can show real
 * dates instead of the bare preset name — an unresolvable caller-supplied
 * preset string just shows today's month with nothing highlighted. */
export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  customLabel = 'Custom range',
  label,
  className,
}: DateRangePickerProps) {
  const [openPanel, setOpenPanel] = useState<'preset' | 'calendar' | null>(null);
  const [query, setQuery] = useState('');
  // Keyboard-navigated highlight into `filteredPresets`, independent of
  // aria-selected (the actual picked-or-not state) — same field, same
  // reasoning, as SingleSelect.tsx's own highlightedIndex. "Custom range" and
  // its divider sit outside this list (mouse/Enter-only, as before) rather
  // than being folded into arrow-key navigation.
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(0);
  const [monthCursor, setMonthCursor] = useState(() => monthOf(value));
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  // Raw typed text for the calendar trigger's own from/to inputs — mirrors
  // the preset input's `query`: the committed date sits in the input's own
  // `placeholder` (grey, same ::placeholder token) until a keystroke lands,
  // at which point this takes over as the real `value` and the placeholder
  // vanishes. Cleared whenever the calendar panel isn't open (see effect
  // below), same "don't leak a stale draft into the next open" reasoning as
  // the preset query.
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);
  const presetTriggerRef = useRef<HTMLDivElement>(null);
  const presetPanelRef = useRef<HTMLDivElement>(null);
  const presetInputRef = useRef<HTMLInputElement>(null);
  const presetOptionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const presetListboxId = useId();
  const presetOptionId = (index: number) => `${presetListboxId}-option-${index}`;
  // A div, not a button, now that it hosts two real <input>s side by side —
  // clicking either one focuses IT specifically (native browser behavior,
  // nothing to wire up), while this ref still anchors the floating panel and
  // still gates the outside-click/hover chrome as one shared area.
  const calendarTriggerRef = useRef<HTMLDivElement>(null);
  const calendarPanelRef = useRef<HTMLDivElement>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  // Which of the two inputs is "active" for refocus purposes — updated
  // on-focus of either one, read by the two guards below. Not React state:
  // it drives no render, only which ref a focus-correction call reaches for.
  const activeCalendarFieldRef = useRef<'from' | 'to'>('from');

  useEffect(() => {
    if (!openPanel) return;
    function onDocPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (presetTriggerRef.current?.contains(target)) return;
      if (presetPanelRef.current?.contains(target)) return;
      if (calendarTriggerRef.current?.contains(target)) return;
      if (calendarPanelRef.current?.contains(target)) return;
      setOpenPanel(null);
    }
    function onDocKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setOpenPanel(null);
    }
    document.addEventListener('mousedown', onDocPointerDown);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, [openPanel]);

  // Hard guarantee, not just a best-effort — same fix as MultiSelect.tsx's
  // own onFocusIn correction for the identical "clicking an option/day
  // steals focus off the input" issue. The day/nav buttons' own onMouseDown
  // preventDefault below stops the browser from shifting focus to them on a
  // normal click, but real browsers don't all sequence mousedown/focus/click
  // identically, so that alone still dropped the caret intermittently.
  // This reactively corrects any drift instead: whenever focus lands
  // anywhere else inside the calendar trigger or its panel while the
  // calendar is open, it's yanked straight back to whichever of the two
  // inputs was last active, on the same tick — so the caret keeps flashing
  // there until the panel actually closes.
  useEffect(() => {
    if (openPanel !== 'calendar') return;
    function onFocusIn(e: FocusEvent) {
      const target = e.target as Node;
      if (target === fromInputRef.current || target === toInputRef.current) return;
      if (calendarTriggerRef.current?.contains(target) || calendarPanelRef.current?.contains(target)) {
        (activeCalendarFieldRef.current === 'from' ? fromInputRef : toInputRef).current?.focus();
      }
    }
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [openPanel]);

  useEffect(() => {
    if (openPanel !== 'preset') return;
    setQuery('');
    setHighlightedIndex(0);
    const raf = requestAnimationFrame(() => presetInputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [openPanel]);

  useEffect(() => {
    if (openPanel !== 'preset' || highlightedIndex === null) return;
    // jsdom (unit tests) doesn't implement scrollIntoView at all.
    presetOptionRefs.current[highlightedIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [openPanel, highlightedIndex]);

  // Re-anchors to the live value's own month every time the calendar opens,
  // and always starts a fresh (no pending anchor) selection — same "reset an
  // abandoned draft" reasoning as the old Apply-button version, just for the
  // click-a-day flow instead of the from/to inputs. Deliberately keyed only
  // on `openPanel`, not `value`, so it doesn't jump around mid-selection.
  useEffect(() => {
    if (openPanel !== 'calendar') return;
    setMonthCursor(monthOf(value));
    setPendingStart(null);
    setHoverDate(null);
    setFromText('');
    setToText('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPanel]);

  // Clears any draft typed into the from/to inputs the instant the calendar
  // panel closes (outside click, Escape, or switching to the preset panel) —
  // same reasoning as the preset query being cleared on close, just for a
  // pair of fields instead of one.
  useEffect(() => {
    if (openPanel === 'calendar') return;
    setFromText('');
    setToText('');
  }, [openPanel]);

  const q = query.trim().toLowerCase();
  const filteredPresets = q ? presets.filter((p) => p.toLowerCase().includes(q)) : presets;

  useFloatingPanel(openPanel === 'preset', presetTriggerRef, presetPanelRef, PRESET_MIN_PANEL_WIDTH, filteredPresets.length);
  useFloatingPanel(openPanel === 'calendar', calendarTriggerRef, calendarPanelRef, CALENDAR_MIN_PANEL_WIDTH, monthCursor);

  function togglePreset() {
    setOpenPanel((p) => (p === 'preset' ? null : 'preset'));
  }

  // Focusing either from/to input opens the calendar — never a toggle,
  // unlike the preset trigger's click: tabbing/clicking from one input to
  // the other re-fires this while the panel's already open, and that must
  // stay open, not flip closed. Also records which of the two is now
  // "active", so the focus-guard effect above (and handleDayClick's own
  // explicit refocus) know which input to return the caret to.
  function handleDateInputFocus(field: 'from' | 'to') {
    activeCalendarFieldRef.current = field;
    setOpenPanel('calendar');
  }

  function refocusActiveCalendarInput() {
    (activeCalendarFieldRef.current === 'from' ? fromInputRef : toInputRef).current?.focus();
  }

  // Widens the from/to inputs' own hitbox out to the WHOLE trigger — the
  // icon, the dash, and all the padding/gaps around them. A click landing
  // directly on one of the two inputs is left alone (the browser's own
  // click-to-focus, plus that input's onFocus above, already handles it);
  // anywhere else in the container focuses whichever input's HALF of the
  // trigger's own width was clicked, left for From and right for To — same
  // "decide which side based on where you clicked" split as the visible
  // From/To layout itself.
  function handleCalendarTriggerClick(e: ReactMouseEvent<HTMLDivElement>) {
    const target = e.target as Node;
    if (fromInputRef.current === target || toInputRef.current === target) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nearer = e.clientX - rect.left < rect.width / 2 ? fromInputRef : toInputRef;
    nearer.current?.focus();
  }

  function selectPreset(relativeTimeString: string) {
    onChange({ kind: 'relative', relativeTimeString });
    setOpenPanel(null);
  }

  function selectCustomEntry() {
    setOpenPanel('calendar');
  }

  // Commits a single typed, successfully-parsed side of the range, holding
  // the OTHER side at whatever's currently committed (or, with nothing
  // committed yet, collapsing to a single day) — then re-sorts from/to the
  // same way handleDayClick does, so a "to" typed earlier than the standing
  // "from" doesn't produce an inverted range. Also snaps monthCursor to the
  // typed date immediately, rather than waiting on the value round-trip back
  // through props, so the calendar visibly follows what's being typed.
  function commitTypedDate(field: 'from' | 'to', iso: string) {
    const bounds = boundsOf(value) ?? { from: iso, to: iso };
    let from = field === 'from' ? iso : bounds.from;
    let to = field === 'to' ? iso : bounds.to;
    if (from > to) {
      [from, to] = [to, from];
    }
    onChange({ kind: 'custom', from, to });
    setMonthCursor({ year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 });
    setPendingStart(null);
    setHoverDate(null);
  }

  const typedDateFallbackYear = todayUTC().getUTCFullYear();

  function handleFromInputChange(text: string) {
    setFromText(text);
    const iso = parseTypedDate(text, typedDateFallbackYear);
    if (iso) commitTypedDate('from', iso);
  }

  function handleToInputChange(text: string) {
    setToText(text);
    const iso = parseTypedDate(text, typedDateFallbackYear);
    if (iso) commitTypedDate('to', iso);
  }

  function handlePresetQueryChange(q: string) {
    setQuery(q);
    // Reset to the top result on every keystroke, same reasoning (and same
    // deliberate non-dependence on `filteredPresets` itself) as SingleSelect.
    setHighlightedIndex(0);
  }

  function handlePresetTriggerKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (openPanel !== 'preset' && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setOpenPanel('preset');
    }
  }

  function handlePresetInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i === null ? 0 : Math.min(i + 1, filteredPresets.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i === null ? 0 : Math.max(i - 1, 0)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = highlightedIndex !== null ? filteredPresets[highlightedIndex] : filteredPresets[0];
      if (picked) selectPreset(picked);
    }
  }

  function shiftMonth(delta: number) {
    setMonthCursor(({ year, month }) => {
      const total = year * 12 + month + delta;
      const nextYear = Math.floor(total / 12);
      const nextMonth = ((total % 12) + 12) % 12;
      return { year: nextYear, month: nextMonth };
    });
    // Same "never blur the input" guarantee as handleDayClick — the nav
    // button's own onMouseDown preventDefault is the primary fix below.
    refocusActiveCalendarInput();
  }

  function handleDayClick(iso: string) {
    if (pendingStart === null) {
      setPendingStart(iso);
      setHoverDate(null);
      // Clicking a day must never blur the from/to input — the caret should
      // keep flashing there until the panel actually closes. The day
      // button's own onMouseDown preventDefault already stops the browser
      // from shifting focus to it in the first place; this is the
      // guaranteed fallback, same reasoning as MultiSelect.tsx's toggleOption.
      refocusActiveCalendarInput();
      return;
    }
    const from = pendingStart <= iso ? pendingStart : iso;
    const to = pendingStart <= iso ? iso : pendingStart;
    onChange({ kind: 'custom', from, to });
    setPendingStart(null);
    setHoverDate(null);
    refocusActiveCalendarInput();
  }

  const committedRange = boundsOf(value);
  let activeFrom: string | null = null;
  let activeTo: string | null = null;
  if (pendingStart !== null) {
    if (hoverDate !== null) {
      activeFrom = pendingStart <= hoverDate ? pendingStart : hoverDate;
      activeTo = pendingStart <= hoverDate ? hoverDate : pendingStart;
    } else {
      activeFrom = pendingStart;
      activeTo = pendingStart;
    }
  } else if (committedRange) {
    activeFrom = committedRange.from;
    activeTo = committedRange.to;
  }

  const cells = buildMonthCells(monthCursor.year, monthCursor.month);
  const monthLabel = new Date(Date.UTC(monthCursor.year, monthCursor.month, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const todayIso = new Date().toISOString().slice(0, 10);

  const currentPresetLabel = value.kind === 'relative' ? value.relativeTimeString : customLabel;
  const isCustomActive = value.kind === 'custom';

  // Points the combobox at whichever row the arrow keys currently have
  // highlighted, so AT/screen-reader users get told which option Enter will
  // act on next — undefined (omitted) once closed or with no matches. Same
  // pattern as SingleSelect.tsx's own activeDescendant.
  const presetActiveDescendant =
    openPanel === 'preset' && highlightedIndex !== null && filteredPresets[highlightedIndex]
      ? presetOptionId(highlightedIndex)
      : undefined;

  // Same committed-value-as-placeholder pattern as the preset input/
  // SingleSelect: grey, in-place text that reads as the current value and
  // vanishes on the first keystroke. Falls back to a bare "From"/"To" hint
  // when there's nothing committed to show (an unresolvable relative preset).
  const fromPlaceholder = committedRange ? formatBoundDate(committedRange.from) : 'From';
  const toPlaceholder = committedRange ? formatBoundDate(committedRange.to) : 'To';

  const portalTarget = openPanel ? (rootRef.current?.closest('dialog') ?? document.body) : null;

  return (
    <div ref={rootRef} className={['lxn-date-range', className].filter(Boolean).join(' ')} onClick={(e) => e.stopPropagation()}>
      <div className="lxn-date-range-row">
        <div
          ref={presetTriggerRef}
          className={['lxn-date-range-preset-trigger', label ? 'lxn-date-range-preset-trigger--labeled' : '']
            .filter(Boolean)
            .join(' ')}
          role="combobox"
          tabIndex={0}
          onClick={togglePreset}
          onKeyDown={handlePresetTriggerKeyDown}
          aria-haspopup="listbox"
          aria-expanded={openPanel === 'preset'}
          aria-controls={presetListboxId}
          aria-activedescendant={presetActiveDescendant}
        >
          {label && <span className="lxn-label lxn-date-range-field-label">{label}</span>}
          {openPanel === 'preset' ? (
            <input
              ref={presetInputRef}
              type="text"
              className="lxn-l1 lxn-date-range-preset-input"
              value={query}
              placeholder={currentPresetLabel}
              onChange={(e) => handlePresetQueryChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handlePresetInputKeyDown}
            />
          ) : (
            <span className="lxn-l1 lxn-date-range-preset-value">{currentPresetLabel}</span>
          )}
          <ChevronDownIcon size={label ? 16 : 14} className="lxn-date-range-chevron" />
        </div>

        <div
          ref={calendarTriggerRef}
          className="lxn-date-range-calendar-trigger"
          role="group"
          aria-label="Date range"
          aria-haspopup="dialog"
          aria-expanded={openPanel === 'calendar'}
          onClick={handleCalendarTriggerClick}
        >
          <CalendarIcon size={16} className="lxn-date-range-calendar-icon" />
          <input
            ref={fromInputRef}
            type="text"
            className="lxn-l1 lxn-date-range-calendar-input"
            value={fromText}
            placeholder={fromPlaceholder}
            aria-label="From date"
            onFocus={() => handleDateInputFocus('from')}
            onChange={(e) => handleFromInputChange(e.target.value)}
          />
          <span className="lxn-l1 lxn-date-range-calendar-dash" aria-hidden="true">
            –
          </span>
          <input
            ref={toInputRef}
            type="text"
            className="lxn-l1 lxn-date-range-calendar-input"
            value={toText}
            placeholder={toPlaceholder}
            aria-label="To date"
            onFocus={() => handleDateInputFocus('to')}
            onChange={(e) => handleToInputChange(e.target.value)}
          />
        </div>
      </div>

      {/* Both portals below render into document.body (see portalTarget),
          outside .lxn-root's own subtree — .lxn-root's font-family doesn't
          reach them via inheritance, so every text node in here needs its
          own explicit .lxn-l1/.lxn-l4 class (same as MultiSelect/SearchSelect's
          own panels) or it silently falls back to the browser's default
          serif font. A bare, class-less <span> here was exactly that bug. */}
      {openPanel === 'preset' &&
        portalTarget &&
        createPortal(
          <div ref={presetPanelRef} className="lxn-date-range-preset-panel">
            <div id={presetListboxId} className="lxn-date-range-preset-list" role="listbox">
              <div
                role="option"
                aria-selected={isCustomActive}
                className="lxn-date-range-preset-option"
                onClick={selectCustomEntry}
                onMouseEnter={() => setHighlightedIndex(null)}
              >
                <span className="lxn-date-range-preset-check">{isCustomActive && <CheckIcon size={13} />}</span>
                <span className="lxn-l1">{customLabel}</span>
              </div>
              <div className="lxn-date-range-preset-divider" />
              {filteredPresets.length === 0 ? (
                <div className="lxn-l4 lxn-date-range-preset-empty">No matches</div>
              ) : (
                filteredPresets.map((p, index) => {
                  const isSelected = value.kind === 'relative' && value.relativeTimeString === p;
                  const isHighlighted = highlightedIndex !== null && index === highlightedIndex;
                  return (
                    <div
                      key={p}
                      ref={(el) => {
                        presetOptionRefs.current[index] = el;
                      }}
                      id={presetOptionId(index)}
                      role="option"
                      aria-selected={isSelected}
                      className={['lxn-date-range-preset-option', isHighlighted ? 'is-highlighted' : ''].filter(Boolean).join(' ')}
                      onClick={() => selectPreset(p)}
                      onMouseEnter={() => setHighlightedIndex(null)}
                    >
                      <span className="lxn-date-range-preset-check">{isSelected && <CheckIcon size={13} />}</span>
                      <span className="lxn-l1">{p}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          portalTarget,
        )}

      {openPanel === 'calendar' &&
        portalTarget &&
        createPortal(
          <div ref={calendarPanelRef} className="lxn-date-range-calendar-panel" role="dialog" aria-label="Choose date range">
            <div className="lxn-date-range-calendar-inner">
              <div className="lxn-date-range-calendar-header">
                <button
                  type="button"
                  className="lxn-date-range-calendar-nav"
                  aria-label="Previous month"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => shiftMonth(-1)}
                >
                  <BackArrowIcon size={16} />
                </button>
                <span className="lxn-l1">{monthLabel}</span>
                <button
                  type="button"
                  className="lxn-date-range-calendar-nav"
                  aria-label="Next month"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => shiftMonth(1)}
                >
                  <BackArrowIcon size={16} className="lxn-date-range-calendar-nav-icon--next" />
                </button>
              </div>
              <div className="lxn-date-range-calendar-weekdays">
                {WEEKDAYS.map((d) => (
                  <span key={d} className="lxn-l4">
                    {d}
                  </span>
                ))}
              </div>
              <div className="lxn-date-range-calendar-grid" onMouseLeave={() => pendingStart !== null && setHoverDate(null)}>
                {cells.map((cell) => {
                  const isStart = activeFrom !== null && cell.iso === activeFrom;
                  const isEnd = activeTo !== null && cell.iso === activeTo;
                  const inRange = activeFrom !== null && activeTo !== null && cell.iso >= activeFrom && cell.iso <= activeTo;
                  const isToday = cell.iso === todayIso;
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      data-date={cell.iso}
                      className={[
                        'lxn-l1',
                        'lxn-date-range-calendar-day',
                        !cell.inMonth ? 'is-muted' : '',
                        inRange ? 'is-in-range' : '',
                        isStart ? 'is-range-start' : '',
                        isEnd ? 'is-range-end' : '',
                        isToday ? 'is-today' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleDayClick(cell.iso)}
                      onMouseEnter={() => pendingStart !== null && setHoverDate(cell.iso)}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          portalTarget,
        )}
    </div>
  );
}
