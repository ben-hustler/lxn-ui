# lxn-ui Patterns

`tokens.css` defines *what* values exist. This file is the softer layer on top —
*when* to reach for which one. These are conventions inferred from the real Bubble
UI and from mistakes agents have already made building this library. Nothing here
is enforced by types or lint; use judgment, and add to this file when you spot a
new one.

## Patterns

- **Borders are for controls, not containers.** Small interactive elements
  (inputs, search bars, pills, dropdown triggers/panels) get a hairline border.
  Large static content surfaces (cards, section backgrounds, page panels) don't —
  they separate from the background with `box-shadow` and/or a background-color
  shift instead. Seen going wrong in `sandbox/sandbox.css`'s `.lxn-swatch`, which
  borders a large flat tile the way a control would be bordered.

- **Use semantic tokens/classes, not raw scales or hand-rolled values.** Reach
  for `--color-*`/`--radius-*`/`--space-*` and the `.lxn-h1`–`.lxn-h6`/`.lxn-b*`/
  `.lxn-l*`/`.lxn-n1`–`.lxn-n5` type classes — not `--lxn-primary-*`/`--lxn-neutral-*`,
  a bare hex, an unverified token name, or a hand-composed `font-size`/`font-weight`.
  Seen going wrong: a shipped webcomp using `--color-fg-danger` (doesn't exist —
  it's `--color-error`) and a KPI tile hand-rolling `font-size: 28px; font-weight: 700`
  instead of `.lxn-n1`. If nothing semantic fits, stop and ask the user rather than
  going custom.

- **Floating panels on iOS: anchor in document coordinates, open below, don't
  focus() from taps.** (2026-09-25, found on-device with SingleSelect/MultiSelect/
  DateRangePicker.) A `position: fixed` panel that JS keeps moving on scroll
  drifts off its trigger once the iOS keyboard opens, and lags behind touch
  scrolling. Use `position: absolute` against the containing block and always
  open below (see SingleSelect.tsx's `reposition()`). An input `focus()` called
  inside a tap handler raises the keyboard; one called from a rAF doesn't. Pick
  deliberately, and skip "keep focus in the input" refocusing on touch.

- **Lists people tap through quickly: use `useTouchTap`, not `onClick`.** On
  iOS, a fast second tap on a neighbouring row gets its compatibility click
  sent to the *previous* row (confirmed with an on-device event log;
  `touch-action: manipulation` doesn't fix it). `useTouchTap`
  (src/components/touch-tap) fires on touch release and drops the stray click.
  Also: no default "highlight the first row" on touch. With no arrow keys it
  just reads as a stray pre-selection.
