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
  tokens/         Shared design tokens (colors, spacing, type scale) — CSS
                  custom properties, not JS. Empty right now (.gitkeep only)
                  — nothing has been ported in here yet.
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
- **Do not** run `npm update lxn-ui` expecting it to fetch a newer tag. It
  is a no-op against an exact git-tag pin — there is no range for it to
  re-resolve within. (If you're ever asked to make `npm update` work
  generically for this package, that's the `#semver:` switch above — flag
  the version-drift tradeoff above before doing it.)

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

To undo a link and restore the real installed dependency: `npm install`
(no arguments) in the consumer repo.
