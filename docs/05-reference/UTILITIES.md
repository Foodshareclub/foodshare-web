# FoodShare Utilities Reference

**Last Updated:** December 14, 2024

## Overview

This document provides a comprehensive reference for utility functions and hooks available in the FoodShare codebase. Utilities are located in `src/utils/` and hooks in `src/hooks/`.

---

## React Hooks

### useViewTracking

**Location:** `src/hooks/useViewTracking.ts`

A hook for automatic post view tracking with visibility detection using Intersection Observer. Includes deduplication, scroll depth tracking, and duration tracking.

**Signature:**

```typescript
function useViewTracking(options: UseViewTrackingOptions): {
  ref: React.RefObject<HTMLElement>;
  viewCount: number | null;
  hasRecordedView: boolean;
  scrollDepth: number;
};

interface UseViewTrackingOptions {
  postId: number;
  minVisibleTime?: number; // Default: 1000ms
  trackScrollDepth?: boolean; // Default: false
  trackDuration?: boolean; // Default: false
  referrer?: string;
  source?: "direct" | "search" | "social" | "internal";
  onViewRecorded?: (views: number) => void;
}
```

**When to Use:**

- Post detail pages to track views automatically
- When you need visibility-based view counting (50% visible for 1 second)
- For analytics with scroll depth and time-on-page tracking

**Example:**

```typescript
'use client';

import { useViewTracking } from '@/hooks/useViewTracking';

function PostDetail({ post }) {
  const { ref, viewCount, hasRecordedView } = useViewTracking({
    postId: post.id,
    trackScrollDepth: true,
    trackDuration: true,
    source: 'internal',
    onViewRecorded: (views) => console.log(`Post now has ${views} views`),
  });

  return (
    <article ref={ref}>
      <h1>{post.title}</h1>
      {viewCount && <span>{viewCount} views</span>}
    </article>
  );
}
```

**Features:**

- Intersection Observer for visibility detection (50% threshold)
- Minimum visible time before counting (prevents scroll-by views)
- Session-based deduplication (30-second cooldown server-side)
- Optional scroll depth tracking (0-100%)
- Duration tracking (tracked internally, recorded on unmount)
- Records detailed analytics on unmount

---

### useSimpleViewTracking

**Location:** `src/hooks/useViewTracking.ts`

A simpler hook that just records a view on component mount. Use when you don't need visibility detection.

**Signature:**

```typescript
function useSimpleViewTracking(postId: number): void;
```

**Example:**

```typescript
'use client';

import { useSimpleViewTracking } from '@/hooks/useViewTracking';

function PostDetail({ post }) {
  useSimpleViewTracking(post.id);
  return <article>...</article>;
}
```

---

### useImageBlobUrl

**Location:** `src/hooks/useImageBlobUrl.ts`

A hook for managing image blob URLs with proper memory cleanup. Ensures that blob URLs created via `URL.createObjectURL()` are properly revoked to prevent memory leaks.

**Signature:**

```typescript
function useImageBlobUrl(options: UseImageBlobUrlOptions): UseImageBlobUrlResult;

interface UseImageBlobUrlOptions {
  fetchFn: () => Promise<Blob | null>;
  enabled?: boolean;
  deps?: unknown[];
}

interface UseImageBlobUrlResult {
  blobUrl: string | null;
  data: string | null; // Alias for blobUrl
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**When to Use:**

- Downloading and displaying images from Supabase Storage
- Any scenario where you need to create blob URLs from fetched data
- When you need automatic cleanup of blob URLs on unmount or refetch

**Example:**

```typescript
'use client';

import { useImageBlobUrl } from '@/hooks/useImageBlobUrl';
import { storageAPI } from '@/api/storageAPI';

function ProductImage({ imagePath }: { imagePath: string }) {
  const { blobUrl, isLoading, error } = useImageBlobUrl({
    fetchFn: async () => {
      const { data } = await storageAPI.downloadImage({ path: imagePath });
      return data ?? null;
    },
    enabled: !!imagePath,
    deps: [imagePath],
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (error || !blobUrl) return <div>Failed to load image</div>;

  return <img src={blobUrl} alt="Product" />;
}
```

**Memory Management:**

The hook automatically revokes blob URLs when:

- The component unmounts
- A new blob URL replaces the old one
- The fetch is triggered again (via deps change or refetch)

**Note:** For most cases, prefer using Next.js `<Image>` component with direct URLs from Supabase Storage. Use this hook only when you need to download blobs directly (e.g., for private storage buckets or image processing).

---

## PostGIS Utilities

**Location:** `src/utils/postgis.ts`

### Purpose

Handle PostGIS POINT data types and coordinate conversions for location-based features. Provides parsing, creation, and distance calculation utilities.

### Key Features

- ✅ Parse multiple PostGIS formats (WKT, GeoJSON, raw objects)
- ✅ Create PostGIS-compatible WKT strings
- ✅ Calculate distances using Haversine formula
- ✅ Format distances for human-readable display
- ✅ Type-safe with TypeScript interfaces

---

### parsePostGISPoint()

Parse PostGIS location data into a standardized lat/lng object with coordinate validation.

**Signature:**

```typescript
function parsePostGISPoint(location: unknown): PostGISPoint | null;
```

**Supported Input Formats:**

1. **GeoJSON Object** (preferred):

   ```typescript
   {
     type: "Point",
     coordinates: [14.4208, 50.0875]  // [lng, lat]
   }
   ```

2. **Raw Coordinates Object**:

   ```typescript
   {
     coordinates: [14.4208, 50.0875]; // [lng, lat]
   }
   ```

3. **WKT String** (Well-Known Text):

   ```typescript
   "POINT(14.4208 50.0875)";
   ```

4. **Stringified GeoJSON**:

   ```typescript
   '{"type":"Point","coordinates":[14.4208,50.0875]}';
   ```

5. **WKB Hex String**: Returns `null` - use `ST_AsGeoJSON()` in your query instead.

**Returns:**

```typescript
interface PostGISPoint {
  latitude: number; // Decimal degrees (-90 to 90)
  longitude: number; // Decimal degrees (-180 to 180)
}
```

Returns `null` if:

- Input is invalid or cannot be parsed
- Coordinates are outside valid ranges
- Coordinates are (0, 0) - often indicates invalid/default data

**Examples:**

```typescript
import { parsePostGISPoint } from "@/utils/postgis";

// Parse GeoJSON from API (preferred)
const location1 = parsePostGISPoint({
  type: "Point",
  coordinates: [14.4208, 50.0875],
});
// { latitude: 50.0875, longitude: 14.4208 }

// Parse WKT string from database
const location2 = parsePostGISPoint("POINT(14.4208 50.0875)");
// { latitude: 50.0875, longitude: 14.4208 }

// Parse stringified JSON
const location3 = parsePostGISPoint('{"type":"Point","coordinates":[14.4208,50.0875]}');
// { latitude: 50.0875, longitude: 14.4208 }

// Handle invalid input
const location4 = parsePostGISPoint(null);
// null

const location5 = parsePostGISPoint("invalid");
// null

// Invalid coordinates (0, 0) are filtered out
const location6 = parsePostGISPoint({ coordinates: [0, 0] });
// null
```

**Use Cases:**

- Parsing location data from Supabase database
- Converting API responses to standardized format
- Preparing coordinates for map display (Leaflet)
- Handling stringified JSON from various sources

---

### createPostGISPoint()

Create a PostGIS-compatible WKT string from latitude and longitude.

**Signature:**

```typescript
function createPostGISPoint(lat: number, lng: number): string;
```

**Parameters:**

- `lat` - Latitude in decimal degrees (-90 to 90)
- `lng` - Longitude in decimal degrees (-180 to 180)

**Returns:**

WKT string with SRID 4326 (WGS84 coordinate system):

```
"SRID=4326;POINT(longitude latitude)"
```

**Note:** PostGIS uses `(longitude latitude)` order, not `(latitude longitude)`.

**Examples:**

```typescript
import { createPostGISPoint } from "@/utils/postgis";

// Prague coordinates
const wkt = createPostGISPoint(50.0755, 14.4378);
// "SRID=4326;POINT(14.4378 50.0755)"

// Insert into database
await supabase.from("posts").insert({
  post_name: "Fresh Apples",
  post_address: "123 Main St, Prague",
  location: createPostGISPoint(50.0755, 14.4378),
});

// Update existing record
await supabase
  .from("posts")
  .update({
    location: createPostGISPoint(newLat, newLng),
  })
  .eq("id", postId);
```

**Use Cases:**

- Creating new posts with location data
- Updating post locations
- Storing user-selected map coordinates

---

### calculateDistance()

Calculate the great-circle distance between two points using the Haversine formula.

**Signature:**

```typescript
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
```

**Parameters:**

- `lat1`, `lng1` - First point coordinates (decimal degrees)
- `lat2`, `lng2` - Second point coordinates (decimal degrees)

**Returns:**

Distance in meters (number)

**Algorithm:**

Uses the Haversine formula for calculating great-circle distances on a sphere:

- Assumes Earth radius of 6,371,000 meters
- Accurate for most use cases (±0.5% error)
- Fast computation suitable for client-side filtering

**Examples:**

```typescript
import { calculateDistance } from "@/utils/postgis";

// Prague to Brno
const distance = calculateDistance(
  50.0755,
  14.4378, // Prague
  49.1951,
  16.6068 // Brno
);
// ~195000 (meters)

// User location to product
const userLat = 50.0875;
const userLng = 14.4208;
const productLat = 50.0755;
const productLng = 14.4378;

const distanceToProduct = calculateDistance(userLat, userLng, productLat, productLng);
// ~1500 (meters)

// Filter products within 5km
const nearbyProducts = products.filter((product) => {
  const location = parsePostGISPoint(product.location);
  if (!location) return false;

  const distance = calculateDistance(userLat, userLng, location.latitude, location.longitude);

  return distance <= 5000; // 5km in meters
});
```

**Use Cases:**

- Filtering products by distance
- Sorting products by proximity
- Displaying "X km away" on product cards
- Implementing radius-based search

---

### formatDistance()

Format a distance in meters to a human-readable string.

**Signature:**

```typescript
function formatDistance(meters: number): string;
```

**Parameters:**

- `meters` - Distance in meters

**Returns:**

Formatted string:

- `< 1000m`: "X m" (rounded to nearest meter)
- `>= 1000m`: "X.X km" (one decimal place)

**Examples:**

```typescript
import { formatDistance } from "@/utils/postgis";

formatDistance(50); // "50 m"
formatDistance(500); // "500 m"
formatDistance(999); // "999 m"
formatDistance(1000); // "1.0 km"
formatDistance(1500); // "1.5 km"
formatDistance(12345); // "12.3 km"
formatDistance(195000); // "195.0 km"
```

**Use Cases:**

- Displaying distance on product cards
- Showing distance in search results
- Map marker tooltips
- Distance filters UI

---

## Complete Usage Example

Here's a complete example showing how to use all PostGIS utilities together:

```typescript
import {
  parsePostGISPoint,
  createPostGISPoint,
  calculateDistance,
  formatDistance
} from '@/utils/postgis';

// Component: ProductCard
const ProductCard: React.FC<{ product: Product; userLocation: PostGISPoint }> = ({
  product,
  userLocation
}) => {
  // Parse product location from database
  const productLocation = parsePostGISPoint(product.location);

  // Calculate distance if both locations available
  const distance = productLocation && userLocation
    ? calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        productLocation.latitude,
        productLocation.longitude
      )
    : null;

  // Format for display
  const distanceText = distance !== null
    ? formatDistance(distance)
    : 'Distance unknown';

  return (
    <Box>
      <Text>{product.post_name}</Text>
      <Text fontSize="sm" color="gray.600">
        📍 {distanceText} away
      </Text>
    </Box>
  );
};

// Component: CreateProductForm
const CreateProductForm: React.FC = () => {
  const [lat, setLat] = useState<number>(50.0755);
  const [lng, setLng] = useState<number>(14.4378);

  const handleSubmit = async () => {
    // Create PostGIS point for database
    const location = createPostGISPoint(lat, lng);

    const { error } = await supabase.from('posts').insert({
      post_name: 'Fresh Vegetables',
      post_address: '123 Main St',
      location: location,  // PostGIS WKT string
      // ... other fields
    });

    if (error) {
      console.error('Error creating product:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};

// Hook: useNearbyProducts
const useNearbyProducts = (userLocation: PostGISPoint | null, radiusKm: number = 5) => {
  const [nearbyProducts, setNearbyProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!userLocation) return;

    const fetchProducts = async () => {
      const { data: products } = await supabase
        .from('posts')
        .select('*')
        .eq('active', true);

      if (!products) return;

      // Filter by distance client-side
      const nearby = products
        .map(product => {
          const location = parsePostGISPoint(product.location);
          if (!location) return null;

          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            location.latitude,
            location.longitude
          );

          return { ...product, distance };
        })
        .filter(p => p !== null && p.distance <= radiusKm * 1000)
        .sort((a, b) => a.distance - b.distance);

      setNearbyProducts(nearby);
    };

    fetchProducts();
  }, [userLocation, radiusKm]);

  return nearbyProducts;
};
```

---

## Migration Guide

If you're migrating from the old coordinate handling system:

### Before (Old Way)

```typescript
// Accessing coordinates directly
const lat = product.latitude;
const lng = product.longitude;

// Manual distance calculation
const R = 6371000;
const dLat = ((lat2 - lat1) * Math.PI) / 180;
// ... complex calculation
```

### After (New Way)

```typescript
// Parse PostGIS location
const location = parsePostGISPoint(product.location);
const lat = location?.latitude;
const lng = location?.longitude;

// Simple distance calculation
const distance = calculateDistance(lat1, lng1, lat2, lng2);
const formatted = formatDistance(distance);
```

---

## Performance Considerations

### Client-Side Distance Filtering

For small datasets (< 1000 products):

- ✅ Use `calculateDistance()` client-side
- ✅ Fast and simple
- ✅ No database queries needed

For large datasets (> 1000 products):

- ⚠️ Consider PostGIS database queries with `ST_Distance`
- ⚠️ Use spatial indexes for performance
- ⚠️ Filter on server-side before sending to client

### Example: Server-Side Distance Query

```sql
-- Use PostGIS ST_Distance for large datasets
SELECT *,
  ST_Distance(
    location::geography,
    ST_SetSRID(ST_MakePoint(14.4378, 50.0755), 4326)::geography
  ) as distance
FROM posts
WHERE ST_DWithin(
  location::geography,
  ST_SetSRID(ST_MakePoint(14.4378, 50.0755), 4326)::geography,
  5000  -- 5km radius
)
ORDER BY distance;
```

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from "vitest";
import {
  parsePostGISPoint,
  createPostGISPoint,
  calculateDistance,
  formatDistance,
} from "@/utils/postgis";

describe("PostGIS Utilities", () => {
  describe("parsePostGISPoint", () => {
    it("should parse GeoJSON object", () => {
      const result = parsePostGISPoint({
        type: "Point",
        coordinates: [14.4208, 50.0875],
      });
      expect(result).toEqual({
        latitude: 50.0875,
        longitude: 14.4208,
      });
    });

    it("should parse WKT string (case-insensitive)", () => {
      const result = parsePostGISPoint("POINT(14.4208 50.0875)");
      expect(result).toEqual({
        latitude: 50.0875,
        longitude: 14.4208,
      });
    });

    it("should parse stringified GeoJSON", () => {
      const result = parsePostGISPoint('{"type":"Point","coordinates":[14.4208,50.0875]}');
      expect(result).toEqual({
        latitude: 50.0875,
        longitude: 14.4208,
      });
    });

    it("should return null for invalid input", () => {
      expect(parsePostGISPoint(null)).toBeNull();
      expect(parsePostGISPoint("invalid")).toBeNull();
    });

    it("should return null for out-of-range coordinates", () => {
      expect(parsePostGISPoint({ coordinates: [200, 100] })).toBeNull();
    });

    it("should return null for (0, 0) coordinates", () => {
      expect(parsePostGISPoint({ coordinates: [0, 0] })).toBeNull();
    });
  });

  describe("createPostGISPoint", () => {
    it("should create WKT string", () => {
      const result = createPostGISPoint(50.0755, 14.4378);
      expect(result).toBe("SRID=4326;POINT(14.4378 50.0755)");
    });
  });

  describe("calculateDistance", () => {
    it("should calculate distance between Prague and Brno", () => {
      const distance = calculateDistance(
        50.0755,
        14.4378, // Prague
        49.1951,
        16.6068 // Brno
      );
      expect(distance).toBeCloseTo(195000, -3); // ~195km ±1km
    });
  });

  describe("formatDistance", () => {
    it("should format meters", () => {
      expect(formatDistance(500)).toBe("500 m");
    });

    it("should format kilometers", () => {
      expect(formatDistance(1500)).toBe("1.5 km");
    });
  });
});
```

---

## Troubleshooting

### Issue: "Cannot read property 'latitude' of null"

**Cause:** `parsePostGISPoint()` returned `null` due to invalid input

**Solution:** Always check for null before accessing properties

```typescript
const location = parsePostGISPoint(product.location);
if (location) {
  const { latitude, longitude } = location;
  // Use coordinates
} else {
  console.warn("Invalid location data for product:", product.id);
}
```

---

### Issue: Distance calculations seem incorrect

**Cause:** Coordinate order confusion (lat/lng vs lng/lat)

**Solution:** Always use `(latitude, longitude)` order for function parameters

```typescript
// ✅ Correct
calculateDistance(lat1, lng1, lat2, lng2);

// ❌ Wrong
calculateDistance(lng1, lat1, lng2, lat2);
```

---

### Issue: PostGIS insert fails with "invalid geometry"

**Cause:** Incorrect WKT format or coordinate order

**Solution:** Use `createPostGISPoint()` instead of manual string construction

```typescript
// ✅ Correct
const location = createPostGISPoint(50.0755, 14.4378);

// ❌ Wrong
const location = `POINT(${lat} ${lng})`; // Missing SRID, wrong order
```

---

## Related Documentation

- [API Reference](../context-archive/API_REFERENCE.md) - Full API documentation
- [Architecture](../architecture/ARCHITECTURE.md) - System architecture
- [Database Schema](../context-archive/DATABASE_SCHEMA.md) - Database structure

---

**Last Updated:** December 14, 2024  
**Status:** ✅ Production Ready
