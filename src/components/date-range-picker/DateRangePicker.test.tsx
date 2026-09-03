import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { DateRangePicker, formatDateRangeLabel, resolveRelativeRange } from './DateRangePicker';

afterEach(() => cleanup());

describe('resolveRelativeRange', () => {
  // A fixed, known Tuesday — every expected value below is hand-derived
  // against this exact date, not re-derived from the implementation, so
  // these tests actually catch off-by-one/week-boundary bugs rather than
  // just mirroring the code under test.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('resolves the fixed single-day/period presets', () => {
    expect(resolveRelativeRange('Today')).toEqual({ from: '2026-09-15', to: '2026-09-15' });
    expect(resolveRelativeRange('Yesterday')).toEqual({ from: '2026-09-14', to: '2026-09-14' });
    expect(resolveRelativeRange('This week')).toEqual({ from: '2026-09-14', to: '2026-09-20' });
    expect(resolveRelativeRange('Last week')).toEqual({ from: '2026-09-07', to: '2026-09-13' });
    expect(resolveRelativeRange('This month')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(resolveRelativeRange('Last month')).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(resolveRelativeRange('This quarter')).toEqual({ from: '2026-07-01', to: '2026-09-30' });
    expect(resolveRelativeRange('Last quarter')).toEqual({ from: '2026-04-01', to: '2026-06-30' });
    expect(resolveRelativeRange('This year')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(resolveRelativeRange('Last year')).toEqual({ from: '2025-01-01', to: '2025-12-31' });
  });

  it('resolves trailing "Last N days/months/years" windows ending today', () => {
    expect(resolveRelativeRange('Last 7 days')).toEqual({ from: '2026-09-09', to: '2026-09-15' });
    expect(resolveRelativeRange('Last 30 days')).toEqual({ from: '2026-08-17', to: '2026-09-15' });
    expect(resolveRelativeRange('Last 3 months')).toEqual({ from: '2026-06-15', to: '2026-09-15' });
    // Not one of the named defaults — the generic "Last N days" pattern
    // must still cover an arbitrary caller-supplied N.
    expect(resolveRelativeRange('Last 45 days')).toEqual({ from: '2026-08-02', to: '2026-09-15' });
    expect(resolveRelativeRange('Last 2 years')).toEqual({ from: '2024-09-15', to: '2026-09-15' });
  });

  it('matches case-insensitively and trims surrounding whitespace', () => {
    expect(resolveRelativeRange('  TODAY  ')).toEqual({ from: '2026-09-15', to: '2026-09-15' });
    expect(resolveRelativeRange('last 7 DAYS')).toEqual({ from: '2026-09-09', to: '2026-09-15' });
  });

  it('returns null for a preset string it cannot parse', () => {
    expect(resolveRelativeRange('Fiscal Q3 2026')).toBeNull();
  });
});

describe('formatDateRangeLabel', () => {
  it('falls back to the bare preset name when it cannot be resolved to real dates', () => {
    expect(formatDateRangeLabel({ kind: 'relative', relativeTimeString: 'Fiscal Q3 2026' })).toBe('Fiscal Q3 2026');
  });

  it('resolves a known relative preset into a real, formatted date range instead of its own name', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
    expect(formatDateRangeLabel({ kind: 'relative', relativeTimeString: 'Today' })).toBe('Sep 15 – Sep 15');
    expect(formatDateRangeLabel({ kind: 'relative', relativeTimeString: 'This week' })).toBe('Sep 14 – Sep 20');
    // Spans a different UTC year than "now" — both ends get their year.
    expect(formatDateRangeLabel({ kind: 'relative', relativeTimeString: 'Last year' })).toBe('Jan 1, 2025 – Dec 31, 2025');
    vi.useRealTimers();
  });

  it('omits the year for a custom range inside the current UTC year', () => {
    const year = new Date().getUTCFullYear();
    const label = formatDateRangeLabel({ kind: 'custom', from: `${year}-01-15`, to: `${year}-03-20` });
    expect(label).not.toContain(String(year));
    expect(label).toBe('Jan 15 – Mar 20');
  });

  it('includes the year for a custom range outside the current UTC year', () => {
    const label = formatDateRangeLabel({ kind: 'custom', from: '2024-01-15', to: '2024-03-20' });
    expect(label).toBe('Jan 15, 2024 – Mar 20, 2024');
  });
});

// Before any panel is open the calendar trigger's own from/to inputs are
// the only textboxes in the tree (the preset trigger is a role="combobox"
// div that only grows an <input> once opened) — focusing either one, same
// as a real click would, opens the calendar exactly like the old single
// <button> trigger used to.
function openCalendar() {
  fireEvent.focus(screen.getByRole('textbox', { name: 'From date' }));
  return screen.getByRole('dialog');
}

describe('<DateRangePicker>', () => {
  it('the preset box shows the bare preset name; the calendar trigger\'s from/to inputs show real dates as their placeholders instead', () => {
    render(<DateRangePicker value={{ kind: 'relative', relativeTimeString: 'Last month' }} onChange={vi.fn()} />);
    const expectedDateLabel = formatDateRangeLabel({ kind: 'relative', relativeTimeString: 'Last month' });
    expect(expectedDateLabel).not.toBe('Last month');
    const [fromPlaceholder, toPlaceholder] = expectedDateLabel.split(' – ');

    expect(screen.getByText('Last month')).toBeTruthy();
    expect(screen.getByPlaceholderText(fromPlaceholder!)).toBeTruthy();
    expect(screen.getByPlaceholderText(toPlaceholder!)).toBeTruthy();
  });

  it('an unresolvable preset falls back to generic From/To placeholders on the calendar trigger, keeping its own name on the preset box', () => {
    render(
      <DateRangePicker
        value={{ kind: 'relative', relativeTimeString: 'Fiscal Q3 2026' }}
        onChange={vi.fn()}
        presets={['Fiscal Q3 2026']}
      />,
    );
    expect(screen.getAllByText('Fiscal Q3 2026')).toHaveLength(1);
    expect(screen.getByPlaceholderText('From')).toBeTruthy();
    expect(screen.getByPlaceholderText('To')).toBeTruthy();
  });

  it('preset panel rows carry an explicit typography class (regression: a bare <span> rendered in the browser\'s default serif font once portaled outside .lxn-root)', () => {
    render(<DateRangePicker value={{ kind: 'relative', relativeTimeString: 'Last 60 months' }} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('Today').className).toContain('lxn-l1');
    expect(screen.getByText('Custom range').className).toContain('lxn-l1');
  });

  it('opening the preset box lists every preset plus a Custom range option', () => {
    render(<DateRangePicker value={{ kind: 'relative', relativeTimeString: 'Last 60 months' }} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Last 30 days')).toBeTruthy();
    expect(screen.getByText('Custom range')).toBeTruthy();
  });

  it('typing filters the preset list (case-insensitive substring), but Custom range always stays pinned', () => {
    render(<DateRangePicker value={{ kind: 'relative', relativeTimeString: 'Last 60 months' }} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('combobox').querySelector('input')!, { target: { value: 'QUARTER' } });

    expect(screen.getByText('This quarter')).toBeTruthy();
    expect(screen.getByText('Last quarter')).toBeTruthy();
    expect(screen.queryByText('Today')).toBeFalsy();
    expect(screen.getByText('Custom range')).toBeTruthy();
  });

  it('an unmatched query shows "No matches" instead of the preset list', () => {
    render(<DateRangePicker value={{ kind: 'relative', relativeTimeString: 'Last 60 months' }} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('combobox').querySelector('input')!, { target: { value: 'zzz' } });

    expect(screen.getByText('No matches')).toBeTruthy();
    expect(screen.getByText('Custom range')).toBeTruthy();
  });

  it('clicking a preset calls onChange with a relative value and closes the panel', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ kind: 'relative', relativeTimeString: 'Last 60 months' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));

    fireEvent.click(screen.getByText('Last 12 months'));
    expect(onChange).toHaveBeenCalledWith({ kind: 'relative', relativeTimeString: 'Last 12 months' });
    expect(screen.queryByText('Today')).toBeFalsy();
  });

  it('ArrowDown/ArrowUp move the highlight (aria-activedescendant) through the filtered preset list, clamped at both ends', () => {
    render(
      <DateRangePicker
        value={{ kind: 'relative', relativeTimeString: 'This quarter' }}
        onChange={vi.fn()}
        presets={['This week', 'This quarter']}
      />,
    );
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('combobox').querySelector('input')!;
    const [thisWeek, thisQuarter] = ['This week', 'This quarter'].map((label) => screen.getByRole('option', { name: label }));

    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(thisWeek!.id);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(thisQuarter!.id);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(thisQuarter!.id);

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(thisWeek!.id);
  });

  it('typing narrows to a single match and keeps it highlighted (typeahead-to-highlight)', () => {
    render(
      <DateRangePicker
        value={{ kind: 'relative', relativeTimeString: 'This quarter' }}
        onChange={vi.fn()}
        presets={['This week', 'This quarter']}
      />,
    );
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('combobox').querySelector('input')!, { target: { value: 'week' } });

    const onlyMatch = screen.getByRole('option', { name: 'This week' });
    expect(onlyMatch.className).toContain('is-highlighted');
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(onlyMatch.id);
  });

  it('Enter picks whichever preset is currently highlighted, calls onChange, and closes', () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        value={{ kind: 'relative', relativeTimeString: 'This quarter' }}
        onChange={onChange}
        presets={['This week', 'This quarter']}
      />,
    );
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('combobox').querySelector('input')!;

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith({ kind: 'relative', relativeTimeString: 'This quarter' });
    expect(screen.queryByRole('listbox')).toBeFalsy();
  });

  it('a custom presets list overrides the defaults entirely', () => {
    render(
      <DateRangePicker
        value={{ kind: 'relative', relativeTimeString: 'This quarter' }}
        onChange={vi.fn()}
        presets={['This week', 'This quarter']}
      />,
    );
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.queryByText('Today')).toBeFalsy();
  });

  it('clicking Custom range opens the calendar instead of changing the value', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ kind: 'relative', relativeTimeString: 'Last 60 months' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Custom range'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Choose date range' })).toBeTruthy();
  });

  it("the calendar opens to the month of a custom value's `to` date, highlighting the committed range", () => {
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={vi.fn()} />);
    const dialog = openCalendar();

    expect(within(dialog).getByText('September 2026')).toBeTruthy();
    const startDay = dialog.querySelector('[data-date="2026-09-01"]') as HTMLElement;
    const midDay = dialog.querySelector('[data-date="2026-09-05"]') as HTMLElement;
    const endDay = dialog.querySelector('[data-date="2026-09-11"]') as HTMLElement;
    expect(startDay.className).toContain('is-range-start');
    expect(midDay.className).toContain('is-in-range');
    expect(midDay.className).not.toContain('is-range-start');
    expect(endDay.className).toContain('is-range-end');
  });

  it('opening the calendar for a resolvable relative value highlights its computed range and navigates to its month', () => {
    const resolved = resolveRelativeRange('Last month')!;
    render(<DateRangePicker value={{ kind: 'relative', relativeTimeString: 'Last month' }} onChange={vi.fn()} />);
    const dialog = openCalendar();

    const expectedMonth = new Date(`${resolved.to}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    expect(within(dialog).getByText(expectedMonth)).toBeTruthy();
    expect((dialog.querySelector(`[data-date="${resolved.from}"]`) as HTMLElement).className).toContain('is-range-start');
    expect((dialog.querySelector(`[data-date="${resolved.to}"]`) as HTMLElement).className).toContain('is-range-end');
  });

  it('opening the calendar for an unresolvable relative value shows the current month with nothing highlighted', () => {
    render(
      <DateRangePicker
        value={{ kind: 'relative', relativeTimeString: 'Fiscal Q3 2026' }}
        onChange={vi.fn()}
        presets={['Fiscal Q3 2026']}
      />,
    );
    const dialog = openCalendar();

    const anyHighlighted = within(dialog)
      .getAllByRole('button')
      .some((el) => el.className.includes('is-range-start') || el.className.includes('is-in-range'));
    expect(anyHighlighted).toBe(false);
  });

  it('first click sets a pending anchor without calling onChange; second click commits the range and keeps the panel open', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={onChange} />);
    const dialog = openCalendar();

    fireEvent.click(dialog.querySelector('[data-date="2026-09-05"]')!);
    expect(onChange).not.toHaveBeenCalled();
    expect((dialog.querySelector('[data-date="2026-09-05"]') as HTMLElement).className).toContain('is-range-start');

    fireEvent.click(dialog.querySelector('[data-date="2026-09-08"]')!);
    expect(onChange).toHaveBeenCalledWith({ kind: 'custom', from: '2026-09-05', to: '2026-09-08' });
    expect(screen.queryByRole('dialog')).toBeTruthy();
  });

  it('clicking two days out of order swaps from/to so from is always earliest', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={onChange} />);
    const dialog = openCalendar();

    fireEvent.click(dialog.querySelector('[data-date="2026-09-20"]')!);
    fireEvent.click(dialog.querySelector('[data-date="2026-09-05"]')!);
    expect(onChange).toHaveBeenCalledWith({ kind: 'custom', from: '2026-09-05', to: '2026-09-20' });
  });

  it('a fresh click after a completed range always restarts the selection rather than extending it', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={onChange} />);
    const dialog = openCalendar();

    // Clicking a day while the committed 1–11 range is showing must clear it
    // and start a brand new anchor, not extend the existing range.
    fireEvent.click(dialog.querySelector('[data-date="2026-09-20"]')!);
    expect(onChange).not.toHaveBeenCalled();
    expect((dialog.querySelector('[data-date="2026-09-01"]') as HTMLElement).className).not.toContain('is-range-start');
    expect((dialog.querySelector('[data-date="2026-09-20"]') as HTMLElement).className).toContain('is-range-start');
  });

  it('reopening the calendar resets any pending anchor back to the committed value', () => {
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={vi.fn()} />);
    let dialog = openCalendar();
    fireEvent.click(dialog.querySelector('[data-date="2026-09-05"]')!);

    fireEvent.keyDown(document, { key: 'Escape' });
    dialog = openCalendar();

    expect((dialog.querySelector('[data-date="2026-09-01"]') as HTMLElement).className).toContain('is-range-start');
    expect((dialog.querySelector('[data-date="2026-09-05"]') as HTMLElement).className).not.toContain('is-range-start');
  });

  it('a single-day range gets full rounding on all corners, but a multi-day range only rounds the outward-facing side of each endpoint', () => {
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={vi.fn()} />);
    const dialog = openCalendar();

    // Multi-day committed range: start rounds only its left side (its right
    // side is flush against the connecting band), end rounds only its right.
    const startDay = dialog.querySelector('[data-date="2026-09-01"]') as HTMLElement;
    const endDay = dialog.querySelector('[data-date="2026-09-11"]') as HTMLElement;
    expect(startDay.className).toContain('is-range-start');
    expect(startDay.className).not.toContain('is-range-end');
    expect(endDay.className).toContain('is-range-end');
    expect(endDay.className).not.toContain('is-range-start');

    // A fresh single-day anchor (first click, before a second click extends
    // it) is both the start and the end of its own one-day range.
    fireEvent.click(dialog.querySelector('[data-date="2026-09-20"]')!);
    const anchorDay = dialog.querySelector('[data-date="2026-09-20"]') as HTMLElement;
    expect(anchorDay.className).toContain('is-range-start');
    expect(anchorDay.className).toContain('is-range-end');
  });

  it('previous/next navigate the displayed month without touching the value', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={onChange} />);
    const dialog = openCalendar();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Next month' }));
    expect(within(dialog).getByText('October 2026')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Previous month' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Previous month' }));
    expect(within(dialog).getByText('August 2026')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('typing a valid date into the To input commits a custom range, keeping the current From date, and navigates the calendar to it', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={onChange} />);
    const dialog = openCalendar();
    const toInput = screen.getByRole('textbox', { name: 'To date' });

    fireEvent.change(toInput, { target: { value: '2026-10-05' } });
    expect(onChange).toHaveBeenCalledWith({ kind: 'custom', from: '2026-09-01', to: '2026-10-05' });
    expect(within(dialog).getByText('October 2026')).toBeTruthy();
  });

  it('typing a From date later than the committed To date swaps them so from stays earliest', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={onChange} />);
    openCalendar();
    const fromInput = screen.getByRole('textbox', { name: 'From date' });

    fireEvent.change(fromInput, { target: { value: '2026-09-20' } });
    expect(onChange).toHaveBeenCalledWith({ kind: 'custom', from: '2026-09-11', to: '2026-09-20' });
  });

  it('accepts common typed date formats — ISO, US slash, and month-name', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-01-01', to: '2026-12-31' }} onChange={onChange} />);
    openCalendar();
    const fromInput = screen.getByRole('textbox', { name: 'From date' });

    fireEvent.change(fromInput, { target: { value: '9/15/2026' } });
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'custom', from: '2026-09-15', to: '2026-12-31' });

    fireEvent.change(fromInput, { target: { value: 'Sep 20, 2026' } });
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'custom', from: '2026-09-20', to: '2026-12-31' });
  });

  it('an unparseable or calendar-invalid (e.g. Feb 30) typed date never calls onChange', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={onChange} />);
    openCalendar();
    const fromInput = screen.getByRole('textbox', { name: 'From date' });

    fireEvent.change(fromInput, { target: { value: 'Sep' } });
    fireEvent.change(fromInput, { target: { value: 'Feb 30, 2026' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('the from/to inputs show the committed dates as grey placeholders until typing begins, clearing any draft when the panel closes and reopens', () => {
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={vi.fn()} />);
    openCalendar();
    const fromInput = screen.getByRole('textbox', { name: 'From date' }) as HTMLInputElement;
    expect(fromInput.placeholder).toContain('Sep 1');
    expect(fromInput.value).toBe('');

    fireEvent.change(fromInput, { target: { value: 'Sep 3, 2026' } });
    expect(fromInput.value).toBe('Sep 3, 2026');

    fireEvent.keyDown(document, { key: 'Escape' });
    openCalendar();
    expect((screen.getByRole('textbox', { name: 'From date' }) as HTMLInputElement).value).toBe('');
  });

  it('focusing either the From or To input opens the calendar', () => {
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeFalsy();

    fireEvent.focus(screen.getByRole('textbox', { name: 'To date' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('clicking a calendar day never blurs the active from/to input — the caret keeps flashing there (same issue as MultiSelect)', () => {
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={vi.fn()} />);
    const dialog = openCalendar();
    const fromInput = screen.getByRole('textbox', { name: 'From date' });
    // fireEvent.focus (inside openCalendar) fires the synthetic event that
    // opens the panel but, unlike a real browser, doesn't move
    // document.activeElement itself — a real `.focus()` call does.
    fromInput.focus();
    expect(document.activeElement).toBe(fromInput);

    fireEvent.click(dialog.querySelector('[data-date="2026-09-05"]')!);
    expect(document.activeElement).toBe(fromInput);

    fireEvent.click(dialog.querySelector('[data-date="2026-09-08"]')!);
    expect(document.activeElement).toBe(fromInput);
  });

  it('when the To input is the active field, clicking a day (or a nav button) keeps focus there instead of jumping to From', () => {
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={vi.fn()} />);
    const toInput = screen.getByRole('textbox', { name: 'To date' });
    fireEvent.focus(toInput);
    const dialog = screen.getByRole('dialog');
    toInput.focus();

    fireEvent.click(dialog.querySelector('[data-date="2026-09-05"]')!);
    expect(document.activeElement).toBe(toInput);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Next month' }));
    expect(document.activeElement).toBe(toInput);
  });

  it('regression: focus forced directly onto a day cell (simulating a browser mousedown/focus quirk not caught by preventDefault) is yanked back to the active input by the focusin guard', () => {
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={vi.fn()} />);
    const dialog = openCalendar();
    const fromInput = screen.getByRole('textbox', { name: 'From date' });
    fromInput.focus();
    const dayButton = dialog.querySelector('[data-date="2026-09-05"]') as HTMLElement;

    // A raw `.focus()` call, not a click — the day button's own onMouseDown
    // preventDefault and handleDayClick's explicit refocus aren't what's
    // under test here; the document-level focusin guard is.
    dayButton.focus();
    expect(document.activeElement).toBe(fromInput);
  });

  it('clicking anywhere in the trigger — the icon, the dash, the padding — widens the hitbox beyond just the two inputs, focusing whichever half was clicked', () => {
    render(<DateRangePicker value={{ kind: 'custom', from: '2026-09-01', to: '2026-09-11' }} onChange={vi.fn()} />);
    const trigger = screen.getByRole('group', { name: 'Date range' });
    trigger.getBoundingClientRect = () =>
      ({ left: 0, right: 200, top: 0, bottom: 20, width: 200, height: 20, x: 0, y: 0, toJSON() {} }) as DOMRect;

    // Neither click lands on an actual <input> — this is the icon/dash/
    // padding area of the container itself, not a click on either field.
    fireEvent.click(trigger, { clientX: 20 });
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'From date' }));

    fireEvent.click(trigger, { clientX: 180 });
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'To date' }));
  });

  it('closes on outside click', () => {
    render(
      <div>
        <div data-testid="outside">elsewhere</div>
        <DateRangePicker value={{ kind: 'relative', relativeTimeString: 'Last 60 months' }} onChange={vi.fn()} />
      </div>,
    );
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Today')).toBeTruthy();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Today')).toBeFalsy();
  });

  it('only one panel is ever open at a time — opening the calendar closes an open preset panel', () => {
    render(<DateRangePicker value={{ kind: 'relative', relativeTimeString: 'Last 60 months' }} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Today')).toBeTruthy();

    fireEvent.focus(screen.getByRole('textbox', { name: 'From date' }));
    expect(screen.queryByText('Today')).toBeFalsy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('a persistent `label` renders the field name inside the preset box, above the value (Bubble reference style)', () => {
    render(
      <DateRangePicker value={{ kind: 'relative', relativeTimeString: 'Last month' }} onChange={vi.fn()} label="Lookback" />,
    );
    expect(screen.getByText('Lookback')).toBeTruthy();
    expect(screen.getByText('Last month')).toBeTruthy();
  });
});
