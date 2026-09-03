import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MultiSelect, type MultiSelectOption } from './MultiSelect';

afterEach(() => cleanup());

const OPTIONS: MultiSelectOption[] = [
  { id: 'toyota', label: 'Toyota', subheader: 'Make' },
  { id: 'honda', label: 'Honda', subheader: 'Make' },
  { id: 'ford', label: 'Ford', subheader: 'Make' },
];

/** A real controlled-component harness (`value`/`onChange` actually wired to
 * state, unlike a bare `onChange={vi.fn()}`) — needed to exercise the
 * existingList '' -> non-empty transition on the first pick the way a real
 * consumer (e.g. the sandbox's own useState-backed demo) does. A mock
 * onChange that never feeds back into `value` can't reach that transition at
 * all, which is exactly how the growwrap-remount regression slipped past the
 * earlier version of the focus test below. */
function ControlledMultiSelect({ initialValue = [] as string[] }: { initialValue?: string[] }) {
  const [value, setValue] = useState<string[]>(initialValue);
  return <MultiSelect value={value} options={OPTIONS} onChange={setValue} />;
}

/** A harness where `options` is ACTUALLY filtered by the typed query (via
 * onSearch), the way a real consumer wires it — needed to exercise the
 * "only reset the search once it's narrowed to a single result" behavior,
 * since a mock onSearch that never feeds back into `options` can never
 * bring `options.length` down to 1 no matter what's typed. */
function FilteredMultiSelect({ initialValue = [] as string[] }: { initialValue?: string[] }) {
  const [value, setValue] = useState<string[]>(initialValue);
  const [query, setQuery] = useState('');
  const filteredOptions = query ? OPTIONS.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : OPTIONS;
  return <MultiSelect value={value} options={filteredOptions} onChange={setValue} onSearch={setQuery} />;
}

/** Mirrors the sandbox's own Make/Model cascade byte-for-byte (two sibling
 * MultiSelects, one onChange firing TWO setState calls in the same handler —
 * MultiSelectSection's handleMakesChange) — a repro harness for "still
 * broken after 3 picks" reports, so a real text/state bug shows up in jsdom
 * regardless of whether the exact browser mousedown/focus timing that
 * triggers focus-loss is faithfully replicated here too. */
const MODEL_BY_MAKE: Record<string, MultiSelectOption[]> = {
  toyota: [{ id: 'camry', label: 'Camry' }],
  honda: [{ id: 'civic', label: 'Civic' }],
  ford: [{ id: 'f150', label: 'F-150' }],
};
function CascadingMakeModel() {
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const modelOptions = makes.length === 0 ? Object.values(MODEL_BY_MAKE).flat() : makes.flatMap((m) => MODEL_BY_MAKE[m] ?? []);
  function handleMakesChange(next: string[]) {
    setMakes(next);
    const stillValid = new Set(modelOptions.map((o) => o.id));
    setModels((prev) => prev.filter((id) => stillValid.has(id)));
  }
  return (
    <>
      <MultiSelect value={makes} options={OPTIONS} onChange={handleMakesChange} label="Make" />
      <MultiSelect value={models} options={modelOptions} onChange={setModels} label="Model" />
    </>
  );
}

describe('<MultiSelect> — closed display', () => {
  it('shows the placeholder when empty, the single label when one is selected, and a comma-joined list when more than one', () => {
    const { rerender } = render(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} placeholderLabel="Make" />);
    expect(screen.getByText('Make')).toBeTruthy();

    rerender(<MultiSelect value={['toyota']} options={OPTIONS} onChange={vi.fn()} placeholderLabel="Make" />);
    expect(screen.getByText('Toyota')).toBeTruthy();

    rerender(<MultiSelect value={['toyota', 'honda']} options={OPTIONS} onChange={vi.fn()} placeholderLabel="Make" />);
    expect(screen.getByText('Toyota, Honda')).toBeTruthy();
  });

  it('lists every selected label in `value` order (selection order), not `options` order, and relies on CSS overflow/ellipsis rather than switching to a count', () => {
    render(<MultiSelect value={['ford', 'toyota', 'honda']} options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByText('Ford, Toyota, Honda')).toBeTruthy();
  });

  it('reordering `options` (e.g. search-relevance reordering, like "go" turning [red,green,gold] into [gold,green]) never reorders the preview — it always follows `value`, not the live options order', () => {
    const REORDERED = [OPTIONS[2]!, OPTIONS[1]!, OPTIONS[0]!]; // Ford, Honda, Toyota
    render(<MultiSelect value={['toyota', 'honda']} options={REORDERED} onChange={vi.fn()} />);
    expect(screen.getByText('Toyota, Honda')).toBeTruthy();
  });

  it('a selected id that MultiSelect has previously seen in `options` stays resolvable in the preview even once a later (e.g. filtered, mid-search) `options` no longer includes it — no caller-side merge required', () => {
    const FILTERED = OPTIONS.filter((o) => o.id !== 'toyota');
    const { rerender } = render(<MultiSelect value={['toyota', 'honda']} options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByText('Toyota, Honda')).toBeTruthy();

    rerender(<MultiSelect value={['toyota', 'honda']} options={FILTERED} onChange={vi.fn()} />);
    // Toyota's row is gone from the filtered options (it won't render as a
    // dropdown row), but its label is still remembered for the preview.
    expect(screen.getByText('Toyota, Honda')).toBeTruthy();
  });

  it('a selected id MultiSelect has never once seen in any `options` it was given has no label to resolve, so it silently drops from the preview', () => {
    const WITHOUT_FORD = OPTIONS.filter((o) => o.id !== 'ford');
    render(<MultiSelect value={['ford', 'honda']} options={WITHOUT_FORD} onChange={vi.fn()} />);
    expect(screen.getByText('Honda')).toBeTruthy();
    expect(screen.queryByText(/Ford/)).toBeFalsy();
  });

  it('a persistent `label` renders the field name inside the box, above the value/placeholder (Bubble reference style)', () => {
    const { rerender } = render(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} label="Make" placeholderLabel="Select…" />);
    expect(screen.getByText('Make')).toBeTruthy();
    expect(screen.getByText('Select…')).toBeTruthy();

    rerender(<MultiSelect value={['toyota']} options={OPTIONS} onChange={vi.fn()} label="Make" />);
    expect(screen.getByText('Make')).toBeTruthy();
    expect(screen.getByText('Toyota')).toBeTruthy();
  });
});

describe('<MultiSelect> — open/typeahead', () => {
  it('opens on click and on Enter/Space/ArrowDown, showing the option list with no separate search bar', () => {
    render(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} />);
    const combo = screen.getByRole('combobox');
    expect(screen.queryByText('Frodo')).toBeFalsy();

    fireEvent.click(combo);
    expect(screen.getByText('Toyota')).toBeTruthy();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.keyDown(combo, { key: 'ArrowDown' });
    expect(screen.getByText('Toyota')).toBeTruthy();
  });

  it('with nothing selected, the inline input fills the box and carries the placeholder — no trailing list to push', () => {
    render(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} placeholderLabel="Make" />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.placeholder).toBe('Make');
    // The growwrap is always present (never conditionally mounted — see the
    // .tsx's own comment on why) — just carries the --fill modifier here,
    // so it fills the box and the placeholder gets its full width.
    expect(document.querySelector('.lxn-multi-select-trigger-growwrap--fill')).toBeTruthy();
  });

  it('with existing selections, the input stays at the left and the selections trail off to the right after a comma', () => {
    render(<MultiSelect value={['toyota', 'honda']} options={OPTIONS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText(', Toyota, Honda')).toBeTruthy();
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(input.placeholder).toBe('');
  });

  it('the auto-grow mirror (data-value) tracks exactly what is typed, once there is a trailing list to push right', () => {
    render(<MultiSelect value={['toyota']} options={OPTIONS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    const growwrap = document.querySelector('.lxn-multi-select-trigger-growwrap');
    expect(growwrap?.getAttribute('data-value')).toBe('');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'civic' } });
    expect(growwrap?.getAttribute('data-value')).toBe('civic');
  });

  it('picking an option never blurs the search input — the caret keeps flashing there', () => {
    render(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox');
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.click(screen.getByRole('option', { name: /Honda/ }));
    expect(document.activeElement).toBe(input);
  });

  it('regression: focus survives the very FIRST pick too (0 -> 1 selected), not just the 2nd+, under a real controlled value/onChange', () => {
    render(<ControlledMultiSelect />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox');
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.click(screen.getByRole('option', { name: /Toyota/ }));
    // Re-query rather than reuse `input` — a remount would mean the old node
    // is no longer even in the document, which this also implicitly checks.
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
    expect(screen.getByText(', Toyota')).toBeTruthy();

    fireEvent.click(screen.getByRole('option', { name: /Honda/ }));
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
    expect(screen.getByText(', Toyota, Honda')).toBeTruthy();
  });

  it('calls onSearch with the raw query on every keystroke in the inline input', () => {
    const onSearch = vi.fn();
    render(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('combobox'));

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ho' } });
    expect(onSearch).toHaveBeenCalledWith('ho');
  });

  it('clicking an option toggles it on, calls onChange, and keeps the panel open', () => {
    const onChange = vi.fn();
    render(<MultiSelect value={[]} options={OPTIONS} onChange={onChange} onSearch={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    fireEvent.click(screen.getByText('Honda'));
    expect(onChange).toHaveBeenCalledWith(['honda']);
    // Still open — the option list is still rendered.
    expect(screen.getByText('Toyota')).toBeTruthy();
  });

  it('clicking one of SEVERAL search results leaves the typed search in place, so the user can keep clicking through the rest without retyping it', () => {
    render(<FilteredMultiSelect />);
    fireEvent.click(screen.getByRole('combobox'));
    // "o" matches all three (Toyota, Honda, Ford) — a multi-result search,
    // the "200" narrowing to several 2000s trims scenario.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'o' } });

    fireEvent.click(screen.getByRole('option', { name: /Honda/ }));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('o');
    // The other matches are still right there, ready to click too.
    expect(screen.getByRole('option', { name: /Toyota/ })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Ford/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('option', { name: /Ford/ }));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('o');
  });

  it('clicking the SOLE remaining search result clears the typed search, ready for the next one', () => {
    render(<FilteredMultiSelect />);
    fireEvent.click(screen.getByRole('combobox'));
    // "hon" narrows the list down to just Honda.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hon' } });

    fireEvent.click(screen.getByRole('option', { name: /Honda/ }));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
    // Search cleared, so the full list is back.
    expect(screen.getByRole('option', { name: /Toyota/ })).toBeTruthy();
  });

  it('clicking an option (unlike Enter) keeps the highlight on the just-picked row rather than hiding it', () => {
    render(<ControlledMultiSelect />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hon' } });

    fireEvent.click(screen.getByRole('option', { name: /Honda/ }));
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: /Honda/ }).id);
  });

  it('clicking an option with an already-empty search does not fire onSearch again', () => {
    const onChange = vi.fn();
    const onSearch = vi.fn();
    render(<MultiSelect value={[]} options={OPTIONS} onChange={onChange} onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('combobox'));

    fireEvent.click(screen.getByText('Honda'));
    expect(onChange).toHaveBeenCalledWith(['honda']);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('clicking an already-selected option toggles it back off', () => {
    const onChange = vi.fn();
    render(<MultiSelect value={['toyota', 'honda']} options={OPTIONS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));

    fireEvent.click(screen.getByRole('option', { name: /Toyota/ }));
    expect(onChange).toHaveBeenCalledWith(['honda']);
  });

  it('marks selected options via aria-selected, driving the checkbox fill', () => {
    render(<MultiSelect value={['honda']} options={OPTIONS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByRole('option', { name: /Honda/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('option', { name: /Toyota/ }).getAttribute('aria-selected')).toBe('false');
  });

  it('ArrowDown/ArrowUp move the highlight (aria-activedescendant) through the option list, clamped at both ends', () => {
    render(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox');
    const [toyota, honda, ford] = OPTIONS.map((o) => screen.getByRole('option', { name: new RegExp(o.label) }));

    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(toyota!.id);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(honda!.id);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(ford!.id);

    // Already at the last option — stays there instead of wrapping.
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(ford!.id);

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(honda!.id);
  });

  it('Enter toggles whichever option is currently highlighted and calls onChange', () => {
    const onChange = vi.fn();
    render(<MultiSelect value={[]} options={OPTIONS} onChange={onChange} onSearch={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['honda']);
  });

  it('Enter on the SOLE remaining search result clears the typed search and (unlike a mouse click) hides the highlight afterward', () => {
    render(<FilteredMultiSelect />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    // "hon" narrows the list down to just Honda, already highlighted (it's
    // the only row left) — no ArrowDown needed.
    fireEvent.change(input, { target: { value: 'hon' } });

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe('');
    // The search resetting hides the highlight rather than leaving it on
    // the just-picked row — the next arrow press should land on the top
    // result, same as a fresh open, not resume from Honda.
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBeNull();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: /Toyota/ }).id);
  });

  it('Enter on one of SEVERAL search results leaves the typed search and the highlight in place too, same as a mouse click', () => {
    render(<FilteredMultiSelect />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    // "o" matches all three — Enter picks the top-highlighted result, Toyota.
    fireEvent.change(input, { target: { value: 'o' } });

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe('o');
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: /Toyota/ }).id);
  });

  it('Enter with an already-empty search does not fire onSearch again — clearing an empty string is not a no-op to the caller', () => {
    const onChange = vi.fn();
    const onSearch = vi.fn();
    render(<MultiSelect value={[]} options={OPTIONS} onChange={onChange} onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['honda']);
    expect(onSearch).not.toHaveBeenCalled();
    // Nothing was actually reset, so the highlight stays put on the
    // just-picked row too — same "no-op search, no-op highlight" rule.
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: /Honda/ }).id);
  });

  it('mouse hover over an option clears the keyboard highlight, so only one row is ever shown active at a time', () => {
    render(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox');
    const combo = screen.getByRole('combobox');

    // Opens with the top result highlighted.
    expect(combo.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: /Toyota/ }).id);

    fireEvent.mouseEnter(screen.getByRole('option', { name: /Ford/ }));
    expect(combo.getAttribute('aria-activedescendant')).toBeNull();

    // The keyboard picks back up at the top, not from where it left off.
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(combo.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: /Toyota/ }).id);
  });

  it('picking an option (mouse or Enter) re-anchors the highlight there, so the next arrow press continues from it', () => {
    render(<ControlledMultiSelect />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox');

    fireEvent.click(screen.getByRole('option', { name: /Honda/ }));
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: /Ford/ }).id);
  });

  it('shows the empty-state label when options is empty', () => {
    render(<MultiSelect value={[]} options={[]} onChange={vi.fn()} emptyLabel="No matches" />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('No matches')).toBeTruthy();
  });

  it('closes on outside click and on Escape', () => {
    render(
      <div>
        <div data-testid="outside">elsewhere</div>
        <MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} />
      </div>,
    );
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Toyota')).toBeTruthy();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Toyota')).toBeFalsy();

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Toyota')).toBeFalsy();
  });

  it('focus moving outside the trigger/panel (e.g. tabbing away) closes the dropdown too, without stealing focus back', () => {
    render(
      <div>
        <MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} />
        <button>next field</button>
      </div>,
    );
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Toyota')).toBeTruthy();

    const nextField = screen.getByRole('button', { name: 'next field' });
    // A raw `.focus()` call is a real, native focus move (unlike
    // fireEvent.focusIn, which dispatches a synthetic event without
    // actually moving document.activeElement) — but it isn't wrapped in
    // RTL's act() the way fireEvent.* calls are, so the resulting state
    // update needs an explicit act() to flush before asserting on it.
    act(() => nextField.focus());
    expect(screen.queryByText('Toyota')).toBeFalsy();
    // The dropdown closing doesn't yank focus away from wherever Tab sent it.
    expect(document.activeElement).toBe(nextField);
  });

  it('closing (Escape, outside click, or tab-away) clears the typed search and notifies the caller via onSearch, so a caller-side filter does not go stale by the next open', () => {
    const onSearch = vi.fn();
    render(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hon' } });
    onSearch.mockClear();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onSearch).toHaveBeenLastCalledWith('');
  });

  it('closing with an already-empty search does not fire onSearch again', () => {
    const onSearch = vi.fn();
    render(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('combobox'));

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('a selected item filtered out of the live `options` still shows in the open trigger preview, but is not rendered as a dropdown row (the dropdown always reflects the current search, never the cache)', () => {
    const { rerender } = render(<MultiSelect value={['toyota', 'honda']} options={OPTIONS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText(', Toyota, Honda')).toBeTruthy();
    expect(screen.getByRole('option', { name: /Toyota/ })).toBeTruthy();

    // Simulates the live `options` prop narrowing mid-search (e.g. typing
    // something Toyota no longer matches) — MultiSelect has already seen
    // Toyota once, though, so it stays resolvable in the preview.
    const FILTERED = OPTIONS.filter((o) => o.id !== 'toyota');
    rerender(<MultiSelect value={['toyota', 'honda']} options={FILTERED} onChange={vi.fn()} />);

    expect(screen.getByText(', Toyota, Honda')).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Toyota/ })).toBeFalsy();
    expect(screen.getByRole('option', { name: /Honda/ })).toBeTruthy();
  });

  it('regression: three sequential picks in the real Make/Model cascade harness all show up in the trigger text (repro for "still blank after 3 picks")', () => {
    render(<CascadingMakeModel />);
    const [makeCombo] = screen.getAllByRole('combobox');
    fireEvent.click(makeCombo!);

    fireEvent.click(screen.getByRole('option', { name: /Toyota/ }));
    expect(screen.getByText(', Toyota')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getAllByRole('textbox')[0]);

    fireEvent.click(screen.getByRole('option', { name: /Honda/ }));
    expect(screen.getByText(', Toyota, Honda')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getAllByRole('textbox')[0]);

    fireEvent.click(screen.getByRole('option', { name: /Ford/ }));
    expect(screen.getByText(', Toyota, Honda, Ford')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getAllByRole('textbox')[0]);

    // Each aria-selected checkbox reflects the accumulated selection, same
    // as the checked-checkbox screenshot this reproduces.
    expect(screen.getByRole('option', { name: /Toyota/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('option', { name: /Honda/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('option', { name: /Ford/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('regression: focus lands back on the option row when moved there directly (simulating a browser mousedown/focus quirk not caught by preventDefault) — the focusin guard yanks it back to the input', () => {
    render(<ControlledMultiSelect />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox');
    input.focus();

    // Simulate the browser having focused the option anyway (real browsers
    // don't all honor onMouseDown's preventDefault identically) — a plain
    // .focus() call, not a click, so toggleOption's own explicit refocus
    // isn't what's under test here; the focusin guard effect is. The guard
    // corrects it synchronously within this same .focus() call (the
    // `focusin` handler runs before .focus() even returns), so there's no
    // separate "it landed on the option" moment to observe — activeElement
    // is already back on the input by the very next line.
    const option = screen.getByRole('option', { name: /Honda/ });
    option.focus();
    expect(document.activeElement).toBe(input);
  });

  it('renderTrigger fully replaces the default trigger markup', () => {
    const onChange = vi.fn();
    render(
      <MultiSelect
        value={['toyota']}
        options={OPTIONS}
        onChange={onChange}
        renderTrigger={({ selected, onClick }) => (
          <div className="my-custom-row" onClick={onClick}>
            custom: {selected.map((o) => o.label).join(', ')}
          </div>
        )}
      />,
    );
    expect(screen.queryByRole('combobox')).toBeFalsy();
    expect(screen.getByText('custom: Toyota')).toBeTruthy();

    fireEvent.click(screen.getByText('custom: Toyota'));
    fireEvent.click(screen.getByText('Honda'));
    expect(onChange).toHaveBeenCalledWith(['toyota', 'honda']);
  });
});

describe('<MultiSelect> — clear button', () => {
  it('does not appear when opened with nothing selected — the chevron stays put', () => {
    render(<ControlledMultiSelect />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear selection' })).toBeFalsy();
  });

  it('is not rendered while closed, appears once opened, and clicking it clears the whole selection without closing the panel', () => {
    render(<ControlledMultiSelect initialValue={['toyota', 'honda']} />);
    expect(screen.queryByRole('button', { name: 'Clear selection' })).toBeFalsy();

    fireEvent.click(screen.getByRole('combobox'));
    const clearButton = screen.getByRole('button', { name: 'Clear selection' });
    fireEvent.click(clearButton);

    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getAllByRole('option').every((o) => o.getAttribute('aria-selected') === 'false')).toBe(true);
  });

  it('never blurs the search input when clicked', () => {
    render(<ControlledMultiSelect initialValue={['toyota']} />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox');
    input.focus();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Clear selection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(document.activeElement).toBe(input);
  });
});

describe('<MultiSelect> — disabled', () => {
  it('still shows the selected value(s), but a click never opens the panel', () => {
    render(<MultiSelect value={['toyota']} options={OPTIONS} onChange={vi.fn()} label="Make" disabled />);
    expect(screen.getByText('Toyota')).toBeTruthy();

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('listbox')).toBeFalsy();
  });

  it('Enter/Space/ArrowDown on the trigger never opens the panel either', () => {
    render(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} disabled />);
    const trigger = screen.getByRole('combobox');
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.keyDown(trigger, { key: ' ' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.queryByRole('listbox')).toBeFalsy();
  });

  it('is removed from the tab order and marked aria-disabled, unlike an enabled trigger', () => {
    render(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} disabled />);
    const trigger = screen.getByRole('combobox');
    expect(trigger.getAttribute('tabindex')).toBe('-1');
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
  });

  it('a custom renderTrigger\'s own onClick still no-ops while disabled', () => {
    const onChange = vi.fn();
    render(
      <MultiSelect
        value={['toyota']}
        options={OPTIONS}
        onChange={onChange}
        disabled
        renderTrigger={({ selected, onClick }) => (
          <div className="my-custom-row" onClick={onClick}>
            custom: {selected.map((o) => o.label).join(', ')}
          </div>
        )}
      />,
    );
    fireEvent.click(screen.getByText('custom: Toyota'));
    expect(screen.queryByRole('listbox')).toBeFalsy();
  });
});

describe('<MultiSelect> — saving', () => {
  it('cannot be opened by click or keyboard, same as disabled, but is aria-busy rather than aria-disabled', () => {
    render(<MultiSelect value={['toyota']} options={OPTIONS} onChange={vi.fn()} saving />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    expect(screen.queryByRole('listbox')).toBeFalsy();
    expect(trigger.getAttribute('tabindex')).toBe('-1');
    expect(trigger.getAttribute('aria-busy')).toBe('true');
    expect(trigger.getAttribute('aria-disabled')).toBe('false');
  });
});

describe('<MultiSelect> — auto / note annotations', () => {
  it('shows the auto-assigned glyph beside a real selection, and hides it once nothing is selected even if `auto` stays true', () => {
    const { container, rerender } = render(<MultiSelect value={['toyota']} options={OPTIONS} onChange={vi.fn()} auto />);
    expect(container.querySelector('.lxn-select-trigger-auto-icon')).toBeTruthy();

    rerender(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} auto />);
    expect(container.querySelector('.lxn-select-trigger-auto-icon')).toBeFalsy();
  });

  it('renders `note` right beside the value regardless of selection — unlike `auto`, it is NOT gated on hasSelection (a caller can have a note with no real value at all)', () => {
    const { rerender } = render(<MultiSelect value={['toyota']} options={OPTIONS} onChange={vi.fn()} note="(Head Office)" />);
    expect(screen.getByText('(Head Office)')).toBeTruthy();

    rerender(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} note="(Head Office)" />);
    expect(screen.getByText('(Head Office)')).toBeTruthy();
  });
});

describe('<MultiSelect> — clearable', () => {
  it('clearable={false} suppresses the open-state clear button even with a selection — the chevron stays put', () => {
    render(<MultiSelect value={['toyota']} options={OPTIONS} onChange={vi.fn()} clearable={false} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('button', { name: 'Clear selection' })).toBeFalsy();
  });
});

describe('<MultiSelect> — justSaved', () => {
  it('renders the just-saved modifier class while true, and not once it flips back off', () => {
    const { rerender } = render(<MultiSelect value={['toyota']} options={OPTIONS} onChange={vi.fn()} justSaved />);
    expect(screen.getByRole('combobox').className).toContain('lxn-select-trigger--just-saved');

    rerender(<MultiSelect value={['toyota']} options={OPTIONS} onChange={vi.fn()} justSaved={false} />);
    expect(screen.getByRole('combobox').className).not.toContain('lxn-select-trigger--just-saved');
  });
});

describe('<MultiSelect> — size', () => {
  it('defaults to no compact class, and adds one when size="compact"', () => {
    const { rerender } = render(<MultiSelect value={['toyota']} options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox').className).not.toContain('lxn-select-trigger--compact');

    rerender(<MultiSelect value={['toyota']} options={OPTIONS} onChange={vi.fn()} size="compact" />);
    expect(screen.getByRole('combobox').className).toContain('lxn-select-trigger--compact');
  });

  it('carries compact through to the OPEN panel too, not just the trigger — the option list would otherwise read as oversized under a shrunk trigger', () => {
    render(<MultiSelect value={[]} options={OPTIONS} onChange={vi.fn()} size="compact" />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox').closest('.lxn-multi-select-panel')?.className).toContain('lxn-multi-select-panel--compact');
  });
});

describe('<MultiSelect> — ariaLabel', () => {
  it('names the default trigger for assistive tech, and sharpens the clear button\'s own label to match', () => {
    render(<MultiSelect value={['toyota']} options={OPTIONS} onChange={vi.fn()} ariaLabel="Colors" />);
    expect(screen.getByRole('combobox').getAttribute('aria-label')).toBe('Colors');

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('button', { name: 'Clear Colors' })).toBeTruthy();
  });
});
