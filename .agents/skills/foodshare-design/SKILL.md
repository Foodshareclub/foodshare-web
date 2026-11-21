---
name: foodshare-design
description: Design rules for FoodShare web UI (Airbnb-style, photo-first). Use when building or restyling listing cards, the header search pill, category bar, listing grid, listing detail, map view, skeletons, empty states, or any Tailwind/shadcn visual change in foodshare-web.
---
# FoodShare web design

The rules and tokens are in [`.kiro/steering/design.md`](../../../.kiro/steering/design.md). Read it first; it is the only design source. Token evidence with file:line is in [references/tokens.md](references/tokens.md).

- `docs/context/aib&b/` (`design.md`, `implementation.md`, `navbar.md`) is a Phase 19 historical log plus generic Airbnb research. It is **not** guidance: where it conflicts, `.kiro/steering/design.md` and the code win. Do not reproduce its retired patterns (gradient buttons/headings, Cereal font, `#FF385C` primary, 4–5-line cards).

## When to use
- Editing anything under `src/components/productCard`, `src/components/header`, `src/app/food`, `src/app/map`, or `src/components/ui`.
- Adding a card, pill, bar, sheet, skeleton, or empty state.
- Reviewing a UI diff for consistency, contrast, dark mode, RTL, or motion.

## Workflow
1. Read `design.md` (tokens, patterns, checklist) and the matching section for the surface you touch.
2. Reuse `LISTING_CONTAINER`, `LISTING_GRID`, `LISTING_PHOTO` (`src/components/productCard/listing-layout.ts`) and `src/components/ui` before writing markup.
3. Use semantic tokens and Tailwind utilities. No hex, no `gray-*`, no `dark:bg-gray-*`, no new rules in `src/styles/*.css` (global CSS budget is at its limit).
4. Use logical (RTL-safe) classes, `motion-safe:`/`motion-reduce:`, 44px touch targets, `aria-label` on icon buttons.
5. Strings go through `next-intl`; do not raise the `translations:check` baseline.
6. Check light and dark at 390px and 1440px.

## Checks
`bun run check:contrast`, `bun run check:rtl`, `bun run translations:check`, `bun run type-check`, and `bun run build:check` for the CSS size. Do not claim a visual change is done without screenshots.

## Do not
- Add a second design doc or a per-feature style guide; amend `design.md` instead.
- Recolor `--primary` to match the `#FF2D55` swatch; it is darker on purpose for AA (see references).
