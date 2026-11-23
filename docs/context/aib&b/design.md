# Airbnb Website Design Guide

A comprehensive reference for recreating Airbnb's beautiful web design on your local laptop.

---

## Color Palette

### Primary Brand Colors

Airbnb uses five official brand colors named Rausch, Babu, Arches, Hof, and Foggy:

1. **Rausch (Primary Red)** - `#FF5A5F`
   - RGB: `rgb(255, 90, 95)`
   - Main brand color, used for important actions and CTAs
   - The current website uses a more vibrant reddish pink `#FF385C` as the primary color

2. **Babu (Teal)** - `#00A699`
   - RGB: `rgb(0, 166, 153)`
   - Secondary accent color

3. **Arches (Orange)** - `#FC642D`
   - RGB: `rgb(252, 100, 45)`
   - Accent color for highlights

4. **Hof (Dark Gray)** - `#484848`
   - RGB: `rgb(72, 72, 72)`
   - Used for interface elements and text

5. **Foggy (Light Gray)** - `#767676`
   - RGB: `rgb(118, 118, 118)`
   - Used as background color for most pages

### Supporting Colors

- **White** - `#FFFFFF` - Clean backgrounds
- **Black** - `#222222` - Emphasis and readability
- **Text Gray** - `#717171` - Subdued text
- **Border/Divider** - `#EBEBEB` - Light borders

---

## Typography

### Font Family

Airbnb uses a custom typeface called **Airbnb Cereal**, created in partnership with Dalton Maag foundry.

**Key Features:**

- Optimized for UI and screens with Book and Bold weights
- Scalable across platforms (iOS, Android, Web)
- Supports 12+ languages with plans to extend to 25 languages
- Features rounded corners and open apertures for improved readability

**Font Weights:**

- Book (regular) - Optimized for UI
- Medium
- Bold - For headings and emphasis
- Extra Bold - For large marketing materials
- Light - For specific use cases

**Fallback Options** (if Cereal is unavailable):
Circular, Proxima Nova, Avenir, Inter, or Source Sans Pro provide similar friendly characteristics

### Typography Scale

Common font sizes used:

- **Large Heading:** 48px - 72px
- **Heading 1:** 32px - 40px
- **Heading 2:** 24px - 28px (line-height: 32px)
- **Heading 3:** 18px - 20px
- **Body Text:** 14px - 16px
- **Small Text:** 12px - 13px
- **Caption:** 10px - 11px

### Text Colors

- Primary text: `#222222`
- Secondary text: `#717171`
- Tertiary text: `#484848`

---

## Layout & Grid System

### Grid Structure

Airbnb uses a consistent 4pt grid system for alignment and spacing.

**Main Layout Grid:**

- Desktop: 65% content area / 35% sidebar (e.g., map)
- Grid gap: 16px between columns
- Container: Centered with max-width

**Responsive Breakpoints:**

```css
/* Desktop */
@media (min-width: 1100px) {
  .wrapper {
    grid-template-columns: 65% 35%;
  }
}

/* Mobile */
@media (max-width: 1100px) {
  .wrapper {
    grid-template-columns: 1fr; /* Single column */
  }
}
```

### Card Grid

For property listings, Airbnb uses a responsive grid with auto-fill:

```css
.content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  grid-auto-rows: minmax(264px, auto);
  grid-gap: 16px;
}

/* Mobile */
@media (max-width: 1100px) {
  .content {
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    grid-auto-rows: minmax(300px, auto);
  }
}
```

---

## Spacing System

Airbnb uses generous spacing to create a calm, breathable UI.

**Base Unit:** 4px (used consistently throughout)

**Spacing Scale:**

- `4px` - Minimal spacing
- `8px` - Tight spacing (within components)
- `12px` - Small spacing
- `16px` - Medium spacing (default gap)
- `24px` - Large spacing (section padding)
- `32px` - Extra large spacing
- `48px` - Section separation
- `64px` - Major section breaks

### Padding Guidelines

**Cards:**

- Ample padding around each listing card to feel distinct
- Card padding: 8px - 16px
- Image margin: 16px

**Sections:**

- Header/Footer padding: 24px
- Content sections: 16px - 32px
- Container margins: Auto-centered

---

## Components

### Buttons

**Primary Button (CTA):**

```css
.btn-primary {
  background: linear-gradient(135deg, #fc642d 0%, #ff315b 100%);
  /* or solid: background: #FF385C; */
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 56, 92, 0.4);
}

.btn-primary:active {
  transform: translateY(1px);
}
```

**Secondary Button:**

```css
.btn-secondary {
  background: #ffffff;
  color: #222222;
  border: 1px solid #dddddd;
  border-radius: 8px;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  border-color: #222222;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

**Border Radius:**

- Standard buttons: `8px` - `12px`
- Pill-shaped buttons: `24px` - `50px`
- Small buttons/badges: `4px` - `6px`

### Cards (Frameless Airbnb Layout)

FoodShare adopts Airbnb's signature frameless card architecture with clean vertical hierarchy:

```tsx
<article className="group/card relative flex h-full min-w-0 flex-col @container/card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 rounded-2xl">
  {/* 1. Media: Aspect-[20/19] Carousel with Tactile Hover Zoom */}
  <div className="relative z-10 isolate overflow-hidden rounded-2xl bg-muted aspect-[20/19] w-full">
    <ProductCardActions product={product} />
    <ImageCarousel images={product.images} ... />
  </div>

  {/* 2. Content Stack: 4-Line Metadata Hierarchy */}
  <div className="flex flex-1 flex-col pt-3 gap-0.5">
    {/* Line 1: Title & Airbnb Star Rating Badge */}
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-[15px] font-semibold leading-snug text-foreground truncate">
        <Link href={productUrl}>{product.post_name}</Link>
      </h3>
      <span className="shrink-0 flex items-center gap-1 text-[13px] font-semibold text-foreground">
        <Star className="size-3.5 fill-amber-400 text-amber-400" />
        {ratingScore || "New"}
      </span>
    </div>

    {/* Line 2: Host Attribution or Organization */}
    <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground truncate">
      <User className="size-3.5" /> By {authorName}
    </p>

    {/* Line 3: Standardized Address & Pickup Hours */}
    <p className="flex items-center gap-1.5 text-[14px] text-muted-foreground truncate">
      <MapPin className="size-3.5" /> {displayAddress}
    </p>

    {/* Line 4: Price & Live Availability Indicator */}
    <div className="mt-1.5 flex items-center justify-between pt-0.5 text-[15px]">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">Free</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Available
        </span>
      </div>
    </div>
  </div>
</article>
```

### Media Fallback & Micro-Interactions

- **Organic Ambient Fallback**: Listings without images feature a warm ambient gradient (`bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-teal-500/10 dark:from-amber-950/25 dark:via-neutral-900 dark:to-emerald-950/20`), an ambient radial glow, and a frosted glass badge (`backdrop-blur-md bg-white/70 dark:bg-neutral-900/70 border border-white/60 dark:border-white/10 shadow-xs`) with category icon and label.
- **Card Hover Zoom**: Images smoothly scale `group-hover/card:scale-[1.04]` over a 500ms ease-out transition.
- **Wishlist Action**: Circular glass pill (`airbnb-action-btn`) with spring toggle (`fill-brand text-brand scale-110`).


### Search Bar

```css
.search-bar {
  background: #ffffff;
  border: 1px solid #dddddd;
  border-radius: 40px; /* Pill-shaped */
  padding: 12px 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.search-bar:focus-within {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border-color: #222222;
}

.search-input {
  border: none;
  outline: none;
  flex: 1;
  font-size: 14px;
  color: #222222;
}

.search-button {
  background: #ff385c;
  color: #ffffff;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
```

---

## Visual Effects

### Shadows

Airbnb uses subtle, layered shadows for depth:

```css
/* Card shadow */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

/* Card hover shadow */
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

/* Button shadow */
box-shadow: 0 4px 12px rgba(255, 56, 92, 0.4);

/* Modal/Dialog shadow */
box-shadow: 0 16px 48px rgba(0, 0, 0, 0.16);
```

### Border Radius

- **Cards:** 12px
- **Buttons:** 8px - 12px
- **Pills/Search bars:** 24px - 40px
- **Images:** 12px - 16px
- **Small elements:** 4px - 6px

### Transitions

```css
/* Standard transition */
transition: all 0.3s ease;

/* Button transition */
transition: all 0.2s ease;

/* Transform on hover */
transform: translateY(-4px);

/* Transform on active */
transform: translateY(1px);
```

---

## Design Principles

Airbnb's Design Language System focuses on creating unified designs across platforms.

### Key Principles:

1. **Simplicity and Clarity**
   - Proper spacing reduces cognitive load and helps users scan quickly
   - Clean lines and minimal clutter
   - Content-first approach

2. **Consistency**
   - Reusable components across all platforms
   - Unified color palette and typography
   - Systematic spacing and layout

3. **Accessibility**
   - Strong contrast for accessibility
   - Touch-friendly button sizes (minimum 44px)
   - Clear visual hierarchy

4. **Breathing Room**
   - Generous spacing creates a calm, trustworthy UI
   - Images get plenty of space
   - Consistent vertical rhythm

5. **Responsive Design**
   - Mobile-first approach
   - Fluid grids that adapt to screen size
   - Touch-optimized interactions

---

## Implementation Example

Here's a basic HTML/CSS structure to get started:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Airbnb Style Layout</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="wrapper">
      <header class="header">
        <nav>
          <!-- Navigation -->
        </nav>
      </header>

      <main class="content">
        <div class="card">
          <img class="card-img" src="property.jpg" alt="Property" />
          <div class="card-body">
            <h3 class="card-title">Beautiful Apartment</h3>
            <p class="card-subtitle">Entire home · 2 beds</p>
            <p class="card-price">$120 <span>/ night</span></p>
          </div>
        </div>
        <!-- More cards... -->
      </main>

      <aside class="sidebar">
        <!-- Map or filters -->
      </aside>

      <footer class="footer">
        <!-- Footer content -->
      </footer>
    </div>
  </body>
</html>
```

---

## Resources

### Official Resources

- Airbnb Design Language System articles on Medium
- Airbnb Design on Dribbble and Behance

### Font Alternatives

Since Airbnb Cereal is proprietary:

- **Circular** - Similar rounded, friendly aesthetic
- **Proxima Nova** - Professional sans-serif
- **Inter** - Free, excellent for UI
- **Source Sans Pro** - Free, readable
- **Avenir** - Clean, modern

### Tools

- Figma/Sketch for design mockups
- CSS Grid for layouts
- Flexbox for component alignment
- CSS Variables for color management

---

## Quick Start Checklist

- [ ] Set up color variables with Airbnb's palette
- [ ] Choose appropriate font fallback (Inter/Circular)
- [ ] Implement 4pt grid system
- [ ] Create reusable card components
- [ ] Add hover effects and transitions
- [ ] Ensure responsive breakpoints
- [ ] Test spacing consistency (8px, 16px, 24px)
- [ ] Implement rounded corners (8px-12px)
- [ ] Add subtle shadows for depth
- [ ] Optimize for mobile touch targets

---

## FoodShare Airbnb Implementation Reference

FoodShare incorporates core Airbnb design patterns adapted for surplus food and item sharing:

1. **Card Architecture (`ProductCard.tsx`)**:
   - Aspect ratio: `aspect-[20/19]` rounded image container (`rounded-2xl`).
   - Frameless layout with subtle hover elevation (`group-hover/card:shadow-md`).
   - Star rating badge aligned top-right (`★ 5.0 (12)` or `★ New`).
   - Live status pill indicators (`🟢 Available` / `🟠 Reserved`).
   - Tactile image zoom (`group-hover/card:scale-[1.04]`).

2. **Search Pill Navigation & Popovers (`SearchBar.tsx`)**:
   - 3-segment pill (`What` | `Distance` | `Category`) with 1px dividers.
   - Individual tactile pill activation (`rounded-full`, `hover:bg-muted/40`, `active:bg-muted shadow-xs`).
   - Circular brand coral trigger button (`variant="brand"` `#FF2D55`) with hover scale.
   - Interactive popover panel (`rounded-3xl border border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl p-5 sm:p-6`).
   - Interactive 3-column category tile grid (`grid-cols-2 sm:grid-cols-3 gap-2.5`) with 24px custom icons and active selection ring.
   - Distance preset chips (`1 km`, `2 km`, `5 km`, `10 km`, `Any distance`) with high-contrast active state.
   - Enhanced suggestions list with circular icon badges (`size-9 rounded-full bg-muted/60`).

3. **User Profile Capsule & Mobile Menu (`DesktopMenu.tsx`, `MobileMenu.tsx`)**:
   - Signature pill capsule button (`rounded-full border border-border/80 bg-background/80 py-1.25 ps-3.5 pe-1.5 shadow-2xs`).
   - Hamburger `Menu` icon + user avatar indicator (`NavbarAvatar size="sm"` on desktop, `User` badge on mobile).
   - Elevated glass dropdown menu on desktop (`rounded-2xl shadow-xl min-w-[240px]`).
   - Refined mobile drawer menu with touch-friendly cards (`rounded-2xl glass-subtle p-3.5`) and clear typography hierarchy.

4. **Floating Map/Listings Pill (`NavigateButtons.tsx`)**:
   - Floating centered pill (`rounded-full px-5 md:px-6 py-2.5 h-11`).
   - Dark/light mode adaptive high-contrast elevation (`bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-lg`).

5. **Category Scroller Navigation (`CategoryNavigation.tsx`)**:
   - Sleek 32px circular glass scroller buttons (`size-8 rounded-full border border-border/80 bg-background/95 shadow-xs`).
   - Active bottom indicator bar in foreground contrast (`h-0.5 bg-foreground rounded-full`).
   - Icon and label highlighted in `text-foreground font-semibold`.

6. **Footer Architecture & Legal Row (`Footer.tsx`)**:
   - Clean horizontal layout with copyright notice and `Privacy` / `Terms` links.
   - Community tribute and language selection dropdown.

7. **Category Filters Pill & Modal (`FiltersModal.tsx`)**:
   - Docks on the trailing side of the category scroller in `Navbar.tsx`.
   - `SlidersHorizontal` icon, "Filters" label, and active filter counter badge.
   - Preset discovery chips (`5 km`, `10 km`, `25 km`, `50 km`, `Any distance`), slider, and high-contrast action button.

8. **Listing Detail View & Modal (`PostDetailContent.tsx`)**:
   - Top-level title and metadata line with star score (`★ 5.0 (12)` or `★ New`), availability pill (`Available` / `Reserved`), and privacy-standardized address.
   - Framed hero media presentation with reference photo disclosure.
   - Circular host attribution card (`size-12 rounded-full`) and community badge.
   - Coral brand gradient CTA button for contacting the sharer.

9. **Map View, Markers & Popup Cards (`MapView.tsx`, `ProductPopup.tsx`, `leaflet.css`)**:
   - 20px rounded popup card container with glass backdrop blur and soft shadow elevation.
   - 145px rounded food cover image with warm organic fallback placeholder when no photo exists.
   - Live availability badge pill (`padding: 2.5px 9px; border-radius: 9999px; font-weight: 600;`).
   - Signature Airbnb brand coral gradient CTA button (`linear-gradient(135deg, #ff2d55 0%, #e6284d 100%)`) with hover glow.
   - Circular glass close button and dark mode theme support.
   - Tactile map marker pins with scale hover transitions.

10. **Listing Creation & Authentication Experience (`BecomeSharerBlock.tsx`, `AuthenticationUserModal.tsx`)**:
    - Floating `rounded-3xl` glass listing creation popover with tactile category cards and subtle icon badges.
    - Floating `rounded-3xl` authentication dialog with 48px rounded-xl input fields and focus rings.
    - Full-width brand coral primary action button and tactile social auth buttons.

11. **Feed Continuation & Category Discovery (`ProductGrid.tsx`)**:
    - Centered "Browse Categories" section rendered at the bottom of exhausted listing feeds.
    - Sparkle badge icon, localized heading/subtitle, and interactive category chips (`Food`, `Zero Waste`, `Things`, `Borrow`, `Wanted`, `Fridges`, `FoodBanks`, `Volunteers`).

12. **Host Profile & Identity Badge Architecture (`ViewProfileClient.tsx`, `ProfileActions.tsx`, `ListingPersonCards.tsx`)**:
    - Two-column Airbnb host profile layout with floating ID badge card, circular verified avatar, and credential stat tiles.
    - Dedicated About section with primary brand coral message CTA.
    - Anchored avatar edit button on profile settings eliminating legacy viewport positioning.

13. **Interactive Share Popover Architecture (`ShareButton.tsx`)**:
    - Sleek 40px rounded-full icon button and default pill button with `Share` label.
    - Floating `rounded-2xl` glass dropdown menu with circular brand platform badges (WhatsApp, Telegram, X, Facebook, Email).
    - Quick "Copy link" action with dynamic green confirmation feedback.

14. **Wishlist & Top Action Pairing (`PostDetailContent.tsx`)**:
    - Docked `Share` and `Save` (Wishlist) pill buttons in top-right action cluster.
    - Interactive heart wishlist toggle with optimistic feedback and live like counters.
    - Full-width brand coral primary action button and tactile review rating container.

15. **Warm Empty State & Community Discovery (`EmptyListingState.tsx`)**:
    - Floating `rounded-3xl` glass container with ambient radial glow and category badge icon.
    - Empathetic copy and signature brand coral primary CTA to share goods or food.
    - Quick category shortcut chips and secondary clear search action.

16. **Post-Exchange Feedback & Rating Experience (`PopupNotificationModal.tsx`)**:
    - Modernized `rounded-3xl` dialog with tactile star rating buttons (`hover:scale-125`).
    - Rounded-xl textarea input and brand coral action CTA button.

17. **Host Listing Creation Experience (`NewProductForm.tsx`)**:
    - High-elevation `rounded-3xl` glass container with ambient backdrop blur (`p-6 sm:p-10 space-y-6`).
    - Pill-shaped Back button (`h-9 px-3.5 rounded-full`) and custom header badge.
    - Photo uploader with "Cover photo" badge pill on cover image, circular glass remove button, and dashed dropzone.
    - AI Draft assistant pill button with `Sparkles` icon and animated state.
    - 48px rounded-xl input fields and selects with brand coral focus rings.
    - Full-width / flex brand coral gradient submit buttons (`bg-gradient-to-r from-[#FF2D55] to-[#FF385C]`) for both standard listings and volunteer applications.

18. **Volunteer Community Card & Empty State Architecture (`VolunteerPostcard.tsx`, `VolunteerGrid.tsx`)**:
    - Floating `rounded-3xl` glass cards with ambient emerald glow and verified avatar shield badge.
    - Tactile skill indicator chips with dedicated Lucide category icons (`Car`, `ChefHat`, `ClipboardList`, `Smartphone`, `Camera`, `Globe`, `Code`, `HeartHandshake`).
    - Standardized location and availability metadata footer.
    - Welcoming zero-state dialog container with `HeartHandshake` badge and brand coral volunteer application CTA.

19. **High-Elevation Search Modal & Category Exploration (`SearchModal.tsx`)**:
    - Modernized `rounded-3xl` modal dialog with 56px rounded-2xl input field.
    - Integrated brand coral gradient search action button.
    - Tactile category exploration chips (`rounded-full`) with active selection state and smooth transitions.

20. **Authentication, Password Recovery & Account Personal Information (`AuthenticationUserModal.tsx`, `LoginForm.tsx`, `ResetPasswordForm.tsx`, `ProfileBlocks.tsx`)**:
    - Complete deprecation of hardcoded `#FF2D55`/`#FF385C` hex and legacy gradient buttons in favor of canonical `--brand-primary` tokens (`bg-brand`, `bg-brand-hover`, `text-brand`, `focus:border-brand`, `focus:ring-brand/20`).
    - Standardized 48px rounded-xl input controls with active brand elevation across login, signup, reset password, and profile editing.
    - Personal info blocks (`NameBlock.tsx`, `EmailBlock.tsx`, `PhoneNumberBlock.tsx`, `AddressBlock.tsx`) elevated to `rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl p-6 shadow-xs hover:shadow-md` cards with clean typography and rounded-full edit/cancel pill triggers.

21. **Category Navigation, Feedback & System Banner Architecture (`CategoryNav.tsx`, `FeedbackModal.tsx`, `LocationPermissionBanner.tsx`)**:
    - `CategoryNav.tsx` elevated with logical inset underline indicator (`inset-x-2 bottom-0 h-0.5 bg-foreground rounded-full`), active `text-brand` iconography, and capsule search/filter action buttons (`rounded-full border border-border/80 bg-background/80 hover:border-foreground/40 shadow-2xs`).
    - `FeedbackModal.tsx` upgraded to a `rounded-3xl border border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl` dialog with 44px rounded-xl input fields and a tokenized brand primary action button (`bg-brand hover:bg-brand-hover`).
    - `LocationPermissionBanner.tsx` aligned with `rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-xs` card surfaces and pill-style retry actions.

---

_This is a living document. Update as you build and discover new patterns!_
