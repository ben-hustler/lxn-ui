# lxn-ui

Shared UI for LXN's webcomp repos (`appraisal-offer`, `appraisal-customer`, and
others as they come online) — components and design tokens that were
previously being hand-recreated, slightly differently, in each webcomp's own
`src/`. This repo is the single place those live now.

There is no registry, no publish step, no build step. This is a personal /
small-team stopgap, not company infra — see "Why it's built this way" below
before assuming standard npm-package conventions apply.

## What's in here

```
src/
  components/     Lit/React-agnostic-where-possible UI pieces (e.g. tooltip)
  tokens/         Shared design tokens — CSS custom properties, not JS.
                  tokens.css: colors, type scale, spacing, radii, shadows,
                  motion, layout, plus the .lxn-* semantic classes (see
                  "Using the design tokens" below). fonts/: the Roboto .ttf
                  files tokens.css's @font-face rules point at.
  index.ts        Barrel file — the ONLY things exported from here are
                  public API. If it's not re-exported from index.ts, treat
                  it as private, even if nothing technically stops an
                  import reaching in directly.
sandbox/          Local dev harness. See "Developing components" below.
```

## What this is for

Each webcomp currently hand-approximates LXN's Bubble styling independently
(see `lxn-pdf-generator`'s Tippy.js clone vs. `appraisal-offer`'s
`InfoTooltip.tsx` — same visual intent, two different implementations, two
different sets of bugs). `lxn-ui` exists so that work happens once, gets
consumed everywhere, and there's one place to fix it when it's wrong.

If you're an agent working in a webcomp repo and you're about to write a
tooltip, a color value, a spacing value, or anything else that looks like it
should be "the LXN standard" version of something — check here first. If
it's not here yet, that's a signal to bring it here, not to re-approximate it
locally again.

## Component usage gotchas

- **`<Tooltip>` is focusable on purpose (keyboard-accessible reveal, not just
  hover) — don't nest it inside a `<label>` associated with a different form
  control.** A focusable element inside such a label competes with the
  label's native "click anywhere → focus the input" behavior. Hit this for
  real in `appraisal-customer`'s Phone/Email "i" icons (2026-08-06): the icon
  was inside the same `<label>` as the input, and clicking it stopped
  reliably focusing the input. Fix was in the consumer — make `<Tooltip>` a
  sibling of the `<label>`, not a descendant — not a change to `Tooltip`
  itself; this is a general "don't nest focusable things in an unrelated
  label" hazard, not something specific to this component. See the comment
  above `tabIndex` in `Tooltip.tsx`.

## Using the design tokens

`src/tokens/tokens.css` is the canonical source for LXN's colors, type scale,
spacing, radii, shadows, motion, and layout values, plus the `Roboto`
`@font-face` declarations and physical `.ttf` files. A consumer pulls in the
whole thing with one import, early in its entry point (before any component
CSS that relies on these variables):

```ts
import "lxn-ui/src/tokens/tokens.css";
```

**Look here first — before writing a color, a radius, a shadow, a font size,
or a heading/label style by hand.** This file also ships ready-to-use
semantic classes (`.lxn-h1`...`.lxn-h6`, `.lxn-b1`...`.lxn-b3`,
`.lxn-l1`...`.lxn-l4`, `.lxn-body`, `.lxn-label`, `.lxn-eyebrow`, `.lxn-mono`,
`.lxn-n1`...`.lxn-n5`, `.lxn-root`) that already combine the right
font/weight/line-height/color for a given piece of UI. **If you're a
developer or an agent about to hand-compose a `font:`/`color:` declaration
from raw custom properties, check whether one of these classes already is
the thing you're building first** — using it (instead of re-deriving the
same combination locally, slightly differently, in yet another component)
is the entire point of tokens living here instead of in each webcomp.
Reach for a raw `var(--token)` only when no semantic class fits (e.g. a
one-off border color, a background on a non-text element).

**Canonical names only — no legacy aliases.** `lxn-ui` starts fresh with no
consumers of its own yet, so unlike the original LXN Design System export
this was ported from, back-compat aliases were deliberately dropped rather
than carried forward. If you're migrating code that still references one of
these, here's where it landed:

| Dropped (legacy) | Use instead |
|---|---|
| `--lxn-ink-*` (900...100, 50) | `--lxn-neutral-*` (900...100, 50) — same numbering, `--lxn-white` still exists as its own canonical token |
| `--lxn-ink-150` | `--lxn-neutral-150` |
| `--lxn-teal-900/800/700/600/400/10` | `--lxn-accent-deep-teal` / `-blue-teal` / `-teal` / `-muted-teal` / `-light-teal` / `-tint` |
| `--lxn-primary-600/500/400/300/50` | `--lxn-primary-800` / `-800` / `-700` / `-200` / `-100` (the 5-stop scale: 900/800/700/200/100) |
| `--radius-xs` / `-lg` / `-xl` | `--radius-sm` / `--radius-md` / `--radius-md` |
| `--font-family-mono` / `-condensed` | `--font-family-sans` (Roboto is the only face) |
| `--font-size-body` / `-label` | `--font-size-b2` / `--font-size-l3` |
| `--color-danger` / `-danger-bg` | `--color-negative` / `--color-negative-bg` |
| `--color-data-violet/indigo/blue/teal/green` | `--color-data-customer/disclosures/inspection/appraisal/offer` |
| `--color-status-expired-border` | removed, unused (previous "expired" was outlined; current design isn't) |

One deliberate value change from the original export: `--color-status-open-fg`
is white (`--lxn-neutral-10`), not black. The export had switched it to black
or better contrast on the mustard background, but white is what matches the
live Bubble app — treat white as correct here.

## Why it's built this way (no registry, no build step)

- **No registry.** LXN doesn't have one yet, and setting one up isn't this
  repo owner's call to make unilaterally — see the git-dependency mechanism
  below. This is designed to be trivially migratable to a real registry or a
  monorepo later without changing any consumer's `import` statements.
- **No build step.** Every current consumer (`appraisal-offer`, etc.) already
  compiles TypeScript/JSX through its own Vite bundler. `package.json`'s
  `"main"` points straight at `src/index.ts` — raw source, no `dist/`. The
  consumer's own bundler compiles it as if it were local code. Do not add a
  build/`dist` step to this package unless every consumer stops being able to
  compile TS/JSX itself — it would only add a "did anyone rebuild dist"
  failure mode for zero benefit today.
- **React is a `peerDependency`, not a `dependency`.** This package does not
  ship its own copy of React — it expects the consumer to already have one,
  so there's exactly one React instance in the final bundle, not two. Do not
  move `react`/`react-dom` into `dependencies`.

## How consumers install this (git dependency, no registry)

A consumer's `package.json` depends on an **exact git tag**, not a version
range:

```json
"dependencies": {
  "lxn-ui": "github:ben-hustler/lxn-ui#v0.1.0"
}
```

`npm install` clones this repo at that exact tag. `package-lock.json` then
records the **resolved commit SHA** that tag pointed to at install time —
that SHA, not the tag name, is what every future `npm ci`/`npm install`
actually reinstalls, even if the tag later gets force-moved. This is
intentional and is not a bug to "fix":

- **Do not** use a `#semver:<range>` spec (e.g. `#semver:^0.1.0`) unless
  explicitly asked to. It would let consumers silently pick up a new tag on
  a fresh install with no review step — the whole point of pinning an exact
  tag is that nothing changes until someone deliberately repeats the install
  command below with a new tag name.
- **Do not** run `npm update lxn-ui` (or a bare `npm update`) assuming it's
  inert against an exact git-tag pin — it isn't. Unlike `npm install`/`npm
  ci`, which trust the SHA already recorded in `package-lock.json` and never
  contact the remote, `npm update` actively re-resolves git dependencies
  against the remote on every run (verified directly: it took ~3s of real
  network time against this repo, not an instant no-op). A tag name is a
  mutable ref as far as npm is concerned — if `v0.2.0` (or any tag) were
  ever force-moved to a different commit, `npm update lxn-ui` would silently
  follow it and rewrite the lockfile's resolved SHA, with no new tag name
  and no review step. It only *looks* like a no-op today because no
  published tag has ever been force-moved. The actual safeguard is
  discipline, not tooling: **never force-move a published tag** — cut a new
  one for any change, per "Releasing a new version" below. Pinning to a raw
  commit SHA instead of a tag name (`#<full-sha>`) would close this gap
  completely, at the cost of a human-unreadable dependency spec; not done
  here, but worth knowing as the harder-guarantee option.

## Releasing a new version (do this in `lxn-ui`)

1. Make the change, commit it.
2. Bump + tag: `npm version patch` (or `minor`/`major`) — this reads the
   current version from `package.json`, bumps it, commits that bump, and
   creates a matching git tag, in one step. (Equivalent manual form:
   edit `package.json`'s `"version"` yourself, commit, then
   `git tag vX.Y.Z`.)
3. `git push && git push --tags` — pushing commits and pushing tags are
   separate actions in git; `git push` alone does **not** push tags.
4. Only bump the **major** version for an intentionally breaking change to
   something already exported from `index.ts`. This repo is pre-1.0
   (`0.x.y`), so per semver/npm caret rules the "protected" digit right now
   is the **minor** number, not the major — i.e. a consumer's hypothetical
   `^0.1.0` range would auto-take `0.1.1` but not `0.2.0`. Don't rely on this
   as a safety net for actual consumers (they're pinned to exact tags, this
   doesn't affect them) — it only matters if `#semver:` ranges are ever
   introduced later.

## Picking up a new version (do this in the consumer repo, e.g. `appraisal-offer`)

There is no `npm update` shortcut (see above). Re-specify the exact tag:

```
npm install github:ben-hustler/lxn-ui#v0.2.0
```

This rewrites both the dependency line in `package.json` and the resolved
SHA in `package-lock.json`. Do this deliberately, as its own change — don't
bundle a version bump into an unrelated commit, since it's the one point
where a consumer is actually exposed to whatever changed upstream.

## Developing components (the sandbox)

`npm run dev` inside this repo starts a Vite dev server (port 5499) that
mounts real components from `src/` against sample content defined in
`sandbox/Sandbox.tsx` — nothing in `sandbox/` is exported, built, or shipped
to consumers; it exists purely so components can be built and iterated on
without needing any consumer repo checked out. Add new components' sample
usage to `sandbox/Sandbox.tsx` as they're built.

## Testing a change against a real consumer before tagging a release

Use `npm link`, **not** a `file:` dependency, to check a work-in-progress
change against real usage (e.g. the tooltip inside `appraisal-offer`'s
`OfferModal`) before committing to a release:

```
cd lxn-ui && npm link
cd ../appraisal-offer && npm link lxn-ui
```

This swaps `appraisal-offer/node_modules/lxn-ui` to a symlink pointing at
your local `lxn-ui` checkout — live, no reinstall needed as you edit. It
does **not** touch `appraisal-offer`'s `package.json` or
`package-lock.json` — those still declare the real tagged dependency the
entire time, so there is nothing to remember to revert before committing or
deploying. A prod build / CI / a teammate's checkout runs `npm ci` from the
committed lockfile and never sees the symlink.

`npm install file:../lxn-ui` is a different mechanism — it **rewrites**
`package.json`/`package-lock.json` to point at the local path, which is a
real, committable, push-able mistake if left in place. Prefer `npm link` for
this kind of check; if `file:` is used anyway, treat undoing it
(`npm install`, no args, to restore the real dependency) as a required step
before any commit, not an optional cleanup.

### Required config on the consumer side while linked (Vite + Vitest)

A `react`/`react-dom` peer dependency reached via a symlink is not resolved
the same way by every tool in the chain — each of these was a real failure,
not a precaution, when wiring up `appraisal-offer`/`appraisal-customer`:

- **`vite.config.ts`** needs `resolve.preserveSymlinks: true` and
  `resolve.dedupe: ["react", "react-dom"]`. Without it, Vite resolves the
  symlink to its real path and looks for `react` starting from `lxn-ui`'s
  own `node_modules` — a second React instance, "invalid hook call."
- **`vite.config.ts`** also needs `optimizeDeps.exclude: ["lxn-ui"]`.
  Without it, Vite pre-bundles `lxn-ui` into
  `node_modules/.vite/deps/lxn-ui.js` and the browser caches that response
  with an immutable `Cache-Control` header. The cache-busting `?v=` on that
  URL is keyed off the lockfile hash, not the linked package's actual
  source, so editing `lxn-ui` through the symlink changes nothing the
  browser thinks it needs to refetch — a real edit silently doesn't show up
  even after restarting the dev server and deleting `node_modules/.vite`.
  If this bites you anyway (e.g. the exclude was added after the browser
  already cached a pre-linked bundle), a hard reload
  (Ctrl+Shift+R / DevTools → Network → "Disable cache") clears it.
- **`vitest.config.ts` is a separate config from `vite.config.ts`** — it
  does not inherit anything from it. It needs the same
  `preserveSymlinks`/`dedupe`, **plus** two things Vite's dev server
  doesn't need because `optimizeDeps` handles them implicitly:
  - `test.server.deps.inline: ["lxn-ui"]` — Vitest externalizes real
    `node_modules` packages by default (a plain Node `require()`, which
    ignores `resolve.dedupe`/`preserveSymlinks` entirely, since those are
    Vite-plugin-level, not real Node behavior). Without inlining, `lxn-ui`
    resolves its own `react` import against its own `node_modules` no
    matter what `dedupe` says.
  - `plugins: [react()]` (the same `@vitejs/plugin-react` `vite.config.ts`
    already has) — without it, esbuild's automatic-JSX transform is only
    applied to files inside *this* project's own tsconfig scope. A
    component reached via the symlink is outside that scope, so it falls
    back to the classic JSX runtime and throws `React is not defined`
    (there's no `React` global under the automatic runtime — that's by
    design, not a missing import to add).
- If a fix here doesn't seem to take effect, clear `node_modules/.vite`
  before concluding the config is wrong — Vite/Vitest cache dependency
  resolution, and rapid config edits can be masked by a stale cache
  reporting the previous failure.

Once a consumer moves off `npm link` onto the real tagged dependency, only
some of this stops being needed — don't strip all of it reflexively:

- `resolve.preserveSymlinks` / `resolve.dedupe` in **both** configs — safe
  to remove. These existed purely because the symlink pulled in `lxn-ui`'s
  own `node_modules` (its sandbox's `react` copy, a `devDependency`).
  `devDependencies` never get installed for a package consumed *as* a
  dependency, so a real `npm install github:...#vX.Y.Z` never creates
  `node_modules/lxn-ui/node_modules` at all — the duplicate-React path this
  guarded against can't happen anymore.
- `optimizeDeps.exclude: ["lxn-ui"]` in `vite.config.ts` — safe to remove.
  It only guarded against the symlink's content changing without the
  lockfile changing. A real install bumps the lockfile on every version
  change, which busts the browser's cache correctly on its own.
- `plugins: [react()]` and `test.server.deps.inline: ["lxn-ui"]` in
  `vitest.config.ts` — **keep, permanently.** These solve a different,
  unrelated problem: `lxn-ui` ships raw, uncompiled `.tsx` source with no
  build step, by design (see "Why it's built this way" above) — true
  whether it arrived via a symlink or a real git install. Vitest still
  needs telling not to externalize it (raw TS/JSX can't survive a plain
  Node `require()`), and esbuild still needs the plugin to apply
  automatic-JSX outside this project's own tsconfig scope.

To undo a link and restore the real installed dependency: `npm install`
(no arguments) in the consumer repo.
