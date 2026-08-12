# Future plans (not scheduled)

This file is for concrete plans that are worth writing down but not worth acting on
yet — mostly because `lxn-ui` itself is still a speculative bet (one real consumer
pair today: `appraisal-offer`/`appraisal-customer`, plus `lxn-doc-viewer` reading just
its tokens). Don't start any of this without checking in first; it's here so the
reasoning isn't lost, not as a queued task.

## Shared CDN-hosted webfont (Roboto), instead of each consumer embedding its own copy

**Status: deferred (2026-08-12).** Current behavior stays as-is for now.

### The problem this would solve

Every consumer that wants real Roboto (not a fallback system font) currently has to
either import `tokens.css` normally (letting Vite base64-inline the four `.ttf`
weights into its own build) or do something bespoke:

- `appraisal-offer` / `appraisal-customer`: import `tokens.css` un-raw, so Vite
  base64-inlines all four Roboto `.ttf` weights into a separate `dist/style.css`.
  Measured: **874KB raw / 461KB gzip / 318KB brotli**, per consumer, with zero sharing
  between them. A Bubble page embedding both pays that twice.
- `lxn-doc-viewer`: imports `tokens.css` with `?raw` (required — Lit needs the CSS as a
  literal string for its shadow-DOM `static styles`, and `?raw` skips Vite's pipeline
  so the huge `?raw`-then-normal-inline path doesn't happen by accident). But `?raw`
  also means the `@font-face` `url("fonts/Roboto-*.ttf")` paths never resolve, so
  (as of 2026-08-12) it carries its **own local, non-shared, non-lxn-ui-sourced**
  woff2 copy instead — see "Interim state" below. Before that it just stripped
  `@font-face` entirely and silently fell back to Arial/Helvetica, which is what
  prompted this investigation.

None of these share bytes. A single Bubble page that eventually hosts several LXN
webcomps side by side (the actual near-term scenario) would pay this cost once per
component, redundantly, for the identical font files.

### The route

1. **Host woff2, not ttf, on the existing `webcomp.lexen.io` CloudFront + S3 setup**
   (`lxn-gh/lexen-bubble-web-comp`) — it already serves `lxn-doc-viewer.js` and friends,
   and already has wide-open CORS (`Access-Control-Allow-Origin: *`) on its default
   behavior, which cross-origin `@font-face` loading needs.
   - Converted the four weights `lxn-ui` currently ships (Regular/Medium/SemiBold/Bold)
     from the Google Fonts `Roboto.zip` source: **638KB ttf → 285KB woff2 total**
     (Regular 69,936B, Medium 71,856B, SemiBold 71,624B, Bold 71,988B). woff2 is
     already brotli-compressed internally — gzip gains nothing further on top.
   - Path: something like `fonts/roboto/v1/Roboto-{Regular,Medium,SemiBold,Bold}.woff2`.
     The `v1/` matters because of the next point.
   - **Gotcha:** that distribution's current `ResponseHeadersPolicy` forces
     `Cache-Control: no-cache` on everything, deliberately, to stop stale JS bundle
     caching. Fonts need the opposite — a **new CloudFront behavior** for `/fonts/*`
     with its own policy (`public, max-age=31536000, immutable`), separate from the
     default behavior. This doesn't exist yet; would need adding to
     `lexen-bubble-web-comp-stack.ts` (CDK) + `config/apis.yaml`.

2. **Point `lxn-ui/src/tokens/tokens.css`'s `@font-face src` at the CDN, absolute URL**
   instead of the current repo-relative `url("fonts/Roboto-Regular.ttf")`. This is the
   move that fixes every consumer at once, for free, with no other code changes:
   - Vite's normal CSS pipeline (offer/customer's path) only rewrites *relative*
     asset URLs it can resolve on disk — an absolute `https://` URL passes through
     untouched. Their builds stop embedding anything; `style.css` shrinks to just
     rules.
   - `?raw`/`?inline` imports (doc-viewer's path) also just carry the absolute URL
     through unchanged — no more broken relative paths, no more need to strip
     `@font-face`, no more need for a local per-consumer font copy.
   - **Same-page dedup falls out for free**: once every consumer's `tokens.css`
     resolves to the *same* four absolute URLs, the browser's cache keys off the URL —
     `<appraisal-offer>`, `<appraisal-customer>`, `<lxn-doc-viewer>`, and anything
     added later on the same page all fetch each woff2 file exactly once, total, for
     the whole page. Combined with the immutable cache header: once per browser,
     effectively forever, ~285KB total instead of ~874KB × N consumers.

3. Cut this as a new `lxn-ui` tag once it's real (e.g. `v1.4.0`), bump each consumer's
   pinned tag, rebuild, confirm `style.css`/bundle sizes actually shrink.

### Interim state (2026-08-12) — don't propagate this pattern

`lxn-doc-viewer` currently carries its **own local, non-shared** woff2 copy of the four
Roboto weights (`src/fonts/Roboto-{Regular,Medium,SemiBold,Bold}.woff2`, converted from
the same Google Fonts source, base64-inlined via a bumped `assetsInlineLimit` in
`vite.config.js`, registered with hand-written `@font-face` rules in
`lxn-doc-viewer.js` rather than sourced from `tokens.css`). This was a deliberate hack
to stop the visible font mismatch against offer/customer *right now*, without touching
`lxn-ui` or its consumers while this repo's direction is still undecided. It:

- Actually renders real Roboto (fixes the visible bug).
- Does **not** dedup against offer/customer, or against any future consumer — it's
  doc-viewer's own private copy, ~380KB inlined into its single JS bundle
  (67KB → ~449KB / gzip ~307KB).
- Should be deleted once the CDN route above lands — swap doc-viewer's `tokens.css`
  handling back to sourcing `@font-face` from the (by-then-fixed) shared file, remove
  `src/fonts/`, remove the `assetsInlineLimit` bump, remove the hand-written
  `robotoFontFaceCss` block.
