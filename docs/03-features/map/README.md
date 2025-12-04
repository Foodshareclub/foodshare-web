# Split-View Layout with Map

## Overview

The main listing page now features an Airbnb-style split-view layout:

- **Left side (65%)**: Scrollable product listings
- **Right side (35%)**: Sticky Leaflet map showing product locations

## Implementation

### Components

1. **MainWithMap.tsx** - Main container with split-view layout
   - Manages hover and selection state
   - Responsive: map hidden on mobile, full-width listings
   - Uses CSS Grid for 65/35 split on desktop

2. **MapView.tsx** - Leaflet map component
   - Canvas renderer for better performance
   - Custom marker icons that scale on hover/select
   - Auto-fits bounds to show all products
   - Syncs with product card hover states

3. **ProductCard.tsx** - Enhanced with hover callbacks
   - Triggers map marker highlight on hover
   - Passes hover/click events to parent

### Features

- **Interactive markers**: Click to select, hover to highlight
- **Synchronized states**: Hovering a card highlights its marker
- **GPU-accelerated**: All animations use transform/opacity
- **Responsive**: Map only shows on desktop (>= 1100px)
- **Performance optimized**: Canvas renderer, memoized selectors

### Styling

Custom map styles in `src/styles/map.css`:

- Airbnb-inspired popup design
- Smooth marker animations
- Custom zoom controls
- Glassmorphism effects

### Breakpoints

Following Airbnb's design system:

- **Mobile (< 1100px)**: Single column, no map
- **Desktop (>= 1100px)**: 65/35 split with sticky map

## Usage

The split-view is automatically enabled on the main listing pages:

- `/food`
- `/things`
- `/borrow`
- `/wanted`
- All other category routes

## Performance

- **Canvas renderer**: Better performance for many markers
- **GPU acceleration**: All animations use `transform: translateZ(0)`
- **Memoization**: React.memo on all components
- **Lazy loading**: Map only renders on desktop

## Future Enhancements

- [ ] Marker clustering for 100+ products
- [ ] Custom marker icons per category
- [ ] Map filters (price, distance, etc.)
- [ ] Geolocation "Near me" button
- [ ] Save map position in URL params
