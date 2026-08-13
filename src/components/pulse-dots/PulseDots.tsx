import './pulse-dots.css';

type PulseDotsProps = {
  className?: string;
  'aria-label'?: string;
};

// Three-dot loading pulse — pulled out of lxn-pdf-generator's offer-sheet
// preview pane (.pulse-dots / @keyframes pulse-dot), which used it to fill
// the preview panel while a PDF regenerates. This is just the indicator
// itself, not the "Generating preview…" copy that sat next to it there —
// lxn-ui doesn't own any consumer's loading copy, same reasoning as
// StatusBadge not owning status vocabulary.
export function PulseDots({ className, 'aria-label': ariaLabel = 'Loading' }: PulseDotsProps) {
  const classes = ['lxn-pulse-dots', className || ''].filter(Boolean).join(' ');

  return (
    <span className={classes} role="status" aria-label={ariaLabel}>
      <span />
      <span />
      <span />
    </span>
  );
}
