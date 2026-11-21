# Token evidence (read from code on origin/main 9b36571e)

| Token or rule | Value | Source |
| --- | --- | --- |
| Brand coral | `--brand-primary: 345 100% 59%` = `#FF2D55`; hover `345 100% 52%` | `src/styles/variables.css:101-102` |
| Teal, orange | `173 58% 39%` `#00A699`; `27 87% 59%` `#FC642D`; light `27 87% 67%` | `src/styles/variables.css:103-105` |
| UI primary (AA) | `--primary: 345 100% 46%` (`#EB003B`), white foreground, 4.57:1 | `src/styles/variables.css:18-34` |
| Dark primary | `345 85% 72%` with dark foreground `345 40% 8%` | `src/styles/variables.css:179-180` |
| Dark surfaces | background `20 10% 15%`, card `22 10% 17%`, border `25 10% 24%` | `src/styles/variables.css:147-203` |
| Light neutrals | muted `240 4.8% 95.9%`, muted-fg `240 3.8% 43%`, border `240 5.9% 90%` (1.27:1, deliberate) | `src/styles/variables.css:41-65` |
| Base radius | `--radius: 0.5rem` | `src/styles/variables.css:70` |
| Radius scale | sm 4, md 6, lg 8, xl 12, 2xl 16, 3xl 20 px | `src/styles/theme.css:45-50` |
| Font | Geist (`--font-sans`); display/heading/body alias it | `src/styles/theme.css:53-61` |
| Durations, easing | 150/200/300/500 ms; default `cubic-bezier(0.4,0,0.2,1)`, spring `(0.34,1.56,0.64,1)` | `src/styles/theme.css:64-71` |
| Brand utilities | `bg-brand`, `bg-brand-hover`, `bg-brand-teal`, `bg-brand-orange` | `src/styles/theme.css:90-95` |
| Focus ring | `:focus-visible` 2px ring, offset 2 | `src/styles/base.css:16-18` |
| Reduced motion | durations clamped to 0.01ms | `src/styles/base.css:387-398` |
| Contrast guard | fails build if pairs drop under AA | `scripts/check-contrast.ts` |
| CSS budget | `GLOBAL_CSS_RAW_BUDGET_KB = 495` (build is 498, pre-existing red) | `scripts/check-bundle-size.ts:253` |
| Only global utility besides gpu/glass | `scrollbar-hide` | `src/app/globals.css:17-24` |
| shadcn config | style `new-york`, `rsc: true`, baseColor `neutral`, CSS vars, no tailwind config file | `components.json` |
| Button variants/sizes | default, destructive, outline, secondary, ghost, link, brand, brand-outline, brand-orange, glass*; h-8..h-12 | `src/components/ui/button.tsx:7-36` |
| Frameless card shell | `Card variant="listing"` is `bg-transparent`; default has border and `shadow-sm` | `src/components/ui/card.tsx:15-18` |
| Skeleton | `animate-pulse rounded-md bg-muted` | `src/components/ui/skeleton.tsx:4` |
| Grid | 1/2/3/4 columns at 600/960/1280, `gap-x-6 gap-y-9`, container 1440 | `src/components/productCard/listing-layout.ts:2-5` |
| Card media | `rounded-2xl aspect-[20/19]`, hover `shadow-md` | `src/components/productCard/ProductCard.tsx:61` |
| Card text | title `text-[15px]`, meta `text-[13px]`/`[14px]`, status `text-[11px]` | `src/components/productCard/ProductCard.tsx:80-152` |
| Heart | `aria-pressed`, `fill-brand` when liked | `src/components/productCard/ProductCardActions.tsx:70-81` |
| Carousel controls | `size-8` rounded-full arrows, dots | `src/components/productCard/ImageCarousel.tsx:118-162` |
| Search pill | rounded-full, segments `h-14 sm:h-16`, brand round button | `src/components/header/navbar/SearchBar.tsx:241,267-309` |
| Category item | icon `size-5 md:size-6`, active `h-0.5 bg-foreground` underline | `src/components/header/navbar/atoms/CategoryItem.tsx:91,104-106` |
| Detail hero | single `aspect-ratio: 16/9`; decorative blur blobs | `src/app/food/[id]/PostDetailContent.tsx:138-139,207` |
| Map markers | Leaflet `divIcon` HTML | `src/hooks/useMarkerIcon.ts:23,63` |

## Drift found (code wins)

| Old doc claim | Code reality |
| --- | --- |
| `design.md`: system font stack | Geist |
| `design.md`: 4px spacing grid | Tailwind default 4px unit; this file now asks for an 8px rhythm of values |
| `design.md`: `dark:bg-gray-900` card sample | dark uses warm charcoal tokens |
| `design.md`/`shadcn.md`: primary is `#FF2D55` | `--primary` is `#EB003B`; `#FF2D55` is `--brand-primary` |
| `shadcn.md`: `RSC: false` | `components.json` has `rsc: true` |
| `shadcn.md`: custom variant with `bg-[#FF2D55]` | `Button variant="brand"` exists |
| `TAILWIND_SHADCN_AUDIT.md`: `tailwind.config.ts` exists | no such file; config is CSS-first |
| `TAILWIND_SHADCN_AUDIT.md`: `brand-gradient`, `aspect-card`, `h-map` utilities | accurate (`src/styles/cards.css:79-87,252-261`), but the gradient look is retired for new work |
| `LISTING_PHOTO` is `aspect-[20/19] sm:aspect-[4/3]` | `ProductCard` hard-codes `aspect-[20/19]` at all widths (skeleton uses `LISTING_PHOTO`) |
