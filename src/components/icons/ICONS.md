# Icon provenance

Every icon lxn-ui exports is a verbatim copy of a real, published icon —
nothing here is hand-drawn or invented. This table is the map from lxn-ui's
own (use-based) export name to the real glyph it's a copy of, so anyone can
go verify a given icon against its source.

Centralized 2026-08-12 — before this date, appraisal-customer and
appraisal-offer each kept their own local `icons.tsx` with several
independently-drawn glyphs; those files are now gone, migrated below.

| lxn-ui export     | Real source glyph                          | License      | Notes |
|--------------------|---------------------------------------------|--------------|-------|
| `ListIcon`         | Lucide `list`                                | ISC          | |
| `PencilIcon`       | Lucide `edit` (classic, pre-rename)          | ISC          | Lucide has since renamed/replaced `edit` with `square-pen`, a different pictograph (a corner pen, no page). This is the real pre-rename `edit` path, not invented — kept over `square-pen` because it reads more clearly as "edit this record" at the sizes this app uses. |
| `TrashIcon`        | Lucide `trash`                               | ISC          | |
| `CheckIcon`        | Lucide `check`                                | ISC          | Also now covers the "Selected"/"CURRENT" use that a separate `SelectedCheckIcon` (filled circle+check, not sourced from any real icon set) used to serve in appraisal-customer — retired as a duplicate. |
| `SearchIcon`       | Lucide `search`                               | ISC          | |
| `InfoIcon`         | Lucide `info`                                  | ISC          | Replaces two identical-to-each-other filled circle+"i" glyphs (one in appraisal-customer's icons.tsx, one in appraisal-offer's) that weren't sourced from any real icon set. |
| `ExternalArrowIcon`| Lucide `arrow-up-right`                       | ISC          | appraisal-customer's HistoryCard "opens a different appraisal" row glyph. |
| `ViewOfferIcon`    | Lucide `external-link`                         | ISC          | appraisal-offer's "View Offer" button glyph. |
| `BackArrowIcon`    | Lucide `chevron-left`                          | ISC          | Path was already an exact match pre-migration. |
| `ChevronDownIcon`  | Lucide `chevron-down`                          | ISC          | Path was already an exact match pre-migration. |
| `ChevronsDownIcon` | Google Material Icons `keyboard_double_arrow_down` (filled) | Apache-2.0 | Named for the glyph (Lucide's own equivalent is `chevrons-down`) even though sourced from Material this time — explicit ask 2026-08-28 for `appraisal-customer-page`'s Expand-all/Collapse-all toggle. |
| `AddCircleIcon`    | Google Material Icons `add_circle` (filled)    | Apache-2.0   | Kept as filled Material rather than migrated to Lucide's stroke `circle-plus` — explicit call 2026-08-12 to leave this one as it was, even though it's the one filled icon next to stroke ListIcon/PencilIcon in the same button row. |
| `PlusIcon`         | Google Material Icons `add` (filled)           | Apache-2.0   | Kept as filled Material for the same reason as `AddCircleIcon`. |
| `ResetIcon`        | Lucide `rotate-ccw`                            | ISC          | Used for both "Reset" (amount pill) and "Undo" (tentative bubble) — same glyph, per v1's Offer Modal Prototype. Counter-clockwise picked over Lucide's `rotate-cw` because it reads as "undo/reset," not "refresh." |
| `WarningIcon`      | Lucide `circle-alert`                          | ISC          | |
| `CloseIcon`        | Google Material Design `close` (filled)        | Apache-2.0   | Picked 2026-08-10 as canonical over a stroked-two-line X that had silently drifted from it. Used directly by `CloseButton`, and standalone anywhere that needs a bare dismiss glyph without `CloseButton`'s own chrome (e.g. `ErrorBanner`'s inline dismiss). |
| `AutoFixHighIcon`  | Google Material Icons `auto_fix_high` (filled) | Apache-2.0   | "Auto-assigned" indicator glyph — sits beside a value the server picked automatically rather than a person selecting it (first use: `appraisal-users`' Salesperson/Appraiser/Sales Manager rows). |

## Verifying a glyph

Lucide icons: `https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/<name>.svg`
(e.g. `.../icons/search.svg`). Lucide occasionally revises path data for a
given icon name (optical alignment tweaks) — the paths here matched Lucide's
`main` branch as of 2026-08-12; if a diff ever seems mysterious, check
whether that's the reason before assuming a mistake.

Material Icons: `https://fonts.google.com/icons` — search "close", filled
style, 24px, path data via the Google Fonts icon detail panel or the
`material-design-icons` GitHub repo.
