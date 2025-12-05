# Map Components

## Overview

FoodShare uses Leaflet maps in two contexts:

1. **Split-View Layout** - Main listing pages with Airbnb-style 65/35 split
2. **Product Detail Map** - Single product location view with enhanced UI

---

## Split-View Layout (Listing Pages)

The main listing page features an Airbnb-style split-view layout:

- **Left side (65%)**: Scrollable product listings
- **Right side (35%)**: Sticky Leaflet map showing product locations

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

### Breakpoints

- **Mobile (< 1100px)**: Single column, no map
- **Desktop (>= 1100px)**: 65/35 split with sticky map

---

## Product Detail Map

The `Leaflet.tsx` component provides a beautiful map view for individual product pages.

### Features

- **CARTO Voyager Tiles** - Clean, modern map style (replaces plain OpenStreetMap)
- **Custom Animated Marker** - Pulse animation with brand colors (#FF2D55)
- **Radius Circle** - Subtle 200m radius indicator around location
- **Interactive Popup** - Shows product name, type, address, and description
- **Floating Info Card** - Glassmorphism overlay with product details and hours
- **Graceful Loading States** - Emoji placeholders for loading/unavailable states

### Visual Design

```
┌─────────────────────────────────────┐
│                                     │
│         CARTO Voyager Map           │
│                                     │
│              ◉ ← Pulse marker       │
│           (  ) ← Radius circle      │
│                                     │
│  ┌─────────────────────┐            │
│  │ 📍 Product Name     │ ← Floating │
│  │    Address          │   info card│
│  │ 🕐 Available hours  │            │
│  └─────────────────────┘            │
└─────────────────────────────────────┘
```

### Usage

```tsx
import dynamic from 'next/dynamic';

const Leaflet = dynamic(() => import('@/components/leaflet/Leaflet'), {
  ssr: false,
  loading: () => <div className="h-[300px] bg-gray-100 animate-pulse" />,
});

// In product detail page
<Leaflet product={product} />
```

### Styling Files

- `src/components/leaflet/leaflet.css` - Base map styles
- `src/components/leaflet/leaflet-glass.css` - Glassmorphism effects

---

## Common Features

### Performance Optimizations

- **Canvas renderer**: Better performance for many markers
- **GPU acceleration**: All animations use `transform: translateZ(0)`
- **Memoization**: React Compiler auto-memoizes, manual memo removed
- **Lazy loading**: Maps only render on client (dynamic import with `ssr: false`)

### Map Tiles

| Context | Tile Provider | Style |
|---------|---------------|-------|
| Split-view | OpenStreetMap | Standard |
| Product detail | CARTO | Voyager (light, modern) |

---

## Routes Using Maps

Split-view enabled on:
- `/food`, `/things`, `/borrow`, `/wanted`
- All other category routes

Product detail map on:
- `/food/[id]` and similar detail pages

---

## Future Enhancements

- [ ] Marker clustering for 100+ products
- [ ] Custom marker icons per category
- [ ] Map filters (price, distance, etc.)
- [ ] Geolocation "Near me" button
- [ ] Save map position in URL params
