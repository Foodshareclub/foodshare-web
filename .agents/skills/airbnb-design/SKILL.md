---
name: airbnb-design
description: Airbnb Design Language System (DLS) best practices, components, and token reference for FoodShare web UI.
---

# Airbnb Design Language System (DLS) in FoodShare

> [!IMPORTANT]
> The single source of truth for visual tokens and rules is [`.kiro/steering/design.md`](../../.kiro/steering/design.md).
> All components follow Tailwind utilities and shadcn primitives with semantic tokens.
> Retired patterns (gradient buttons/headings, `#FF385C` primary, hardcoded hex colors, 5-line cards) are not used in new work.

## 1. Brand Tokens & Principles

- **Brand Coral**: `--brand-primary` (`#FF2D55`, hover `#E61E4D`) via `bg-brand`, `text-brand`, `fill-brand`.
- **UI Primary**: `--primary` (`#EB003B`) via `bg-primary`, `Button variant="brand"`, or `Button variant="default"`. Provides WCAG AA 4.5:1 contrast against white backgrounds.
- **Surfaces**: `bg-background`, `bg-card`, `bg-muted`. Warm charcoal in dark mode (`20 10% 15%`), never `gray-900`.
- **Rhythm**: 8px system (`gap-2`, `gap-4`, `gap-6`, `p-4`, `p-6`).
- **Radius**: `rounded-full` for pills and action badges, `rounded-2xl` for cards and sheets, `rounded-3xl` for modals and elevated dialogs.
- **Actions**: One prominent brand primary CTA per view (`Button variant="brand"` / `bg-brand hover:bg-brand-hover active:scale-95 text-white`).

## 2. Listing Cards (`ProductCard.tsx`)

- **Frameless Media**: `rounded-2xl`, `overflow-hidden`, `aspect-[20/19]`, hover lift `transition-shadow duration-300 group-hover/card:shadow-md`.
- **Transient Finding-a-Photo State**: `FindingPhotoState` with subtle animated loader and polite live region when images are empty or loading.
- **Reference Cover Credit**: `CoverCreditLine` with disclosure badge and license links when using reference imagery.
- **Two-Line Metadata Hierarchy**:
  - Line 1: Title and Star rating score (`★ 4.8 (5)` or `★ New`).
  - Line 2: Standardized address and pickup hours.
  - Line 3: Free / Available price and live status pill.
- **Action Overlays**: Heart save button (`aria-pressed`, `fill-brand` when liked, `size-8 rounded-full`).

## 3. Detail Page & Gallery (`PostDetailContent.tsx`, `PostGallery.tsx`)

- **Title Block**: Prominent listing title, rating badge, available status, and standardized location disclaimer.
- **Photo Mosaic**: Desktop 2x2 grid with "Show all photos" counter pill; mobile swipe carousel.
- **Host Card**: Verified Community Sharer attribution badge, circular avatar, contact information.
- **Sticky Action Card**: Desktop `sticky top-24` card with primary contact CTA (`variant="brand"`), pickup window, and location. Mobile fixed bottom bar with safe-area padding.
- **Hairline Dividers**: `border-t border-border` between sections.

## 4. Search & Exploration (`SearchBar.tsx`, `SearchModal.tsx`, `CategoryNav.tsx`)

- **Header Search Pill**: 3-segment pill (`What` | `Distance` | `Category` + round brand search button).
- **High-Elevation Search Modal (`SearchModal.tsx`)**:
  - `rounded-3xl border border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-8`.
  - 56px rounded-2xl search input with start search icon and end `size-10` brand action button.
  - Tactile category exploration chips (`rounded-full`) with active state (`border-brand bg-brand/10 text-brand`).
- **Category Navigation (`CategoryNav.tsx`)**:
  - Icon over label, active `h-0.5 bg-foreground` underline, keyboard accessible navigation.

## 5. Community & Volunteer Architecture (`VolunteerPostcard.tsx`, `VolunteerGrid.tsx`)

- **Volunteer Host Cards**:
  - `rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300`.
  - Circular avatar with verified shield badge (`ShieldCheck`).
  - Semantic skills chips with dedicated Lucide category icons (`Car`, `ChefHat`, `ClipboardList`, `Smartphone`, `Camera`, `Globe`, `Code`, `HeartHandshake`).
  - Standardized location and availability footer.
- **Warm Empty State**:
  - Centered glass container with `HeartHandshake` icon, encouraging copy, and primary action CTA (`Button variant="brand"`) to apply as a volunteer.

## 6. Host Listing Creation Experience (`NewProductForm.tsx`)

- **Header**: Tactile rounded-full Back button (`h-9 px-3.5 rounded-full border border-border/80 bg-background/80 hover:bg-muted/60`).
- **Form Container**: `rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-xl p-6 sm:p-10 space-y-6`.
- **Photo Uploader**: Prominent "Cover photo" badge pill on image index 0, circular remove button, dashed dropzone, AI draft trigger.
- **Input Controls**: 48px rounded-xl input fields and selects with brand focus rings (`focus:border-brand focus:ring-2 focus:ring-brand/20`).
- **Submission CTA**: `w-full h-12 rounded-xl font-semibold text-sm bg-brand hover:bg-brand-hover active:scale-95 text-white shadow-xs hover:shadow-sm`.

## 7. Auth & Account Settings Experience (`AuthenticationUserModal.tsx`, `LoginForm.tsx`, `ResetPasswordForm.tsx`, `ProfileBlocks.tsx`)

- **Modal & Page Dialogs**:
  - `rounded-3xl border border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 max-w-lg`.
  - 48px rounded-xl input fields with `focus:border-brand focus:ring-2 focus:ring-brand/20`.
  - Full-width brand primary action CTA (`h-12 rounded-xl bg-brand hover:bg-brand-hover active:scale-95 text-white font-semibold text-sm shadow-xs hover:shadow-sm`).
  - Tactile social auth buttons with rounded-xl border and subtle active scales.
- **Personal Information Cards (`NameBlock.tsx`, `EmailBlock.tsx`, `PhoneNumberBlock.tsx`, `AddressBlock.tsx`)**:
  - `rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl p-6 shadow-xs hover:shadow-md transition-all mb-4`.
  - Section title: `text-base font-semibold text-foreground` with clear, legible value text.
  - Action trigger: `rounded-full text-xs font-semibold px-4 border border-border/80 hover:bg-muted/60 transition-all` pill button.
  - Save button: `h-10 px-5 rounded-xl bg-brand hover:bg-brand-hover active:scale-95 text-white font-semibold text-xs shadow-xs hover:shadow-sm`.

## 8. Verification Standards

Always ensure:
- `bun run check:contrast` passes all WCAG AA pairs.
- `bun run check:rtl` passes with 0 physical direction utilities.
- `bun run check:classes` passes with 0 dead classes.
- `bun run check:i18n-text` and `bun run check:i18n-attributes` have 0 regressions.
- `bun run type-check` passes with 0 TypeScript errors.
- `bun run format:check` confirms all files are formatted.
- `bun test --isolate` passes 100% of test suites.
