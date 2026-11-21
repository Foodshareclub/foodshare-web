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
  - Right-aligned star rating badge: `★ 5.0` (computed from `five_star` and `four_star` review aggregates) or `★ New` for listings without reviews, using Lucide `Star` with `fill-amber-400 text-amber-400`.
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
- **Signature Brand Search Button**:
  - Circular brand red/pink trigger (`variant="brand"` with `--brand-primary` `#FF2D55`).
  - Tactile hover zoom (`hover:scale-105 active:scale-95 shadow-sm transition-all duration-200`).
  - Mobile compact search pill includes a circular brand icon badge for instant visual recognition.

## 6. Category Carousel Navigation (`CategoryNavigation.tsx`)

- Sleek circular scroll arrows (`size-8 shrink-0 rounded-full border-border/80 bg-background/95 shadow-xs hover:scale-105`).
- Active category tab has bottom indicator bar (`h-0.5 bg-primary rounded-full`).
- Graceful fade-out when at carousel extremes (`disabled:opacity-0`).

## 7. Top-Right Profile Capsule (`DesktopMenu.tsx`)

- **Airbnb Signature Menu Pill**:
  - Encapsulated capsule button: `rounded-full border border-border/80 bg-background/80 py-1.25 ps-3.5 pe-1.5 shadow-2xs backdrop-blur-xs transition-all duration-200 hover:border-border hover:shadow-md cursor-pointer focus-visible:outline-2 focus-visible:outline-ring`.
  - Iconography & Avatar: 3-line hamburger menu icon (`Menu` from `lucide-react`, `size-4 text-foreground/80`) on the leading side, paired with the 32px user avatar (`NavbarAvatar size="sm"`).
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


