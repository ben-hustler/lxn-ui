import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SearchSelect, type SearchSelectOption } from './SearchSelect';

afterEach(() => cleanup());

const OPTIONS: SearchSelectOption[] = [
  { id: 'u1', label: 'Frodo Baggins', subheader: 'Salesperson' },
  { id: 'u2', label: 'Samwise Gamgee', subheader: 'Salesperson' },
];

describe('<SearchSelect>', () => {
  it('renders the placeholder when nothing is selected, and the selected option label otherwise', () => {
    const { rerender } = render(
      <SearchSelect value="" options={OPTIONS} onSelect={vi.fn()} placeholderLabel="Assign…" />,
    );
    expect(screen.getByText('Assign…')).toBeTruthy();

    rerender(<SearchSelect value="u1" options={OPTIONS} onSelect={vi.fn()} placeholderLabel="Assign…" />);
    expect(screen.getByText('Frodo Baggins')).toBeTruthy();
  });

  it('opens the panel on trigger click, showing the full option list with subheaders, no typing required', () => {
    render(<SearchSelect value="" options={OPTIONS} onSelect={vi.fn()} />);
    expect(screen.queryByRole('option', { name: /Frodo/ })).toBeFalsy();

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Frodo Baggins')).toBeTruthy();
    expect(screen.getByText('Samwise Gamgee')).toBeTruthy();
    expect(screen.getAllByText('Salesperson')).toHaveLength(2);
  });

  it('shows the empty-state label when options is empty', () => {
    render(<SearchSelect value="" options={[]} onSelect={vi.fn()} emptyLabel="No matches" />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('No matches')).toBeTruthy();
  });

  it('calls onSearch with the raw query on every keystroke — filtering itself is the caller\'s job', () => {
    const onSearch = vi.fn();
    render(<SearchSelect value="" options={OPTIONS} onSelect={vi.fn()} onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button'));

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'sam' } });
    expect(onSearch).toHaveBeenCalledWith('sam');
  });

  it('clicking an option calls onSelect and closes the panel', () => {
    const onSelect = vi.fn();
    render(<SearchSelect value="" options={OPTIONS} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));

    fireEvent.click(screen.getByText('Samwise Gamgee'));

    expect(onSelect).toHaveBeenCalledWith('u2');
    expect(screen.queryByText('Frodo Baggins')).toBeFalsy();
  });

  it('closes on outside click', () => {
    render(
      <div>
        <div data-testid="outside">elsewhere</div>
        <SearchSelect value="" options={OPTIONS} onSelect={vi.fn()} />
      </div>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Frodo Baggins')).toBeTruthy();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Frodo Baggins')).toBeFalsy();
  });

  it('closes on Escape', () => {
    render(<SearchSelect value="" options={OPTIONS} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Frodo Baggins')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Frodo Baggins')).toBeFalsy();
  });

  it('renderTrigger fully replaces the default trigger markup, wiring only onClick', () => {
    const onSelect = vi.fn();
    render(
      <SearchSelect
        value="u1"
        options={OPTIONS}
        onSelect={onSelect}
        renderTrigger={({ selected, onClick }) => (
          <div className="my-custom-row" onClick={onClick}>
            custom: {selected?.label}
          </div>
        )}
      />,
    );
    expect(screen.queryByRole('button')).toBeFalsy();
    expect(screen.getByText('custom: Frodo Baggins')).toBeTruthy();

    fireEvent.click(screen.getByText('custom: Frodo Baggins'));
    fireEvent.click(screen.getByText('Samwise Gamgee'));
    expect(onSelect).toHaveBeenCalledWith('u2');
  });
});
