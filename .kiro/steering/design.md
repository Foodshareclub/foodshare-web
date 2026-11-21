---
inclusion: always
---

# Design System

Single source for FoodShare web visual design. Tokens below are read from code; if code and this file
disagree, the code wins and this file gets fixed. Task-level how-to lives in the `foodshare-design` skill
(`.agents/skills/foodshare-design/`), with file:line evidence in its `references/tokens.md`.

Rules for every UI change: Tailwind utilities and shadcn components only, semantic color tokens, no new global
CSS (the global CSS budget is at its limit), no hard-coded hex or `gray-*` in components, light and dark both
checked, nothing relying on hover alone.

## Brand and color

Tokens live in `src/styles/variables.css`, are exposed to Tailwind in `src/styles/theme.css`, and are HSL triplets.

| Role | Light | Class |
| --- | --- | --- |
| Brand coral `#FF2D55` (hover `#E61E4D`) | `--brand-primary` | `bg-brand`, `text-brand`, `fill-brand` |
| Teal `#00A699` | `--brand-teal` | `bg-brand-teal` |
| Orange `#FC642D` (light `#FFA866`) | `--brand-orange` | `bg-brand-orange` |
| UI primary (buttons, `text-primary` links) | `--primary` = `#EB003B`, darker than brand for AA | `bg-primary` |
| Surfaces and text | `background`, `card`, `popover`, `foreground`, `muted`, `muted-foreground` | semantic classes |
| Hairlines and inputs | `--border`, `--input` (`240 5.9% 90%`) | `border-border` |
| Focus ring | `--ring` | `ring-ring` |

- Use `bg-primary` for default actions and links. Use `bg-brand` only for brand moments: the search button, the
  heart fill, the one primary CTA on a page. White text on `bg-brand` is 3.6:1, so keep it to 14px/500 and
  larger bold text only if the pair passes `bun run check:contrast`; otherwise use `bg-primary`.
- Dark mode is a warm charcoal (`--background: 20 10% 15%`), not black or `gray-900`. Primary flips to a light
  pink with a dark foreground. Never write `dark:bg-gray-900`; use `bg-background`, `bg-card`, `bg-muted`.
- Status colors (available, reserved) are emerald and amber at `/10` background with 700 text, 300 in dark.
- Success, warning and info hues are used only for status, never as decoration.

## Typography

Geist via `--font-sans` (`--font-display`, `--font-heading`, `--font-body` alias it). No other typeface.

| Use | Classes |
| --- | --- |
| Page title | `text-2xl sm:text-3xl font-semibold tracking-tight` |
| Section title | `text-xl font-semibold` |
| Card title | `text-[15px] font-semibold leading-snug truncate` |
| Body | `text-base` (detail) or `text-sm` (dense lists) |
| Meta line | `text-sm text-muted-foreground` (cards: `text-[13px]`) |
| Badge or caption | `text-xs font-medium` (min 11px) |

Two weights in most views: 400/500 for text, 600 for titles and prices. Avoid `font-bold` outside empty-state
headlines and the logo.

## Spacing, radius, elevation, motion

- Rhythm: 8px. Prefer `2, 4, 6, 8, 10, 12` (8 to 48px) between blocks and `1, 2, 3, 4` inside controls. Page
  gutters follow `LISTING_CONTAINER`. Do not add odd values like `p-[13px]`.
- Radius: `--radius` is 8px. `rounded-md` 6, `rounded-lg` 8 (inputs, buttons), `rounded-xl` 12 (cards, popovers),
  `rounded-2xl` 16 (listing media, sheets), `rounded-3xl` 20 (large modals), `rounded-full` (pills, icon buttons).
- Elevation: three steps only. Rest `shadow-none` or hairline for listing cards, raised `shadow-sm`/`shadow-md`
  (hover, sticky bars), overlay `shadow-lg`/`shadow-xl` (dropdowns, dialogs). Glass blur is for floating
  chrome (header, pills over map or photo), not for content cards.
- Motion: `--duration-fast 150ms`, `normal 200ms`, `slow 300ms`, `slower 500ms`; ease `--ease-default`. Hover lift is
  `transition-shadow duration-300`, photo zoom at most `scale-[1.03]`. Use `motion-safe:` for anything that
  moves and `motion-reduce:animate-none` for loops. `base.css` already clamps durations under
  `prefers-reduced-motion`. No infinite animation except skeleton pulse and a live-status dot.

## Components (shadcn, new-york, `components.json`)

Use `src/components/ui` (`Button`, `Card`, `Dialog`, `Sheet`, `Drawer`, `Popover`, `Select`, `Skeleton`, `Badge`,
`Tabs`, `Separator`). Extend with `cva` variants or `cn()` in feature code, do not fork ui files for one page.
`Button` variants: `default`, `outline`, `ghost`, `secondary`, `brand`, `brand-outline`. Sizes: `default h-10`,
`sm h-9`, `lg h-11`, `xl h-12`, `icon h-10 w-10`, `icon-sm h-8 w-8`. `Card variant="listing"` is the frameless
card shell (`bg-transparent`, no border, no shadow). `Card` default keeps `border-border/50 shadow-sm` for
dashboards and settings only.

## Browse-flow patterns (Airbnb-style, our own words)

**Listing card (photo first).** Frameless. Media is `rounded-2xl`, `overflow-hidden`, `bg-muted`, ratio
`aspect-[20/19]` on mobile and `sm:aspect-[4/3]` (use `LISTING_PHOTO`; a 1:1 square is acceptable for wanted
or fridge cards). Heart button top-end over the photo (`size-8`, `rounded-full`, translucent surface,
`aria-pressed`, fills `fill-brand`). Carousel dots bottom-center, arrows on hover and focus only, swipe on
touch. Hover lifts with `shadow-md` and a slight photo scale; the whole card is one link. Under the photo,
two lines of meta, not four:
1. title (truncate) on the start, rating or "New" on the end;
2. one muted line combining distance or area and pickup window, plus the status badge or `Free` on the end.
Host name, transit and secondary facts move to the detail page. No border, no inner card padding.

**Search pill.** One rounded-full capsule in the header with 2 to 3 segments (where, what, filters) separated by
hairlines, a round `bg-brand` icon button at the end on desktop, and a compact single-segment pill on mobile
that opens a sheet. Whole pill is a focusable button group with visible focus; segments are 56px tall on
desktop, 44px minimum touch target everywhere.

**Category bar.** One horizontally scrolling row under the header: 24px icon above a `text-xs font-medium`
label, 12 to 16px gaps, active item has a `h-0.5 bg-foreground` underline, inactive hover shows a muted
underline. Fade edges with `mask-image` utility classes (no new CSS), `scrollbar-hide` (declared in
`globals.css`), `snap-x`. A filters button sits at the end, outside the scroller.

**Grid.** `LISTING_GRID` in `src/components/productCard/listing-layout.ts`: 1 column below 600px, 2 from 600,
3 from 960, 4 from 1280, gaps `gap-x-6 gap-y-9`, container max 1440px. Do not add a fifth column without a new
decision. Load more or infinite scroll must keep a skeleton row and an end-of-feed state.

**Listing detail.** Title block first (title, rating or status, area, share and save on the end). Photos as a
mosaic on desktop (one large 2x2 plus four small, `rounded-2xl` outer corners, "Show all photos" button) and a
swipe carousel with a counter pill on mobile. Two columns from `lg`: content on the start (about 2/3), a
`sticky top-24` action card on the end (`rounded-xl`, `shadow-lg`, hairline border) with the primary CTA, pickup
window and approximate area. On mobile the action card becomes a fixed bottom bar with the CTA, `safe-area`
padding and `shadow-lg`. Sections (about, pickup, host, location, reviews) are separated by `border-t` hairlines
with `py-6` to `py-8`, not nested cards.

**Map and list.** Desktop: list on the start (about 55%), map on the end, both scroll independently under the
header, hovering a card highlights its marker and selecting a marker scrolls to and previews the card.
Mobile: list by default with a floating "Map" pill (`rounded-full`, high-contrast, bottom-center above the
safe area) that toggles to a full-bleed map with a selected-card preview sheet. Markers are small pills or pins,
at least 32px hit area, with a selected state (larger, `bg-foreground`) and no tooltip-only information.

**Empty and loading.** Skeletons match the final layout and size (same media ratio and two text bars) with
`animate-pulse motion-reduce:animate-none`, `aria-hidden`, and a polite live region announcing loading.
Empty states have an icon, one sentence on what is missing, one primary action (share something) and one
secondary (clear filters). Photo missing shows the "Finding a photo" state, never a blank gray box.

## Accessibility

- Contrast: text 4.5:1, large text and UI boundaries 3:1. `bun run check:contrast` guards the primary,
  destructive and ring pairs. Do not lower `--primary` lightness to match the brand swatch.
- Focus: global `:focus-visible` is a 2px ring with offset (`base.css`). Keep it visible on pills, icon buttons
  and cards; never `outline-none` without a ring replacement.
- Targets: 44px minimum on touch (`size-11`, or `size-8` visual with a padded hit area). Icon-only buttons need
  `aria-label`. Toggles use `aria-pressed`.
- Reduced motion: no parallax, auto-play carousels or scale loops; transitions may remain as opacity and shadow.
- RTL and i18n: use logical classes (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`); `bun run check:rtl`
  enforces it. All visible strings go through `next-intl`; add keys with `translations:sync`, do not exceed the
  `translations:check` baseline.
- Images: `next/image` with `sizes`, `alt` from the listing title, `priority` only for the first row.

## Do and don't

| Do | Don't |
| --- | --- |
| Let the photo carry the card; two meta lines | Four-line cards with icons on every line |
| Hairline `border-border` between detail sections | Nested bordered cards inside cards |
| Semantic tokens (`bg-card`, `text-muted-foreground`) | `bg-white dark:bg-gray-900`, hex in `className` |
| `bg-primary` for default actions, `bg-brand` for brand moments | Gradients on buttons, glow blobs, `animate-pulse` backgrounds |
| One primary action per view | Two coral buttons side by side |
| Tailwind utilities and `cn()` | New rules in `src/styles/*.css` |
| `motion-safe:` and `motion-reduce:` variants | `hover:scale-125`, spring bounces on content |
| Logical (RTL-safe) spacing | `ml-`, `pr-`, `left-` |
| Skeletons that match layout | Spinners over empty regions |

## Browse-flow checklist (19.2 and 19.3)

1. Header and search pill: segments, round brand search button, compact mobile pill, focus and `aria-label`s.
2. Category bar: icon over label, active underline, fade edges, keyboard scroll, filters button outside scroller.
3. Grid and card: `LISTING_GRID`, `LISTING_PHOTO` used by both card and skeleton (card currently hard-codes
   `aspect-[20/19]`), two-line meta, heart overlay, hover lift, keep "Finding a photo" and cover credit.
4. Detail: mosaic and show-all, title block, sticky action card (desktop) or bottom bar (mobile), hairline sections.
5. Map: list/map split, mobile toggle pill, marker selected state, preview card.
6. Gates: no new global CSS, `bun run check:contrast`, `check:rtl`, `translations:check` not above baseline,
   dark mode and 390px/1440px screenshots, `bun run build:check` CSS number not higher than before.

## Known drift (for 19.2 and 19.3 to resolve)

- `ProductCard.tsx` media is `aspect-[20/19]` at all widths while `LISTING_PHOTO` says 4:3 from `sm`.
- Cards show up to five lines (title, rating, host, address, hours, status, transit); target is two meta lines.
- Gradient brand buttons and `from-[#FF2D55]` hex appear in detail, auth and empty states; `PostDetailContent`
  uses `aspect-ratio: 16/9` single hero and decorative blur blobs.
- `src/styles/cards.css` still defines `brand-gradient*` utilities; the gradient look is retired, so do not use them
  in new work.
