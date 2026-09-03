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
