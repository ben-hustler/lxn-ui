import type { ButtonHTMLAttributes, ReactNode } from 'react';
import '../button-main/button-main.css';
import './button-card.css';

type Variant = 'primary' | 'danger';
type Size = 'large' | 'small' | 'wide';

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
};

type ButtonCardProps =
  | (BaseProps & { label: string; icon?: ReactNode })
  | (BaseProps & { label?: undefined; icon: ReactNode; 'aria-label': string });

// A second, deliberately smaller button "kind" alongside ButtonMain — for
// compact, contained-in-a-card row actions (History/Edit/Remove on a
// customer/detail card), not main CTAs. Only two variants exist because
// that's all a card action needs: a neutral one and a destructive one.
// Reuses ButtonMain's base sizing/shape rules (button-main.css's
// `.lxn-btn-main`/`.lxn-btn-main--{size}`) so paddings/radius/icon+label
// layout stay in lockstep automatically — only the color pairing is new,
// in button-card.css.
export function ButtonCard(props: ButtonCardProps) {
  const {
    variant = 'primary',
    size = 'small',
    fullWidth = false,
    loading = false,
    loadingLabel,
    disabled = false,
    label,
    icon,
    className,
    type = 'button',
    ...rest
  } = props;

  const iconOnly = !label;
  const text = label ? (loading ? loadingLabel ?? label : label) : undefined;

  const classes = [
    'lxn-btn-main',
    `lxn-btn-card--${variant}`,
    `lxn-btn-main--${size}`,
    iconOnly ? 'lxn-btn-main--icon-only' : '',
    fullWidth ? 'lxn-btn-main--full-width' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {icon ? <span className="lxn-btn-main-icon">{icon}</span> : null}
      {text ? <span className="lxn-btn-main-label">{text}</span> : null}
    </button>
  );
}
