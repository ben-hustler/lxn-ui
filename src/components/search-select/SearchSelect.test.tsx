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

  it('does not call onSearch just from opening (or reopening) the panel — the caller supplies its full list up front via `options`, onSearch is only for an actual typed query', () => {
    const onSearch = vi.fn();
    render(<SearchSelect value="" options={OPTIONS} onSelect={vi.fn()} onSearch={onSearch} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onSearch).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button'));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('reopening the panel clears any leftover typed text, showing the full list again without calling onSearch', () => {
    const onSearch = vi.fn();
    render(<SearchSelect value="" options={OPTIONS} onSelect={vi.fn()} onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'sam' } });
    onSearch.mockClear();

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByPlaceholderText('Search')).toHaveProperty('value', '');
    expect(onSearch).not.toHaveBeenCalled();
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

  it('portals the panel into the enclosing <dialog>, not document.body, so it stays inside that dialog\'s top-layer promotion instead of rendering behind it', () => {
    const dialog = document.createElement('dialog');
    // A closed <dialog> (no `open` attribute) is display:none per the UA
    // stylesheet — its content wouldn't be in the accessibility tree at all.
    dialog.setAttribute('open', '');
    document.body.appendChild(dialog);
    const { unmount } = render(<SearchSelect value="" options={OPTIONS} onSelect={vi.fn()} />, { container: dialog });

    fireEvent.click(screen.getByRole('button'));

    expect(dialog.querySelector('.lxn-search-select-panel')).toBeTruthy();
    // Not a direct child of document.body outside the dialog — proves the
    // portal target really is the dialog, not the document.body fallback.
    expect(Array.from(document.body.children)).not.toContain(document.querySelector('.lxn-search-select-panel'));

    unmount();
    dialog.remove();
  });

  it('falls back to document.body when there is no enclosing <dialog>', () => {
    render(<SearchSelect value="" options={OPTIONS} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    const panel = document.querySelector('.lxn-search-select-panel');
    expect(panel).toBeTruthy();
    expect(panel!.closest('dialog')).toBeFalsy();
  });

  it('scrolling the panel\'s own option list, or the page, never closes it — it chases the anchor instead of dismissing', () => {
    render(<SearchSelect value="" options={OPTIONS} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    const list = document.querySelector('.lxn-search-select-list')!;

    fireEvent.scroll(list);
    expect(screen.getByText('Frodo Baggins')).toBeTruthy();

    fireEvent.scroll(window);
    expect(screen.getByText('Frodo Baggins')).toBeTruthy();
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
