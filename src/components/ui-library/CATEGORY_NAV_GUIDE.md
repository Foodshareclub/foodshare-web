# Airbnb Category Navigation Guide

## Overview

The category navigation component provides a clean, Airbnb-style horizontal navigation bar with categories, search, and filter buttons.

## Centralized Categories

Categories are defined in `@/constants/categories.ts` and use i18n translation keys for labels:

```typescript
import { CATEGORIES, CategoryId, getCategoryById, DEFAULT_CATEGORY } from "@/constants/categories";

// CATEGORIES structure:
// { id: 'food', labelKey: 'categories.food', icon: '🍎' }
```

**Built-in Categories (Order: Food basics → Community resources → Lifestyle → Engagement → Forum):**

| ID            | Icon | Translation Key          |
| ------------- | ---- | ------------------------ |
| food          | 🍎   | categories.food          |
| things        | 🎁   | categories.things        |
| borrow        | 🔧   | categories.borrow        |
| wanted        | 📦   | categories.wanted        |
| foodbanks     | 🏠   | categories.foodbanks     |
| fridges       | ❄️   | categories.fridges       |
| zerowaste     | ♻️   | categories.zerowaste     |
| vegan         | 🌱   | categories.vegan         |
| organisations | 🏛️   | categories.organisations |
| volunteers    | 🙌🏻   | categories.volunteers    |
| challenges    | 🏆   | categories.challenges    |
| forum         | 💬   | categories.forum         |

## Components

### 1. FoodShareCategoryNav (Pre-configured)

Ready-to-use component with FoodShare categories. Uses centralized `CATEGORIES` constant and `next-intl` for translations.

```tsx
import { FoodShareCategoryNav } from "@/components/airbnb";

function MyPage() {
  const [activeCategory, setActiveCategory] = useState("food");

  return (
    <FoodShareCategoryNav
      activeCategory={activeCategory}
      onCategoryChange={(id) => setActiveCategory(id)}
      onSearch={() => console.log("Search clicked")}
      onFilter={() => console.log("Filter clicked")}
    />
  );
}
```

### 2. AirbnbCategoryNav (Customizable)

Flexible component for custom categories.

```tsx
import { AirbnbCategoryNav, Category } from "@/components/airbnb";

const categories: Category[] = [
  { id: "all", label: "All", icon: "🌟" },
  { id: "new", label: "New", icon: "✨" },
  { id: "popular", label: "Popular", icon: "🔥" },
];

function MyPage() {
  return (
    <AirbnbCategoryNav
      categories={categories}
      activeCategory="all"
      onCategoryChange={(id) => console.log(id)}
      showSearch={true}
      showFilter={true}
    />
  );
}
```

## Props

### FoodShareCategoryNav

| Prop               | Type                   | Default  | Description                     |
| ------------------ | ---------------------- | -------- | ------------------------------- |
| `activeCategory`   | `string`               | `'food'` | Currently active category ID    |
| `onCategoryChange` | `(id: string) => void` | -        | Callback when category changes  |
| `onSearch`         | `() => void`           | -        | Callback when search is clicked |
| `onFilter`         | `() => void`           | -        | Callback when filter is clicked |

### AirbnbCategoryNav

| Prop               | Type                   | Default      | Description                     |
| ------------------ | ---------------------- | ------------ | ------------------------------- |
| `categories`       | `Category[]`           | **required** | Array of category objects       |
| `activeCategory`   | `string`               | -            | Currently active category ID    |
| `onCategoryChange` | `(id: string) => void` | -            | Callback when category changes  |
| `onSearch`         | `() => void`           | -            | Callback when search is clicked |
| `onFilter`         | `() => void`           | -            | Callback when filter is clicked |
| `showSearch`       | `boolean`              | `true`       | Show/hide search button         |
| `showFilter`       | `boolean`              | `true`       | Show/hide filter button         |

### Category Type

```typescript
// Centralized category type (from @/constants/categories)
interface Category {
  id: CategoryId; // Unique identifier (type-safe)
  labelKey: string; // i18n translation key (e.g., 'categories.food')
  icon: string; // Emoji icon
}

// For custom categories with AirbnbCategoryNav
interface CustomCategory {
  id: string; // Unique identifier
  label: string; // Display text (direct, not i18n key)
  icon: React.ReactNode | string; // Icon (emoji or component)
}
```

## Features

### ✨ Sticky Navigation

The navigation bar sticks to the top of the page while scrolling.

### 🎯 Active Indicator

A bottom border appears under the active category.

### 🖱️ Hover Effects

Categories become more opaque on hover for better UX.

### 📱 Mobile Responsive

Horizontal scrolling on mobile devices with hidden scrollbar.

### 🔍 Search & Filter

Quick access buttons on the right side.

## Styling

### Using CSS Classes

```html
<div class="airbnb-category-nav">
  <div class="airbnb-category-container">
    <div class="airbnb-category-item active">
      <div class="airbnb-category-icon">🍎</div>
      <div class="airbnb-category-label">Food</div>
      <div class="airbnb-category-indicator"></div>
    </div>
  </div>
</div>
```

### Custom Styling

```tsx
<FoodShareCategoryNav
  activeCategory="food"
  // Add custom styles via Chakra props
  css={{
    borderBottom: "2px solid #FF385C",
  }}
/>
```

## Integration Examples

### With React Router

```tsx
import { useNavigate, useParams } from "react-router-dom";
import { FoodShareCategoryNav } from "@/components/airbnb";

function ProductsPage() {
  const navigate = useNavigate();
  const { category } = useParams();

  return (
    <>
      <FoodShareCategoryNav
        activeCategory={category || "food"}
        onCategoryChange={(id) => navigate(`/products/${id}`)}
        onSearch={() => navigate("/search")}
        onFilter={() => navigate("/filter")}
      />
      {/* Your content */}
    </>
  );
}
```

### With State Management (Redux)

```tsx
import { useDispatch, useSelector } from "react-redux";
import { setCategory } from "@/store/slices/productsSlice";
import { FoodShareCategoryNav } from "@/components/airbnb";

function ProductsPage() {
  const dispatch = useDispatch();
  const activeCategory = useSelector((state) => state.products.category);

  return (
    <FoodShareCategoryNav
      activeCategory={activeCategory}
      onCategoryChange={(id) => dispatch(setCategory(id))}
    />
  );
}
```

### With URL Query Params

```tsx
import { useSearchParams } from "react-router-dom";
import { FoodShareCategoryNav } from "@/components/airbnb";

function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") || "food";

  return (
    <FoodShareCategoryNav
      activeCategory={category}
      onCategoryChange={(id) => {
        setSearchParams({ category: id });
      }}
    />
  );
}
```

## Custom Icons

### Using React Icons

```tsx
import { FaAppleAlt, FaGift } from "react-icons/fa";
import { AirbnbCategoryNav } from "@/components/airbnb";

const categories = [
  {
    id: "food",
    label: "Food",
    icon: <FaAppleAlt size={24} />,
  },
  {
    id: "gifts",
    label: "Gifts",
    icon: <FaGift size={24} />,
  },
];
```

### Using SVG

```tsx
const categories = [
  {
    id: "custom",
    label: "Custom",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
      </svg>
    ),
  },
];
```

## Accessibility

The component includes:

- Keyboard navigation support
- Proper ARIA labels
- Focus states
- Screen reader friendly

## Performance Tips

1. **Memoize callbacks** to prevent unnecessary re-renders:

```tsx
const handleCategoryChange = useCallback((id: string) => {
  setCategory(id);
}, []);
```

2. **Use React.memo** for the component:

```tsx
const MemoizedNav = React.memo(FoodShareCategoryNav);
```

3. **Categories are centralized** - no need to memoize:

```tsx
// Categories are imported from @/constants/categories
// They're defined as `const` and don't need useMemo
import { CATEGORIES } from "@/constants/categories";
```

## Troubleshooting

### Categories not scrolling on mobile

Make sure the parent container doesn't have `overflow: hidden`.

### Active indicator not showing

Verify that `activeCategory` matches a category `id` exactly.

### Hover effects not working

Check that the component is not inside a container with `pointer-events: none`.

## Examples

See the full example at:

- `src/pages/examples/CategoryNavExample.tsx`

## Related Components

- `AirbnbCard` - For displaying category items
- `AirbnbGrid` - For grid layout of items
- `AirbnbSearchBar` - Alternative search component

---

**Need help?** Check the main integration guide at `src/theme/AIRBNB_INTEGRATION_GUIDE.md`
