---
name: airbnb-design
description: Guidelines and best practices for FoodShare's Airbnb-inspired design language. Use when designing, creating, or modifying listing cards, search feeds, carousels, typography hierarchies, and tactile micro-interactions.
---

# Airbnb Design Language for FoodShare

FoodShare implements an Airbnb-inspired visual design system tailored for community food sharing. This guide documents the core patterns, typography hierarchies, media treatments, and micro-interactions.

## 1. Listing Card Anatomy (`ProductCard.tsx`)

Listing cards use a frameless presentation with a 4-line metadata hierarchy:

- **Aspect Ratio & Geometry**: `aspect-[20/19]` rounded image container (`rounded-2xl overflow-hidden`).
- **Line 1 (Title & Star Rating)**:
  - Listing name in `text-[15px] font-semibold leading-snug text-foreground truncate`.
  - Right-aligned star rating badge: `★ 5.0 (12)` (computed rating score + count when reviews exist) or `★ New` for listings without reviews, using Lucide `Star` with `fill-amber-400 text-amber-400`.
- **Line 2 (Host & Ownership)**:
  - Community members: `By <FirstName>` with `User` icon.
  - Organizations/Fridges: `Hosted by <Organization>` or `<FoodBank Name>` in `emerald-600 dark:emerald-400` with `Building2` icon.
- **Line 3 (Location & Hours)**:
  - Standardized privacy-safe address with `MapPin` icon.
  - Pickup hours with `Clock` icon.
- **Line 4 (Price & Status)**:
  - Bold price highlight: `Free` (or `Available` for non-food categories).
  - Status indicator:
    - Active: `🟢 Available` pill with emerald pulse dot (`animate-pulse`).
    - Arranged: `🟠 Reserved` pill with amber dot.
  - Transit info (if specified): `Bus` icon with transit details.

## 2. Image Media & Fallbacks (`ImageCarousel.tsx`)

- **Swipeable Carousel**:
  - Horizontal snap scroll container with smooth scroll behavior.
  - Vertically centered circular arrow controls (`size-8 rounded-full bg-white/90 shadow-md backdrop-blur-xs`), revealed on hover (`group-hover/carousel:opacity-100`).
  - Bottom pagination dots with active indicator pill.
- **Tactile Card Hover Zoom**:
  - Photos smoothly scale on card hover: `group-hover/card:scale-[1.04] transition-transform duration-500 ease-out`.
- **Organic Fallback Placeholder**:
  - Warm organic ambient gradient: `from-amber-500/10 via-emerald-500/5 to-teal-500/10` (dark: `from-amber-950/25 dark:via-neutral-900 dark:to-emerald-950/20`).
  - Subtle radial glow: `[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent`.
  - Centered frosted glass badge: `rounded-2xl border border-white/60 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-xs` with category icon (`Leaf` or `Package`) and category label (`Community Food`, `Community Fridge`). Scales slightly on card hover.

## 3. Interactive Actions (`ProductCardActions.tsx`)

- **Universal Wishlist / Like Button**:
  - Frosted glass circular pill: `airbnb-action-btn airbnb-action-btn-hover` (`size-8 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-xs shadow-sm`).
  - Spring pop animation on toggle: heart icon fills with `--brand-primary` (`#FF2D55`) and scales `scale-110`.
  - GPU-accelerated transforms (`gpu120Interactive`).
- **Owner & Admin Controls**:
  - Edit (`Pencil`) and Report (`Flag`) buttons sit alongside the heart button, keeping the hit area isolated from card navigation links.

## 4. Responsive Grid Geometry (`listing-layout.ts`)

- Container: `LISTING_CONTAINER = "mx-auto w-full max-w-[1920px] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16"`.
- Responsive Columns: `LISTING_GRID = "grid grid-cols-1 min-[550px]:grid-cols-2 min-[950px]:grid-cols-3 min-[1200px]:grid-cols-4 min-[1640px]:grid-cols-5 min-[1880px]:grid-cols-6 items-stretch gap-x-6 gap-y-10"`.
- Floating Map Pill: Centered bottom floating pill (`Show map`) with backdrop blur and tactile elevation.

## 5. Header & Pill Search Bar (`SearchBar.tsx`)

- **3-Segment Pill Structure**:
  - `What` (keywords and query suggestions) | `Distance` (radius slider) | `Category` (category filter).
  - Divided by subtle 1px border lines (`h-8 w-px bg-border`).
  - Tactile segment activation: Individual rounded pills inside the capsule (`rounded-full transition-all duration-200 cursor-pointer`, `activeSection ? "bg-muted shadow-xs" : "hover:bg-muted/40"`).
- **Interactive Search Popovers**:
  - Popover geometry: `rounded-3xl border border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl p-5 sm:p-6 animate-in fade-in-0 zoom-in-95 duration-200`.
  - **Category Grid**: Interactive tile grid (`grid grid-cols-2 sm:grid-cols-3 gap-2.5`) with 24px category icons and tactile selection ring.
  - **Distance Chips**: Radius option chips (`grid grid-cols-2 sm:grid-cols-3 gap-2.5`) with high-contrast active states.
  - **Suggestions List**: Recent and popular searches with circular icon badges (`size-9 rounded-full bg-muted/60`).
- **Signature Brand Search Button**:
  - Circular brand red/pink trigger (`variant="brand"` with `--brand-primary` `#FF2D55`).
  - Tactile hover zoom (`hover:scale-105 active:scale-95 shadow-sm transition-all duration-200`).
  - Mobile compact search pill includes a circular brand icon badge for instant visual recognition.

## 6. Category Carousel Navigation (`CategoryNavigation.tsx`, `CategoryItem.tsx`)

- Sleek circular scroll arrows (`size-8 shrink-0 rounded-full border-border/80 bg-background/95 shadow-xs hover:scale-105`).
- Active category tab has bottom indicator bar in foreground contrast (`h-0.5 bg-foreground rounded-full`).
- Inactive tabs display a subtle hover underline hint (`bg-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity`) and icon micro-zoom (`group-hover:scale-105`).
- Graceful fade-out when at carousel extremes (`disabled:opacity-0`).

## 7. Profile Menu Capsules (`DesktopMenu.tsx`, `MobileMenu.tsx`)

- **Airbnb Signature Menu Pill**:
  - Encapsulated capsule button: `rounded-full border border-border/80 bg-background/80 py-1.25 ps-3.5 pe-1.5 shadow-2xs backdrop-blur-xs transition-all duration-200 hover:border-border hover:shadow-md cursor-pointer focus-visible:outline-2 focus-visible:outline-ring`.
  - Iconography & Avatar: 3-line hamburger menu icon (`Menu` from `lucide-react`, `size-4 text-foreground/80`) on the leading side, paired with the 32px user avatar (`NavbarAvatar size="sm"`).
  - Mobile capsule button: `py-1.5 ps-3.5 pe-2 rounded-full border border-border/80 bg-background/80 shadow-2xs` with hamburger menu and avatar indicator.
  - Mobile drawer: Refined touch-friendly cards (`p-3.5 rounded-2xl glass-subtle`) with `size-10` rounded icon containers and `text-base font-semibold` typography.
  - Dropdown presentation: `DropdownMenuContent` with `glass-strong rounded-2xl min-w-[240px] shadow-xl border border-border/80 p-1.5` aligning to the end.

## 8. Floating Navigation & Action Pills (`NavigateButtons.tsx`, `AddListingButton.tsx`)

- **Floating Map/Listings Pill**:
  - Centered floating bottom capsule button (`h-11 px-5 md:px-6 py-2.5 rounded-full font-semibold text-sm`).
  - High-contrast adaptive palette: `bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border border-white/15 dark:border-black/10 shadow-[0_6px_20px_rgba(0,0,0,0.25)] hover:scale-105 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95`.
  - Dynamic `Map` / `List` Lucide icons with `text-current` matching the theme.
- **Add Listing Action Button**:
  - Refined `h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 px-4 text-sm font-semibold text-white shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-1.5`. Matches navbar height harmoniously.

## 9. Empty States & Zero-Waste Community Fallbacks (`EmptyListingState.tsx`)

- **Warm Zero-State Experience**:
  - Organic ambient radial glow and category badge icon.
  - Uplifting headline and empathetic call to action to share surplus food or items.
  - Quick category shortcuts and clear-search filter reset pill.

## 10. Footer Architecture & Legal Row (`Footer.tsx`)

- **Airbnb Bottom Bar Layout**:
  - Full-width container with subtle top border (`border-t border-border/40`).
  - Leading legal links: `© {currentYear} Foodshare Club, Limited.` separated by interpuncts (`·`) with direct links to `Privacy` and `Terms`.
  - Community heart badge: `Made with ❤️ for our community`.
  - Trailing controls: Compact `LanguageSelector` dropdown with native names and country flags.

## 11. Category Filters Pill & Modal (`FiltersModal.tsx`)

- **Airbnb Desktop Filters Trigger**:
  - Docks on the trailing side of the category scroller in `Navbar.tsx`.
  - Tactile pill styling: `h-10 px-3.5 sm:px-4 rounded-xl border border-border/80 bg-background/80 hover:border-foreground/30 hover:bg-muted/40 shadow-2xs hover:shadow-xs flex items-center gap-2 text-xs font-semibold text-foreground/80 hover:text-foreground transition-all shrink-0 active:scale-95`.
  - `SlidersHorizontal` icon (`size-3.5`) and active filter count badge (`1`) when `geoDistance > 0`.
- **Airbnb Filter Dialog**:
  - Centered modal title `Distance Filter` with standard `DialogClose` in the top end corner.
  - Range display with dynamic read-out: `Within X km` or `Any distance`.
  - Preset discovery chips: `5 km`, `10 km`, `25 km`, `50 km`, `Any distance` with high-contrast active indicator.
  - Sticky footer with `Clear all` text button and solid high-contrast `Show listings` action button (`bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-xl h-10 px-5 font-semibold text-xs shadow-xs active:scale-95`).

## 12. Listing Detail & Intercepted Modal (`PostDetailContent.tsx`)

- **Airbnb Detail Header & Metadata Bar**:
  - Proud listing title: `text-2xl sm:text-3xl font-bold tracking-tight text-foreground`.
  - Top meta line: Star rating score (`★ 5.0 (12)` or `★ New`), interpuncts (`·`), live status indicator pill (`Available` / `Reserved`), and privacy-standardized address with `MapPin`.
  - Integrated header actions: Share button (`ShareButton`) docked top-right.
- **Framed Hero Media**:
  - Clean rounded aspect ratio container (`aspect-[16/9] rounded-2xl overflow-hidden`) with reference photo disclosure badge and photo count pill (`Camera` + `X photos`).
- **Airbnb Host Credibility Section**:
  - Circular avatar container (`size-12 rounded-full border border-border/80 bg-background/80 shadow-2xs`).
  - Clear attribution hierarchy: `Hosted by <Name>` / `Food Bank Entity` paired with `Community Sharer` / `Community Organization` badge.
- **Structured Highlights & Primary CTA**:
  - Available hours (`Clock`), transportation (`Truck`), and description sections.
  - Prominent primary action button in brand coral gradient (`bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-semibold h-12 rounded-xl shadow-md transition-all`).



