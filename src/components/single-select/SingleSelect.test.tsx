import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SingleSelect, type SingleSelectOption } from './SingleSelect';

afterEach(() => cleanup());

const OPTIONS: SingleSelectOption[] = [
  { id: 'toyota', label: 'Toyota', subheader: 'Make' },
  { id: 'honda', label: 'Honda', subheader: 'Make' },
  { id: 'ford', label: 'Ford', subheader: 'Make' },
];

function ControlledSingleSelect({ initialValue = null as string | null }: { initialValue?: string | null }) {
  const [value, setValue] = useState<string | null>(initialValue);
  return <SingleSelect value={value} options={OPTIONS} onChange={setValue} />;
}

function FilteredSingleSelect() {
  const [value, setValue] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const filteredOptions = query ? OPTIONS.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : OPTIONS;
  return <SingleSelect value={value} options={filteredOptions} onChange={setValue} onSearch={setQuery} />;
}

describe('<SingleSelect> — closed display', () => {
  it('shows the placeholder when nothing is selected, and the selected label once something is', () => {
    const { rerender } = render(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} placeholderLabel="Make" />);
    expect(screen.getByText('Make')).toBeTruthy();

    rerender(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} placeholderLabel="Make" />);
    expect(screen.getByText('Toyota')).toBeTruthy();
    expect(screen.queryByText('Make')).toBeFalsy();
  });

  it('a selected id SingleSelect has previously seen in `options` stays resolvable even once a later (filtered) `options` no longer includes it', () => {
    const FILTERED = OPTIONS.filter((o) => o.id !== 'toyota');
    const { rerender } = render(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByText('Toyota')).toBeTruthy();

    rerender(<SingleSelect value="toyota" options={FILTERED} onChange={vi.fn()} />);
    expect(screen.getByText('Toyota')).toBeTruthy();
  });

  it('a persistent `label` renders the field name inside the box, above the value/placeholder (Bubble reference style)', () => {
    const { rerender } = render(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} label="Make" placeholderLabel="Select…" />);
    expect(screen.getByText('Make')).toBeTruthy();
    expect(screen.getByText('Select…')).toBeTruthy();

    rerender(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} label="Make" />);
    expect(screen.getByText('Make')).toBeTruthy();
    expect(screen.getByText('Toyota')).toBeTruthy();
  });
});

describe('<SingleSelect> — open/typeahead', () => {
  it('opens on click and on Enter/Space/ArrowDown, showing the option list with no separate search bar', () => {
    render(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} />);
    const combo = screen.getByRole('combobox');
    expect(screen.queryByText('Toyota')).toBeFalsy();

    fireEvent.click(combo);
    expect(screen.getByText('Toyota')).toBeTruthy();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('with nothing selected, the inline input carries the generic placeholder', () => {
    render(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} placeholderLabel="Make" />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.placeholder).toBe('Make');
    expect(input.value).toBe('');
  });

  it('with something selected, opening puts the CURRENT selection into the placeholder (grey, in-box) instead of pushing it aside', () => {
    render(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} placeholderLabel="Make" />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.placeholder).toBe('Toyota');
    expect(input.value).toBe('');
    // No trailing/suffix element exists at all — unlike MultiSelect there's
    // never anything to push rightward.
    expect(screen.queryByText(/, Toyota/)).toBeFalsy();
  });

  it('typing takes over the input — the selected label was only ever in `placeholder`, which the browser stops rendering once `value` is non-empty', () => {
    render(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.placeholder).toBe('Toyota');

    fireEvent.change(input, { target: { value: 'ho' } });
    expect(input.value).toBe('ho');
    // No separate element ever carried "Toyota" as real text content (unlike
    // MultiSelect's trailing suffix span) — it lived only in the attribute
    // above, so there is nothing else here that needs to be hidden or removed.
  });

  it('calls onSearch with the raw query on every keystroke in the inline input', () => {
    const onSearch = vi.fn();
    render(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('combobox'));

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ho' } });
    expect(onSearch).toHaveBeenCalledWith('ho');
  });
});

describe('<SingleSelect> — picking', () => {
  it('clicking an option calls onChange with its id and closes the panel — every click closes, unlike MultiSelect', () => {
    const onChange = vi.fn();
    render(<SingleSelect value={null} options={OPTIONS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));

    fireEvent.click(screen.getByRole('option', { name: /Honda/ }));
    expect(onChange).toHaveBeenCalledWith('honda');
    expect(screen.queryByRole('option', { name: /Toyota/ })).toBeFalsy();
  });

  it('clicking the ALREADY-selected option still closes the panel (no toggle-off — there is always exactly one slot)', () => {
    const onChange = vi.fn();
    render(<SingleSelect value="toyota" options={OPTIONS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));

    fireEvent.click(screen.getByRole('option', { name: /Toyota/ }));
    expect(onChange).toHaveBeenCalledWith('toyota');
    expect(screen.queryByRole('listbox')).toBeFalsy();
  });

  it('picking from a live-filtered search clears the query for next time (the panel is closed anyway, so this only matters on reopen)', async () => {
    render(<FilteredSingleSelect />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hon' } });
    fireEvent.click(screen.getByRole('option', { name: /Honda/ }));

    fireEvent.click(screen.getByRole('combobox'));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('option', { name: /Toyota/ })).toBeTruthy();
  });

  it('marks the current value via aria-selected, driving the checkmark-circle fill', () => {
    render(<SingleSelect value="honda" options={OPTIONS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByRole('option', { name: /Honda/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('option', { name: /Toyota/ }).getAttribute('aria-selected')).toBe('false');
  });

  it('ArrowDown/ArrowUp move the highlight (aria-activedescendant) through the option list, clamped at both ends', () => {
    render(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox');
    const [toyota, honda, ford] = OPTIONS.map((o) => screen.getByRole('option', { name: new RegExp(o.label) }));

    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(toyota!.id);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(honda!.id);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(ford!.id);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(ford!.id);

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe(honda!.id);
  });

  it('Enter picks whichever option is currently highlighted, calls onChange, and closes', () => {
    const onChange = vi.fn();
    render(<SingleSelect value={null} options={OPTIONS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('honda');
    expect(screen.queryByRole('listbox')).toBeFalsy();
  });

  it('a real controlled value/onChange round-trip updates the closed-state label after a pick', () => {
    render(<ControlledSingleSelect />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: /Ford/ }));
    expect(screen.getByText('Ford')).toBeTruthy();
  });
});

describe('<SingleSelect> — clear button', () => {
  it('does not appear when opened with nothing selected — the chevron stays put', () => {
    render(<ControlledSingleSelect />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear selection' })).toBeFalsy();
  });

  it('is not rendered while closed, appears once opened with a value selected, and clicking it calls onChange(null) without closing the panel', () => {
    render(<ControlledSingleSelect initialValue="toyota" />);
    expect(screen.queryByRole('button', { name: 'Clear selection' })).toBeFalsy();

    fireEvent.click(screen.getByRole('combobox'));
    const clearButton = screen.getByRole('button', { name: 'Clear selection' });
    fireEvent.click(clearButton);

    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getByRole('option', { name: /Toyota/ }).getAttribute('aria-selected')).toBe('false');
  });

  it('never blurs the search input when clicked', () => {
    render(<ControlledSingleSelect initialValue="toyota" />);
    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('textbox');
    input.focus();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Clear selection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(document.activeElement).toBe(input);
  });
});

describe('<SingleSelect> — dismissal', () => {
  it('closes on outside click and on Escape', () => {
    render(
      <>
        <div data-testid="outside">elsewhere</div>
        <SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} />
      </>,
    );
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Toyota')).toBeTruthy();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Toyota')).toBeFalsy();

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Toyota')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Toyota')).toBeFalsy();
  });

  it('closing clears the typed search and notifies the caller via onSearch, so a caller-side filter does not go stale by the next open', () => {
    const onSearch = vi.fn();
    render(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hon' } });
    onSearch.mockClear();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onSearch).toHaveBeenCalledWith('');
  });
});

describe('<SingleSelect> — renderTrigger', () => {
  it('fully replaces the default trigger markup and receives the resolved selected option (not just its id)', () => {
    render(
      <SingleSelect
        value="toyota"
        options={OPTIONS}
        onChange={vi.fn()}
        renderTrigger={({ selected, onClick }) => (
          <button type="button" onClick={onClick} data-testid="custom-trigger">
            {selected?.label ?? 'none'}
          </button>
        )}
      />,
    );
    expect(screen.getByTestId('custom-trigger').textContent).toBe('Toyota');
    fireEvent.click(screen.getByTestId('custom-trigger'));
    expect(screen.getByRole('listbox')).toBeTruthy();
  });
});

describe('<SingleSelect> — disabled', () => {
  it('cannot be opened by click or keyboard', () => {
    render(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} label="Make" disabled />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('listbox')).toBeFalsy();
  });

  it('is removed from the tab order and marked aria-disabled', () => {
    render(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} disabled />);
    const trigger = screen.getByRole('combobox');
    expect(trigger.getAttribute('tabindex')).toBe('-1');
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
  });

  it("a custom renderTrigger's own onClick still no-ops while disabled", () => {
    render(
      <SingleSelect
        value={null}
        options={OPTIONS}
        onChange={vi.fn()}
        disabled
        renderTrigger={({ onClick }) => (
          <button type="button" onClick={onClick} data-testid="custom-trigger">
            trigger
          </button>
        )}
      />,
    );
    fireEvent.click(screen.getByTestId('custom-trigger'));
    expect(screen.queryByRole('listbox')).toBeFalsy();
  });
});

describe('<SingleSelect> — saving', () => {
  it('cannot be opened by click or keyboard, same as disabled, but is aria-busy rather than aria-disabled', () => {
    render(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} saving />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    expect(screen.queryByRole('listbox')).toBeFalsy();
    expect(trigger.getAttribute('tabindex')).toBe('-1');
    expect(trigger.getAttribute('aria-busy')).toBe('true');
    expect(trigger.getAttribute('aria-disabled')).toBe('false');
  });

  it('a custom renderTrigger\'s own onClick still no-ops while saving', () => {
    render(
      <SingleSelect
        value={null}
        options={OPTIONS}
        onChange={vi.fn()}
        saving
        renderTrigger={({ onClick }) => (
          <button type="button" onClick={onClick} data-testid="custom-trigger">
            trigger
          </button>
        )}
      />,
    );
    fireEvent.click(screen.getByTestId('custom-trigger'));
    expect(screen.queryByRole('listbox')).toBeFalsy();
  });
});

describe('<SingleSelect> — auto / note annotations', () => {
  it('shows the auto-assigned glyph beside a real selection, and hides it once nothing is selected even if `auto` stays true', () => {
    const { container, rerender } = render(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} auto />);
    expect(container.querySelector('.lxn-select-trigger-auto-icon')).toBeTruthy();

    rerender(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} auto />);
    expect(container.querySelector('.lxn-select-trigger-auto-icon')).toBeFalsy();
  });

  it('renders `note` right beside the value regardless of selection — unlike `auto`, it is NOT gated on hasSelection (a caller can have a note with no real value at all, e.g. displayLabel\'s own use case)', () => {
    const { rerender } = render(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} note="(Head Office)" />);
    expect(screen.getByText('(Head Office)')).toBeTruthy();

    rerender(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} note="(Head Office)" />);
    expect(screen.getByText('(Head Office)')).toBeTruthy();
  });

  it('hides both while the panel is open (the value area becomes a live search input)', () => {
    const { container } = render(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} auto note="(Head Office)" />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(container.querySelector('.lxn-select-trigger-auto-icon')).toBeFalsy();
    expect(screen.queryByText('(Head Office)')).toBeFalsy();
  });
});

describe('<SingleSelect> — clearable', () => {
  it('clearable={false} suppresses the open-state clear button even with a value selected — the chevron stays put', () => {
    render(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} clearable={false} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('button', { name: 'Clear selection' })).toBeFalsy();
  });
});

describe('<SingleSelect> — justSaved', () => {
  it('renders the just-saved modifier class while true, and not once it flips back off', () => {
    const { rerender } = render(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} justSaved />);
    expect(screen.getByRole('combobox').className).toContain('lxn-select-trigger--just-saved');

    rerender(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} justSaved={false} />);
    expect(screen.getByRole('combobox').className).not.toContain('lxn-select-trigger--just-saved');
  });
});

describe('<SingleSelect> — ariaLabel', () => {
  it('names the default trigger for assistive tech, and sharpens the clear button\'s own label to match', () => {
    render(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} ariaLabel="Appraiser" />);
    expect(screen.getByRole('combobox').getAttribute('aria-label')).toBe('Appraiser');

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('button', { name: 'Clear Appraiser' })).toBeTruthy();
  });

  it('falls back to the generic "Clear selection" label when no ariaLabel is given', () => {
    render(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('button', { name: 'Clear selection' })).toBeTruthy();
  });
});

describe('<SingleSelect> — size', () => {
  it('defaults to no compact class, and adds one when size="compact"', () => {
    const { rerender } = render(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox').className).not.toContain('lxn-select-trigger--compact');

    rerender(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} size="compact" />);
    expect(screen.getByRole('combobox').className).toContain('lxn-select-trigger--compact');
  });

  it('carries compact through to the OPEN panel too, not just the trigger — the option list would otherwise read as oversized under a shrunk trigger', () => {
    render(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} size="compact" />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox').closest('.lxn-single-select-panel')?.className).toContain('lxn-single-select-panel--compact');
  });
});

describe('<SingleSelect> — displayLabel', () => {
  it('overrides the closed-state label even with no real value, and reads as real text (not placeholder-grey)', () => {
    render(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} displayLabel="Arwen Undómiel" placeholderLabel="Unassigned" />);
    const value = screen.getByText('Arwen Undómiel');
    expect(value.className).not.toContain('is-placeholder');
    expect(screen.queryByText('Unassigned')).toBeFalsy();
  });

  it('still gates the clear button on the raw `value`, not the override — nothing valid to clear when value is null', () => {
    render(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} displayLabel="Arwen Undómiel" />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('button', { name: 'Clear selection' })).toBeFalsy();
  });

  it('wins even over a resolved `selected` label', () => {
    render(<SingleSelect value="toyota" options={OPTIONS} onChange={vi.fn()} displayLabel="Arwen Undómiel" />);
    expect(screen.getByText('Arwen Undómiel')).toBeTruthy();
    expect(screen.queryByText('Toyota')).toBeFalsy();
  });

  it('becomes the OPEN input\'s placeholder too, same as a resolved selection would', () => {
    render(<SingleSelect value={null} options={OPTIONS} onChange={vi.fn()} displayLabel="Arwen Undómiel" />);
    fireEvent.click(screen.getByRole('combobox'));
    expect((screen.getByRole('textbox') as HTMLInputElement).placeholder).toBe('Arwen Undómiel');
  });

  it('a value that IS set but resolves to nothing in `options` still counts as hasSelection for the clear button (raw value, not resolution)', () => {
    render(<SingleSelect value="unresolved_id" options={OPTIONS} onChange={vi.fn()} displayLabel="Arwen Undómiel" />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('button', { name: 'Clear selection' })).toBeTruthy();
  });
});
