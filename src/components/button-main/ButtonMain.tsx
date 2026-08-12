import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './button-main.css';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type Size = 'large' | 'small' | 'wide';

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> & {
  variant?: Variant;
  /** large = primary CTA emphasis, small = secondary/inline emphasis, wide = large's
   * padding/font plus a 300px min-width, for a button whose own text is short but should
   * still read as a prominent, roomy CTA (e.g. Accept). Padding-driven, no explicit height —
   * actual px per size is a branch-specific CSS concern (button-main.css), not part of this
   * component's contract. */
  size?: Size;
  fullWidth?: boolean;
  /** Disables the button and swaps in `loadingLabel` (if given) for the duration. No spinner. */
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
};

// Shape (text button vs. icon-only) is derived from whether `label` is
// given, not a separate prop — an icon-only button needs `aria-label` since
// it has no visible text for a screen reader to fall back on. Icon-only
// buttons render square on both branches (button-main.css) — the mobile-
// inspired circular fork was reverted 2026-08-11; see that file's own
// comment.
type IconPosition = 'leading' | 'trailing';

type ButtonMainProps =
  | (BaseProps & { label: string; icon?: ReactNode; iconPosition?: IconPosition })
  | (BaseProps & { label?: undefined; icon: ReactNode; iconPosition?: IconPosition; 'aria-label': string });

export function ButtonMain(props: ButtonMainProps) {
  const {
    variant = 'primary',
    size = 'large',
    fullWidth = false,
    loading = false,
    loadingLabel,
    disabled = false,
    label,
    icon,
    iconPosition = 'leading',
    className,
    type = 'button',
    ...rest
  } = props;

  const iconOnly = !label;
  const text = label ? (loading ? loadingLabel ?? label : label) : undefined;

  const classes = [
    'lxn-btn-main',
    `lxn-btn-main--${variant}`,
    `lxn-btn-main--${size}`,
    iconOnly ? 'lxn-btn-main--icon-only' : '',
    fullWidth ? 'lxn-btn-main--full-width' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const iconEl = icon ? <span className="lxn-btn-main-icon">{icon}</span> : null;
  const textEl = text ? <span className="lxn-btn-main-label">{text}</span> : null;

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {/* Default leading (icon before label) — matches ButtonCard's fixed
       * order ("<icon> History", "<icon> Remove", etc.). Pass
       * iconPosition="trailing" for the text-then-icon reading (e.g. "View
       * Offer <icon>"). No-op when there's no icon or no label. */}
      {iconPosition === 'trailing' ? (
        <>
          {textEl}
          {iconEl}
        </>
      ) : (
        <>
          {iconEl}
          {textEl}
        </>
      )}
    </button>
  );
}
