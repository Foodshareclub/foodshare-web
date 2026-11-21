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
  - `rounded-3xl` glass container (`border border-border/80 bg-gradient-to-b from-card/95 via-card/80 to-card/60 backdrop-blur-2xl shadow-xl p-8 sm:p-12 text-center`).
  - Organic ambient radial glow and category badge icon (`size-16 sm:size-20 rounded-2xl bg-muted/60 border border-border/80`) with corner plus badge in brand coral gradient (`size-6 rounded-full bg-gradient-to-r from-[#FF2D55] to-[#FF385C]`).
  - Uplifting headline (`text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display`) and empathetic call to action to share surplus food or items.
  - Signature brand coral primary action button (`h-12 px-7 rounded-xl bg-gradient-to-r from-[#FF2D55] to-[#FF385C] hover:from-[#E02447] hover:to-[#E0284D] active:scale-95 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all`).
  - High-contrast secondary clear search action (`h-12 px-6 rounded-xl border border-border/80 bg-background/80 hover:bg-muted/60 text-foreground font-semibold text-sm`).
  - Quick category discovery shortcut chips (`rounded-full border border-border/80 bg-background/80 hover:bg-muted/60 shadow-2xs hover:shadow-xs active:scale-95 text-xs font-semibold px-3.5 py-1.5`).

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
  - Integrated header actions: Share button (`ShareButton`) paired alongside the wishlist Save button (`Button` with `Heart` icon and `isSaved` / `likeCount` state).
- **Framed Hero Media**:
  - Clean rounded aspect ratio container (`aspect-[16/9] rounded-2xl overflow-hidden`) with reference photo disclosure badge and photo count pill (`Camera` + `X photos`).
- **Airbnb Host Credibility Section**:
  - Circular avatar container (`size-12 rounded-full border border-border/80 bg-background/80 shadow-2xs`).
  - Clear attribution hierarchy: `Hosted by <Name>` / `Food Bank Entity` paired with `Community Sharer` / `Community Organization` badge.
- **Structured Highlights, Rating Prompt & Primary CTA**:
  - Available hours (`Clock`), transportation (`Truck`), and description sections.
  - Interactive rating prompt card (`rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md shadow-xs p-4 sm:p-5`) with star scale hover effects (`hover:scale-125`).
  - Prominent primary action button in signature brand coral gradient (`bg-gradient-to-r from-[#FF2D55] to-[#FF385C] hover:from-[#E02447] hover:to-[#E0284D] active:scale-95 text-white font-semibold text-sm h-12 rounded-xl shadow-md transition-all`).

## 13. Map View, Markers & Popup Cards (`MapView.tsx`, `ProductPopup.tsx`, `leaflet.css`)

- **Map Popup Card Geometry & Elevation**:
  - `rounded-2xl` / `20px` radius container with glass backdrop blur (`background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(16px);`) and elevated soft shadow (`box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.18)`).
  - High-aspect rounded cover image (`height: 145px; border-radius: 14px;`) with warm organic fallback placeholder (`.product-popup-placeholder`) when no photo is attached.
  - Crisp typography: bold title (`font-size: 15px; font-weight: 700; color: #0f172a;`), live category/availability badge pill (`padding: 2.5px 9px; border-radius: 9999px; font-weight: 600;`), and distance line.
  - Signature brand CTA button: Airbnb brand coral gradient button (`linear-gradient(135deg, #ff2d55 0%, #e6284d 100%)`, `border-radius: 12px; height: 38px; font-weight: 600;`) with tactile hover lift and shadow glow.
  - Floating dismiss button: Circular semi-transparent glass close button (`border-radius: 50%; background: rgba(0, 0, 0, 0.55); color: #fff;`) anchored in top-right corner.
  - Full dark mode support (`.dark .product-card-popup`).
- **Tactile Map Markers**:
  - Marker pins with smooth hover scale (`scale(1.15)`) and depth filter (`filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.16))`).
  - Circular cluster badges with bold typography and hover transitions.

## 14. Listing Creation & Auth Modals (`BecomeSharerBlock.tsx`, `AuthenticationUserModal.tsx`, `SocialAuthButtons.tsx`)

- **Airbnb Listing Creation Popover (`BecomeSharerBlock.tsx`)**:
  - `rounded-3xl border border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl p-3 sm:p-4 min-w-[320px]`.
  - Category tiles with rounded-xl containers, subtle icon badges (`size-8 rounded-lg bg-muted/50`), bold category labels, and micro-interactions.
  - Refined uppercase tracker headers (`text-[10px] font-bold text-muted-foreground uppercase tracking-wider`).
- **Airbnb Authentication Experience (`AuthenticationUserModal.tsx`, `SocialAuthButtons.tsx`)**:
  - Floating `rounded-3xl` glass dialog (`max-w-[560px] rounded-3xl border border-border/80 bg-background/98 backdrop-blur-2xl shadow-2xl`).
  - Smooth 48px rounded-xl input fields (`h-12 rounded-xl border border-border/80 bg-background/50 hover:border-foreground/50 focus:border-[#FF2D55] focus:ring-2 focus:ring-[#FF2D55]/20`).
  - Full-width brand coral primary action button (`h-12 rounded-xl bg-gradient-to-r from-[#FF2D55] to-[#FF385C] hover:from-[#E6284D] hover:to-[#E03150] font-semibold text-white shadow-md active:scale-[0.99]`).
  - Tactile social auth buttons (`h-12 rounded-xl border border-border/80 font-semibold text-sm hover:border-foreground/50 hover:bg-muted/40 active:scale-[0.99]`).

## 15. Feed Continuation & Category Discovery (`ProductGrid.tsx`)

- **End-of-Feed Exploration Section**:
  - Automatically rendered when listings feed is exhausted (`!hasMore && !isLoading && products.length > 0`).
  - Subtle top divider line (`border-t border-border/60 mt-14 pt-12 text-center`).
  - Centered sparkle icon badge (`size-10 rounded-full bg-muted/60`).
  - Localized section title and subtitle (`Home.categories_title` and `Home.categories_subtitle`).
  - Interactive rounded pill chips (`rounded-full border border-border/80 bg-background/80 hover:bg-muted/60 shadow-2xs hover:shadow-xs active:scale-95 transition-all text-xs font-semibold`) mapping to all community categories (`Food`, `Zero Waste`, `Things`, `Borrow`, `Wanted`, `Fridges`, `FoodBanks`, `Volunteers`).

## 16. Host Profile & Identity Badge Architecture (`ViewProfileClient.tsx`, `ProfileActions.tsx`, `ListingPersonCards.tsx`)

- **Two-Column Host Architecture**:
  - Responsive two-column grid (`grid grid-cols-1 md:grid-cols-12 gap-8 items-start`).
  - **Left Host ID Card (`md:col-span-5 lg:col-span-4`)**:
    - Floating `rounded-3xl` glass card (`border border-border/80 bg-card/95 backdrop-blur-2xl shadow-xl p-6 sm:p-8`).
    - Ambient emerald glow halo (`size-48 rounded-full bg-emerald-500/10 blur-3xl`).
    - Large circular avatar (`size-28 sm:size-32 rounded-full border-4 border-background shadow-xl`) with verified shield badge (`ShieldCheck` badge anchored bottom-right).
    - Host name and tag (`@nickname`).
    - Role pill badge: `🤝 Volunteer` or `Community Sharer`.
    - Credential stat tiles: Member since date (`Calendar`) and Location / Approximate area (`MapPin`).
  - **Right Bio & Details Column (`md:col-span-7 lg:col-span-8`)**:
    - Clean About section with generous line spacing and rounded card container.
    - Actions: Signature Airbnb brand coral CTA (`Send Message`) with `active:scale-[0.98]` and smooth back button.
- **Account Settings Avatar Edit (`ListingPersonCards.tsx`)**:
  - Relocated pencil button to an anchored relative position on the avatar (`absolute bottom-0 end-0 size-8 rounded-full border border-border/80 shadow-md hover:scale-110 active:scale-95`), eliminating legacy viewport-based positioning.

## 17. Interactive Share Popover Architecture (`ShareButton.tsx`)

- **Trigger Variations**:
  - Icon pill: `size-9 sm:size-10 rounded-full border border-border/80 bg-background/80 hover:bg-muted/60 text-foreground shadow-2xs hover:shadow-xs active:scale-95`.
  - Default pill: `h-10 px-4 rounded-full border border-border/80 bg-background/80 hover:bg-muted/60 text-foreground text-xs font-semibold flex items-center gap-2`.
- **Dropdown Menu Geometry**:
  - `w-64 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-2xl shadow-xl p-2`.
  - Copy link row with circular icon container (`size-8 rounded-full bg-muted/80`) and dynamic green feedback pill (`Link copied!`) on click.
  - Dedicated brand share options (WhatsApp `#25D366`, Telegram `#0088cc`, X/Twitter, Facebook `#1877F2`, and Email) with circular badges.

## 18. Wishlist & Top Action Pairing (`PostDetailContent.tsx`)

- **Airbnb Header Action Cluster**:
  - Top right corner of listing details houses both `Share` and `Save` (Wishlist) side by side.
  - Tactile interactive state: Toggle heart between outline and solid brand coral fill (`fill-[#FF2D55] text-[#FF2D55]`).
  - Live synchronization with optimistic update and rollback on failure.

## 19. Post-Exchange Feedback & Rating Experience (`PopupNotificationModal.tsx`)

- **Floating Review Modal**:
  - `rounded-3xl border border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-8`.
  - Smooth tactile star rating buttons with scale zoom on hover (`hover:scale-125 transition-transform duration-200`) and active amber fill.
  - Rounded-xl textarea input and full-width brand coral action CTA (`h-12 px-7 rounded-xl bg-gradient-to-r from-[#FF2D55] to-[#FF385C] text-white font-semibold text-sm shadow-md`).

## 20. Host Listing Creation Experience (`NewProductForm.tsx`)

- **Page Header & Navigation**:
  - Tactile rounded-full Back button (`h-9 px-3.5 rounded-full border border-border/80 bg-background/80 hover:bg-muted/60 text-foreground text-xs font-semibold shadow-2xs hover:shadow-xs active:scale-95`).
  - Brand header badge (`size-11 rounded-2xl bg-muted/60 border border-border/80 text-foreground`) with community `PlusCircle` icon.
  - Expressive typography: `font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground`.
- **Form Card Architecture**:
  - High-elevation glassmorphic container: `rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-xl p-6 sm:p-10 space-y-6`.
- **Media Upload Presentation**:
  - Prominent "Cover photo" badge pill on image index 0 (`absolute bottom-2 start-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-black/75 text-white backdrop-blur-xs`).
  - Circular glass remove button (`size-7 rounded-full bg-black/60 hover:bg-black/80 text-white`).
  - 2-dashed border dropzone (`border-2 border-dashed border-border/80 rounded-2xl hover:bg-muted/30 transition-colors`).
  - Smart AI draft pill with Sparkles icon (`h-10 px-4 rounded-full border border-border/80 bg-background/80 hover:bg-muted/60 text-xs font-semibold`).
- **Input Fields & Form Controls**:
  - 48px rounded-xl input fields and select dropdowns: `h-12 rounded-xl border-border/80 bg-background/60 hover:border-foreground/30 focus:border-[#FF2D55] focus:ring-2 focus:ring-[#FF2D55]/20 text-sm`.
- **Primary Host Submission CTA**:
  - Full-width / flex brand coral gradient button: `h-12 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#FF2D55] to-[#FF385C] hover:from-[#E02447] hover:to-[#E0284D] active:scale-95 text-white shadow-md hover:shadow-lg shadow-[#FF2D55]/20 hover:shadow-[#FF2D55]/30`.





