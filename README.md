# lxn-ui

Shared UI for LXN's webcomp repos (`appraisal-offer`, `appraisal-customer`,
and others as they come online). `main` is the one branch — install from
it.

## History: the flavor-branch experiment (2026-08-11, retired same day)

For part of one day this repo was split into `bubble-inspired` (the look
matching the live Bubble app) and `mobile-inspired` (a bigger-radius,
pill-shaped direction informed by a Claude-generated mobile mockup). The
idea was to let `appraisal-customer` opt into a more mobile-native shape
language while `appraisal-offer` kept the desktop one.

It was retired the same day: every one of `mobile-inspired`'s shape
deviations (radii scale, icon-only `ButtonMain` shape, `CloseButton` shape)
got reverted back to `bubble-inspired`'s values once it became clear the
mockup's big-radius/pill-heavy aesthetic doesn't apply to either of this
repo's actual consumers — both are desktop surfaces embedded in Bubble, not
native mobile apps. What was left different (a few px of `ButtonMain`
padding, `Tooltip`'s corner radius) wasn't worth maintaining two branches
over, so `bubble-inspired`'s content became `main` outright, and both flavor
branches were deleted. If a real mobile consumer shows up later, that's the
time to fork again — with an actual reason, not a standing "just in case"
branch that sits there implying a difference which no longer exists.

The mockup itself is still worth mining for **information architecture and
interaction ideas** (card groupings, confirm-before-destructive flows,
Find/Create structure) on the consumer side — just not for shape language
here.

## What's in here

```
src/
  components/
    focus-trap/      useFocusTrap
    button-main/      ButtonMain — main CTA button (primary/secondary/tertiary/danger)
    button-card/     ButtonCard — compact in-card row button (primary/danger only)
    close-button/    CloseButton
    confirm-popover/ ConfirmPopover
    tooltip/         Tooltip + TooltipController
  tokens/            tokens.css + fonts/
  index.ts           Barrel file — the ONLY things exported from here are
                      public API.
sandbox/             Local dev harness — demos the full component set.
```

## What this is for

Each webcomp currently hand-approximates LXN's Bubble styling independently
(see `lxn-pdf-generator`'s Tippy.js clone vs. `appraisal-offer`'s
`InfoTooltip.tsx` — same visual intent, two different implementations, two
different sets of bugs). `lxn-ui` exists so that work happens once, gets
consumed everywhere, and there's one place to fix it when it's wrong.

If you're an agent working in a webcomp repo and you're about to write a
tooltip, a color value, a spacing value, or anything else that looks like it
should be "the LXN standard" version of something — check `main` here
first. If it's not there yet, that's a signal to bring it there, not to
re-approximate it locally again.

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

A consumer's `package.json` depends on an **exact git tag** off `main`, not
a version range:

```json
"dependencies": {
  "lxn-ui": "github:ben-hustler/lxn-ui#v1.0.0"
}
```

`npm install` clones this repo at that exact tag; `package-lock.json` then
records the **resolved commit SHA** that tag pointed to at install time —
that SHA, not the tag name, is what every future `npm ci`/`npm install`
actually reinstalls, even if the tag later gets force-moved.

**Tag naming:** plain `vX.Y.Z` off `main`. (The `bubble-v*`/`mobile-v*`
prefixed tags from the brief flavor-branch split above are historical —
still resolvable, but nothing should newly depend on them.)

- **Do not** use a `#semver:<range>` spec unless explicitly asked to.
- **Do not** run `npm update lxn-ui` (or a bare `npm update`) assuming it's
  inert against an exact git-tag pin — it isn't; it actively re-resolves
  against the remote. Never force-move a published tag — cut a new one for
  any change.

## Releasing a new version

1. `git switch main`.
2. Make the change, commit it.
3. Bump `package.json`'s `"version"`, commit, then tag it by hand:
   `git tag v1.1.0` (not `npm version`'s default — tag by hand rather than
   relying on it).
4. `git push && git push --tags`.

## Picking up a new version (do this in the consumer repo)

Re-specify the exact tag:

```
npm install github:ben-hustler/lxn-ui#v1.1.0
```

## Developing components (the sandbox)

`npm run dev` inside this repo starts a Vite dev server (port 5499).
Nothing in `sandbox/` is exported, built, or shipped to consumers.

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
