import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ButtonMainSplit, type ButtonMainMenuItem } from './ButtonMainSplit';
import './button-main.css';

export type { ButtonMainMenuItem } from './ButtonMainSplit';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type Size = 'large' | 'small' | 'xs' | 'wide';

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> & {
  variant?: Variant;
  /** large = primary CTA emphasis, small = secondary/inline emphasis, xs = the shared
   * ~30px/13px/medium-weight target `StatusBadge`/`FilterChip`/the compact Single/MultiSelect
   * trigger all converge on (2026-09-08 — first consumer: Internal Comps' Filter button), wide =
   * large's padding/font plus a 300px min-width, for a button whose own text is short but should
   * still read as a prominent, roomy CTA (e.g. Accept). Padding-driven, no explicit height —
   * actual px per size is a branch-specific CSS concern (button-main.css), not part of this
   * component's contract. */
  size?: Size;
  fullWidth?: boolean;
  /** Disables the button and swaps in `loadingLabel` (if given) for the duration. No spinner. */
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  /** Makes this an on/off toggle button (2026-09-08) — not a separate component or variant, any
   * ButtonMain can be configured this way regardless of size/variant. Sets `aria-pressed` (screen
   * readers announce the on/off state the same way a native toggle would) and applies the
   * `--pressed` visual (button-main.css) matching whichever variant is in use. First consumer:
   * Internal Comps' Filter button, reflecting whether its panel is currently open. */
  pressed?: boolean;
  /** Turns this into a split button (2026-10-13): the button itself still runs `onClick` (the
   * main action), and a chevron segment joined to its right edge opens a dropdown of these
   * secondary actions. Same option-on-ButtonMain approach as `pressed` — works with any
   * size/variant. Disabled/loading disables both segments. Omit or pass `[]` for a plain button. */
  menu?: ButtonMainMenuItem[];
  /** Accessible name for the chevron segment, which has no visible text. */
  menuLabel?: string;
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
    pressed,
    menu,
    menuLabel = 'More options',
    className,
    type = 'button',
    ...rest
  } = props;

  const iconOnly = !label;
  const text = label ? (loading ? loadingLabel ?? label : label) : undefined;

  const isSplit = !!menu && menu.length > 0;

  const classes = [
    'lxn-btn-main',
    `lxn-btn-main--${variant}`,
    `lxn-btn-main--${size}`,
    iconOnly ? 'lxn-btn-main--icon-only' : '',
    fullWidth && !isSplit ? 'lxn-btn-main--full-width' : '',
    isSplit ? 'lxn-btn-main--split-main' : '',
    pressed ? 'lxn-btn-main--pressed' : '',
    isSplit ? '' : className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const iconEl = icon ? <span className="lxn-btn-main-icon">{icon}</span> : null;
  const textEl = text ? <span className="lxn-btn-main-label">{text}</span> : null;

  const button = (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-pressed={pressed !== undefined ? pressed : undefined}
      {...rest}
    >
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

  if (!isSplit) return button;
  return (
    <ButtonMainSplit
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      menu={menu}
      menuLabel={menuLabel}
      className={className}
    >
      {button}
    </ButtonMainSplit>
  );
}
