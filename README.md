# lxn-ui

Shared UI for LXN's webcomp repos (`appraisal-offer`, `appraisal-customer`,
and others as they come online). This repo is now split across three
branches with different jobs — read this before assuming `main` is "the"
branch to install from, because as of 2026-08-11 it isn't.

## Branch model

- **`main`** — the shared, branch-agnostic base. Non-visual logic only:
  right now that's just `useFocusTrap`. Nothing here is released or
  installed directly by a consumer.
- **`bubble-inspired`** — the look that matches the live Bubble app /
  disc-webcomp precedent (crisp, dense, small radii, 32px control baseline).
  Continuation of what this repo looked like before the split.
- **`mobile-inspired`** — a new visual direction requested by the project
  lead, informed by (not pixel-matched to) a Claude-generated mobile mockup.
  Bigger radii, pill-shaped icon affordances, roomier spacing. Built fresh
  starting 2026-08-11.

**Each flavor branch is fully self-contained.** `tokens.css` (colors, type,
radii, spacing, shadows, motion, fonts) and every visual component
(`ButtonMain`, `CloseButton`, `Tooltip`) are duplicated per branch, not
shared from `main` — including the color values, even though those are
currently identical between the two flavors. This was a deliberate choice:
neither flavor branch depends on `main` for anything that affects how it
looks, so either can be developed, tagged, and installed with zero
knowledge of the other.

Only genuinely non-visual, behavior-only code (`useFocusTrap` today; future
headless hooks if any) lives on `main` and gets pulled into both flavor
branches when it changes.

## Installing a specific flavor

There is no unversioned/default install — a consumer always picks a flavor
explicitly, by tag:

```json
"dependencies": {
  "lxn-ui": "github:ben-hustler/lxn-ui#bubble-v0.4.2"
}
```

or

```json
"dependencies": {
  "lxn-ui": "github:ben-hustler/lxn-ui#mobile-v0.1.0"
}
```

**Tag naming:** `bubble-vX.Y.Z` / `mobile-vX.Y.Z`, cut directly off their
respective branches (no more un-prefixed `vX.Y.Z` tags — those predate the
split and stay as historical markers into `bubble-inspired`'s pre-split
history). See "Releasing a new version" below — the git-tag-dependency and
lockfile-SHA mechanics are unchanged from before the split; only the tag
naming and which branch you tag from changes.

**Parity intent:** the two flavors aim to stay in version lockstep and
export an identical public surface (same component names, same props, same
class hooks) so a consumer can switch flavors by changing only the tag in
`package.json` — no code changes. "Same interface" means same contract, NOT
same pixel dimensions: `CloseButton` is a fixed 36px square on
`bubble-inspired` and a 44px circle on `mobile-inspired`, same props either
way. A branch only gets tagged once it has full component parity with the
other — never release a flavor that's missing something the other flavor
already ships, or "switch flavors, no code changes" stops being true.
Lockstep on version *numbers* is a goal, not a hard rule: an urgent
single-branch hotfix is allowed to ship without waiting on the other flavor,
at the cost of the two branches' version numbers briefly drifting.

## ⚠️ Do not `git merge main` into a flavor branch

`main`'s history diverged from the flavor branches at the 2026-08-11 split,
at which point `main` had its visual components and tokens *deleted* (they
moved to being self-contained per-branch instead). A flavor branch never
touched those same paths after the split, which means a plain 3-way
`git merge main` into `bubble-inspired` or `mobile-inspired` would see
"unchanged on my side, deleted on main's side" for e.g. `ButtonMain.tsx` —
and a 3-way merge takes the side that changed. **It would silently delete
your flavor branch's own components.**

To pull a shared-logic change (e.g. a `useFocusTrap` bugfix) from `main`
into a flavor branch, use one of these instead:

```
git cherry-pick <commit-sha-from-main>
```

or, for a path-scoped pull that doesn't care about commit boundaries:

```
git checkout main -- src/components/focus-trap
git commit -m "Pull useFocusTrap fix from main"
```

Never `git merge main` (or `git rebase main`) into a flavor branch.

## What's in here (per flavor branch; `main` only has the first two)

```
src/
  components/
    focus-trap/     useFocusTrap — SHARED, lives on main, pulled via cherry-pick
    button-main/     ButtonMain — forked, branch-specific look
    close-button/   CloseButton — forked, branch-specific look
    tooltip/        Tooltip + TooltipController — forked, branch-specific look
  tokens/           tokens.css + fonts/ — forked, branch-specific look
                     (values only — token NAMES stay the same across
                     branches: --radius-sm exists on both, just resolves to
                     a different px)
  index.ts          Barrel file — the ONLY things exported from here are
                     public API.
sandbox/            Local dev harness. `main`'s sandbox only demos
                     useFocusTrap; each flavor branch's sandbox demos its
                     own full component set.
```

## What this is for

Each webcomp currently hand-approximates LXN's Bubble styling independently
(see `lxn-pdf-generator`'s Tippy.js clone vs. `appraisal-offer`'s
`InfoTooltip.tsx` — same visual intent, two different implementations, two
different sets of bugs). `lxn-ui` exists so that work happens once per
flavor, gets consumed everywhere, and there's one place to fix it when it's
wrong.

If you're an agent working in a webcomp repo and you're about to write a
tooltip, a color value, a spacing value, or anything else that looks like it
should be "the LXN standard" version of something — check the relevant
flavor branch first. If it's not there yet, that's a signal to bring it
there, not to re-approximate it locally again.

## Why it's built this way (no registry, no build step)

- **No registry.** LXN doesn't have one yet, and setting one up isn't this
  repo owner's call to make unilaterally. This is designed to be trivially
  migratable to a real registry or a monorepo later without changing any
  consumer's `import` statements.
- **No build step.** Every current consumer already compiles
  TypeScript/JSX through its own Vite bundler. `package.json`'s `"main"`
  points straight at `src/index.ts` — raw source, no `dist/`.
- **React is a `peerDependency`, not a `dependency`.** Do not move
  `react`/`react-dom` into `dependencies`.

## How consumers install this (git dependency, no registry)

A consumer's `package.json` depends on an **exact git tag**, not a version
range — see "Installing a specific flavor" above for the current
`bubble-v*`/`mobile-v*` tag format. `npm install` clones this repo at that
exact tag; `package-lock.json` then records the **resolved commit SHA**
that tag pointed to at install time — that SHA, not the tag name, is what
every future `npm ci`/`npm install` actually reinstalls, even if the tag
later gets force-moved.

- **Do not** use a `#semver:<range>` spec unless explicitly asked to.
- **Do not** run `npm update lxn-ui` (or a bare `npm update`) assuming it's
  inert against an exact git-tag pin — it isn't; it actively re-resolves
  against the remote. Never force-move a published tag — cut a new one for
  any change.

## Releasing a new version (do this on a flavor branch, never on `main`)

1. `git switch bubble-inspired` (or `mobile-inspired`).
2. Make the change, commit it.
3. Bump `package.json`'s `"version"`, commit, then tag with the flavor
   prefix: `git tag bubble-v0.5.0` (not `npm version`'s default — it doesn't
   know about the prefix, so tag by hand rather than relying on it).
4. `git push && git push --tags`.
5. Try to do the same version bump on the other flavor branch around the
   same time (parity intent, above) — but don't block an urgent fix on it.

## Picking up a new version (do this in the consumer repo)

Re-specify the exact flavor tag:

```
npm install github:ben-hustler/lxn-ui#bubble-v0.5.0
```

## Developing components (the sandbox)

`npm run dev` inside this repo starts a Vite dev server (port 5499)
against whichever branch is currently checked out. Nothing in `sandbox/` is
exported, built, or shipped to consumers.

**Switching flavors locally:** since there's no build step, `git switch
bubble-inspired` / `git switch mobile-inspired` on your local checkout
changes what an `npm link`'d consumer sees live, same as any other file
edit. Commit or stash before switching. A branch switch changes many files
at once — smoke-test that Vite's dev server actually picks that up (HMR or
a clean reload) rather than assuming it from single-file-edit behavior.

## Testing a change against a real consumer before tagging a release

Use `npm link`, **not** a `file:` dependency:

```
cd lxn-ui && npm link
cd ../appraisal-offer && npm link lxn-ui
```

### Required config on the consumer side while linked (Vite + Vitest)

- **`vite.config.ts`** needs `resolve.preserveSymlinks: true`,
  `resolve.dedupe: ["react", "react-dom"]`, and
  `optimizeDeps.exclude: ["lxn-ui"]`.
- **`vitest.config.ts`** (separate from `vite.config.ts`, doesn't inherit
  from it) needs the same `preserveSymlinks`/`dedupe`, plus
  `test.server.deps.inline: ["lxn-ui"]` and `plugins: [react()]`.
- Clear `node_modules/.vite` if a fix doesn't seem to take effect.

To undo a link and restore the real installed dependency: `npm install`
(no arguments) in the consumer repo.
