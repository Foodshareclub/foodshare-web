# Design Document

## Overview

The Enhanced Search & Filtering feature provides users with powerful tools to discover relevant food listings through text search, geographic filtering, dietary restrictions, food type categorization, and advanced sorting options. The system is designed for real-time performance with debounced search, optimized database queries, and client-side filter state management.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Search Input │  │ Filter Panel │  │ Results Grid │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      State Management                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Redux Store (searchSlice)                           │   │
│  │  - searchQuery, filters, sortBy, results            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  searchAPI.ts                                        │   │
│  │  - searchListings()                                  │   │
│  │  - getFilterCounts()                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  posts table (with full-text search)                │   │
│  │  - GIN index on post_name, description              │   │
│  │  - Spatial index on location (lat/lng)              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. SearchBar Component

```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export const SearchBar: React.FC<SearchBarProps> = React.memo(
  ({ onSearch, placeholder = "Search for food...", debounceMs = 300 }) => {
    const [value, setValue] = useState("");
    const debouncedSearch = useDebouncedCallback(onSearch, debounceMs);

    // Implementation
  }
);
```

### 2. FilterPanel Component

```typescript
interface FilterPanelProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  filterCounts: FilterCounts;
}

interface SearchFilters {
  distance?: number; // in km
  dietary: DietaryRestriction[];
  foodTypes: FoodType[];
  availability: AvailabilityWindow;
  minQuantity?: number;
  allergens: string[];
}

interface FilterCounts {
  dietary: Record<DietaryRestriction, number>;
  foodTypes: Record<FoodType, number>;
  total: number;
}
```

### 3. ResultsGrid Component

```typescript
interface ResultsGridProps {
  listings: Listing[];
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  isLoading: boolean;
}

type SortOption = "distance" | "date" | "expiry" | "quantity" | "relevance";
```

## Data Models

### Extended Listing Model

```typescript
interface Listing {
  id: string;
  post_name: string;
  description: string;
  post_type: FoodType;

  // Location
  latitude: number;
  longitude: number;
  city: string;
  country: string;

  // Dietary & Allergens
  dietary_categories: DietaryRestriction[];
  allergens: string[];

  // Availability
  available_from: Date;
  available_until: Date;
  expiry_date: Date;

  // Quantity
  quantity: number;
  quantity_unit: "kg" | "servings" | "items";

  // Metadata
  created_at: Date;
  active: boolean;

  // Computed (not stored)
  distance?: number; // calculated based on user location
  relevance_score?: number; // full-text search score
}

enum DietaryRestriction {
  VEGETARIAN = "vegetarian",
  VEGAN = "vegan",
  GLUTEN_FREE = "gluten_free",
  DAIRY_FREE = "dairy_free",
  NUT_FREE = "nut_free",
}

enum FoodType {
  PRODUCE = "produce",
  BAKED_GOODS = "baked_goods",
  PREPARED_MEALS = "prepared_meals",
  DAIRY = "dairy",
  MEAT = "meat",
  PANTRY = "pantry",
  BEVERAGES = "beverages",
  OTHER = "other",
}
```

### Search State Model

```typescript
interface SearchState {
  query: string;
  filters: SearchFilters;
  sortBy: SortOption;
  results: Listing[];
  filterCounts: FilterCounts;
  userLocation: { lat: number; lng: number } | null;
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Search text filtering consistency

_For any_ search query and listing set, when filtering by text, all returned listings should contain the search query in either the title or description (case-insensitive).
**Validates: Requirements 1.1**

### Property 2: Distance filter boundary correctness

_For any_ distance radius and user location, all returned listings should have a calculated distance less than or equal to the specified radius.
**Validates: Requirements 2.1**

### Property 3: Dietary filter intersection

_For any_ set of selected dietary filters, all returned listings should match ALL selected dietary categories (AND logic).
**Validates: Requirements 3.1, 3.2**

### Property 4: Food type filter union

_For any_ set of selected food types, all returned listings should match AT LEAST ONE selected food type (OR logic).
**Validates: Requirements 4.1, 4.2**

### Property 5: Sort order consistency

_For any_ sort option, the returned listings should be ordered according to the specified criterion (distance ascending, date descending, etc.).
**Validates: Requirements 8.1-8.4**

### Property 6: Filter count accuracy

_For any_ active filter combination, the displayed count for each filter option should equal the number of listings that would be returned if that option were selected.
**Validates: Requirements 7.1, 7.2**

### Property 7: Allergen exclusion completeness

_For any_ set of allergen keywords, no returned listing should contain any of the specified allergens in its description or allergen list.
**Validates: Requirements 9.1, 9.2**

### Property 8: Availability window filtering

_For any_ selected time range, all returned listings should have availability windows that overlap with the selected range.
**Validates: Requirements 5.1, 5.2**

### Property 9: Filter persistence round-trip

_For any_ set of applied filters, saving to local storage and then loading should restore the exact same filter state.
**Validates: Requirements 6.1, 6.2**

### Property 10: Empty result handling

_For any_ filter combination that yields zero results, the system should display a helpful message and never show listings that don't match the filters.
**Validates: Requirements 1.4, 2.4, 3.4**

## Error Handling

### Client-Side Errors

```typescript
enum SearchErrorType {
  LOCATION_UNAVAILABLE = "location_unavailable",
  INVALID_DISTANCE = "invalid_distance",
  NETWORK_ERROR = "network_error",
  INVALID_QUERY = "invalid_query",
}

interface SearchError {
  type: SearchErrorType;
  message: string;
  recoverable: boolean;
  retryAction?: () => void;
}
```

**Error Scenarios:**

1. **Location Permission Denied**: Prompt user to enable or enter address manually
2. **Network Failure**: Show cached results with offline indicator, queue retry
3. **Invalid Search Query**: Sanitize input, show validation message
4. **No Results**: Display helpful suggestions, relax filters button

### Server-Side Errors

```typescript
// API error handling
try {
  const { data, error } = await supabase.from("posts").select("*").textSearch("post_name", query);

  if (error) {
    throw new SearchError({
      type: SearchErrorType.NETWORK_ERROR,
      message: error.message,
      recoverable: true,
    });
  }
} catch (e) {
  // Log to error tracking service
  console.error("Search failed:", e);
  return thunkAPI.rejectWithValue(e);
}
```

## Testing Strategy

### Unit Tests

1. **Search Input Debouncing**
   - Test that search is debounced by 300ms
   - Test that rapid typing doesn't trigger multiple searches
   - Test that clearing input triggers immediate search

2. **Filter Logic**
   - Test dietary filter AND logic
   - Test food type filter OR logic
   - Test distance calculation accuracy
   - Test allergen exclusion

3. **Sort Functions**
   - Test each sort option produces correct order
   - Test sort stability (equal items maintain relative order)

4. **Filter Count Calculation**
   - Test counts update correctly when filters change
   - Test zero counts disable filter options

### Property-Based Tests

Each correctness property will be implemented as a property-based test using `fast-check` (JavaScript property testing library).

**Example Property Test:**

```typescript
import fc from "fast-check";

describe("Search Filtering Properties", () => {
  it("Property 1: Search text filtering consistency", () => {
    fc.assert(
      fc.property(
        fc.array(listingArbitrary), // Generate random listings
        fc.string(), // Generate random search query
        (listings, query) => {
          const results = filterByText(listings, query);

          // All results must contain the query
          return results.every(
            (listing) =>
              listing.post_name.toLowerCase().includes(query.toLowerCase()) ||
              listing.description.toLowerCase().includes(query.toLowerCase())
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 2: Distance filter boundary correctness", () => {
    fc.assert(
      fc.property(
        fc.array(listingArbitrary),
        fc.record({
          lat: fc.double({ min: -90, max: 90 }),
          lng: fc.double({ min: -180, max: 180 }),
        }),
        fc.integer({ min: 1, max: 100 }), // distance in km
        (listings, userLocation, maxDistance) => {
          const results = filterByDistance(listings, userLocation, maxDistance);

          // All results must be within distance
          return results.every((listing) => {
            const distance = calculateDistance(userLocation, {
              lat: listing.latitude,
              lng: listing.longitude,
            });
            return distance <= maxDistance;
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Tests

1. **End-to-End Search Flow**
   - User enters search query → results update
   - User applies filters → results filter correctly
   - User changes sort → results re-order

2. **Filter Persistence**
   - Apply filters → refresh page → filters restored
   - Login on different device → filters synced

3. **Performance Tests**
   - Search with 1000+ listings completes in <500ms
   - Filter changes update UI in <200ms
   - Debounced search doesn't block UI

## Performance Optimization

### Database Optimization

```sql
-- Full-text search index
CREATE INDEX idx_posts_fts ON posts
USING GIN (to_tsvector('english', post_name || ' ' || description));

-- Spatial index for distance queries
CREATE INDEX idx_posts_location ON posts
USING GIST (ll_to_earth(latitude, longitude));

-- Composite index for common filters
CREATE INDEX idx_posts_active_type_dietary ON posts
(active, post_type, dietary_categories)
WHERE active = true;
```

### Client-Side Optimization

1. **Debounced Search**: 300ms delay prevents excessive API calls
2. **Memoized Selectors**: Use `reselect` to cache filtered results
3. **Virtual Scrolling**: Render only visible listings (react-window)
4. **Lazy Loading**: Load images as they enter viewport
5. **Request Deduplication**: Cancel in-flight requests when new search starts

### Caching Strategy

```typescript
// Cache search results for 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

const searchCache = new Map<
  string,
  {
    results: Listing[];
    timestamp: number;
  }
>();

function getCachedResults(cacheKey: string): Listing[] | null {
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }
  return null;
}
```

## API Endpoints

### Search Listings

```typescript
// GET /api/search
interface SearchRequest {
  query?: string;
  filters: SearchFilters;
  sortBy: SortOption;
  userLocation?: { lat: number; lng: number };
  page?: number;
  limit?: number;
}

interface SearchResponse {
  listings: Listing[];
  total: number;
  filterCounts: FilterCounts;
  page: number;
  hasMore: boolean;
}
```

### Get Filter Counts

```typescript
// GET /api/search/counts
interface FilterCountsRequest {
  currentFilters: SearchFilters;
  userLocation?: { lat: number; lng: number };
}

interface FilterCountsResponse {
  dietary: Record<DietaryRestriction, number>;
  foodTypes: Record<FoodType, number>;
  total: number;
}
```

## Security Considerations

1. **Input Sanitization**: Sanitize search queries to prevent SQL injection
2. **Rate Limiting**: Limit search requests to 60 per minute per user
3. **Location Privacy**: Don't expose exact user location, use approximate distance
4. **Filter Validation**: Validate all filter values on server-side

## Accessibility

1. **Keyboard Navigation**: All filters accessible via keyboard
2. **Screen Reader**: Announce result count changes
3. **ARIA Labels**: Proper labels on all filter controls
4. **Focus Management**: Maintain focus when filters update

## Future Enhancements

1. **Saved Searches**: Allow users to save and name filter combinations
2. **Search History**: Show recent searches for quick access
3. **Smart Suggestions**: AI-powered search suggestions
4. **Collaborative Filtering**: "Users who searched for X also liked Y"
5. **Voice Search**: Voice input for search queries
