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

### Cards

```css
.card {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 12px;
}

.card-body {
  padding: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #222222;
  margin-bottom: 4px;
}

.card-subtitle {
  font-size: 14px;
  color: #717171;
}
```

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

_This is a living document. Update as you build and discover new patterns!_
