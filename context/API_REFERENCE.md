# FoodShare API Reference

**Last Updated:** December 2025 (Updated: posts_with_location view usage)

## Overview

FoodShare uses a client-side API layer that interfaces with Supabase backend services. All API functions are located in `src/api/` and return Supabase query builders.

---

## Product API (`productAPI`)

Located: `src/api/productAPI.ts`

> **Note:** All read operations use the `posts_with_location` database view, which provides location data as proper GeoJSON via `ST_AsGeoJSON()`. This ensures consistent coordinate handling across the application. Write operations (create, update, delete) still use the `posts` table directly.

### Get All Products

```typescript
productAPI.getAllProducts();
```

**Returns:** All posts from the `posts_with_location` view (no filtering)

**Data Source:** `posts_with_location` view (provides `location_json` as GeoJSON)

**Example:**

```typescript
const { data, error } = await productAPI.getAllProducts();
```

---

### Get Products by Type

```typescript
productAPI.getProducts(productType: string)
```

**Parameters:**

- `productType` - Type of product ('food', 'volunteer', 'food_bank', 'community_fridge')

**Returns:** Posts matching the type, with reviews included

**Data Source:** `posts_with_location` view

**Query:**

- Orders by `created_at` (descending)
- Filters by `post_type` (case-insensitive)
- Filters by `active = true`
- Includes related `reviews`

**Example:**

```typescript
const { data, error } = await productAPI.getProducts("food");
```

---

### Get Product Locations

```typescript
productAPI.getProductsLocation(productType: string)
```

**Parameters:**

- `productType` - Type of product

**Returns:** Only `locations` and `post_name` fields for map display

**Use Case:** Display markers on map (minimal data transfer)

**Example:**

```typescript
const { data, error } = await productAPI.getProductsLocation("food");
// data = [{ locations: {...}, post_name: "Fresh Apples" }, ...]
```

---

### Get Current User's Products

```typescript
productAPI.getCurrentUserProduct(currentUserID: string)
```

**Parameters:**

- `currentUserID` - User's profile ID (UUID)

**Returns:** All posts created by the user

**Example:**

```typescript
const userId = "123e4567-e89b-12d3-a456-426614174000";
const { data, error } = await productAPI.getCurrentUserProduct(userId);
```

---

### Get Single Product

```typescript
productAPI.getOneProduct(productId: number)
```

**Parameters:**

- `productId` - Post ID (integer)

**Returns:** Single post with reviews

**Example:**

```typescript
const { data, error } = await productAPI.getOneProduct(42);
```

---

### Create Product

```typescript
productAPI.createProduct(createdProduct: Partial<InitialProductStateType>)
```

**Parameters:**

- `createdProduct` - Partial product object

**Required Fields:**

- `profile_id` (creator)
- `post_name`
- `post_type`
- `post_address`
- `latitude`
- `longitude`

**Optional Fields:**

- `post_description`
- `gif_url`, `gif_url_2`, `gif_url_3`
- `available_hours`
- `transportation`

**Example:**

```typescript
const newProduct = {
  profile_id: currentUserId,
  post_name: "Fresh Tomatoes",
  post_description: "5kg of ripe tomatoes",
  post_type: "food",
  post_address: "123 Main St, Prague",
  latitude: 50.0755,
  longitude: 14.4378,
  gif_url: "https://...",
  available_hours: "9am-5pm",
  transportation: "Pickup only",
};

const { data, error } = await productAPI.createProduct(newProduct);
```

---

### Update Product

```typescript
productAPI.updateProduct(createdProduct: Partial<InitialProductStateType>)
```

**Parameters:**

- `createdProduct` - Product object with `id` field

**Note:** Uses `upsert` (insert or update)

**Example:**

```typescript
const updatedProduct = {
  id: 42,
  post_name: "Updated Product Name",
  active: false, // mark as inactive
};

const { data, error } = await productAPI.updateProduct(updatedProduct);
```

---

### Delete Product

```typescript
productAPI.deleteProduct(productID: number)
```

**Parameters:**

- `productID` - Post ID to delete

**Example:**

```typescript
const { data, error } = await productAPI.deleteProduct(42);
```

---

### Search Products

```typescript
productAPI.searchProducts(searchWord: string, productSearchType: string)
```

**Parameters:**

- `searchWord` - Search term
- `productSearchType` - 'all' or specific type ('food', 'volunteer', etc.)

**Search Type:**

- Uses PostgreSQL full-text search (`textSearch`)
- Searches `post_name` field
- WebSearch type (handles complex queries)

**Example:**

```typescript
// Search all types
const { data, error } = await productAPI.searchProducts("apple", "all");

// Search specific type
const { data, error } = await productAPI.searchProducts("apple", "food");
```

---

## Chat API (`chatAPI`)

Located: `src/api/chatAPI.ts`

### Get or Create Room

```typescript
chatAPI.getRoomOrCreate(payload: PayloadForGetRoom)
```

**Parameters:**

```typescript
{
  sharerId: string,    // UUID of food sharer
  requesterId: string, // UUID of food requester
  postId: string       // Post ID
}
```

**Logic:**

- Checks if room exists
- Creates new room if not found
- Returns room data

**Example:**

```typescript
const { data, error } = await chatAPI.getRoomOrCreate({
  sharerId: "user-uuid-1",
  requesterId: "user-uuid-2",
  postId: "42",
});
```

---

### Get User Rooms

```typescript
chatAPI.getRooms(userId: string)
```

**Parameters:**

- `userId` - Current user's ID (UUID)

**Returns:** All rooms where user is sharer OR requester, with:

- Related post data
- Other participant's profile
- Room participants (messages)

**Example:**

```typescript
const { data, error } = await chatAPI.getRooms(currentUserId);
```

---

### Send Message

```typescript
chatAPI.sendMessage(messageData: Partial<RoomParticipantsType>)
```

**Parameters:**

```typescript
{
  room_id: string,     // UUID of room
  profile_id: string,  // Sender's ID
  text: string,        // Message content
  image?: string       // Optional image URL
}
```

**Example:**

```typescript
const { data, error } = await chatAPI.sendMessage({
  room_id: "room-uuid",
  profile_id: currentUserId,
  text: "Hello! Is this still available?",
});
```

---

### Get Room Messages

```typescript
chatAPI.getRoomMessages(roomId: string)
```

**Parameters:**

- `roomId` - Room UUID

**Returns:** All messages in the room, ordered by timestamp

**Example:**

```typescript
const { data, error } = await chatAPI.getRoomMessages("room-uuid");
```

---

### Update Room Metadata

```typescript
chatAPI.updateRoom(roomId: string, updates: Partial<RoomType>)
```

**Parameters:**

- `roomId` - Room UUID
- `updates` - Fields to update (last_message, last_message_time, etc.)

**Example:**

```typescript
const { data, error } = await chatAPI.updateRoom("room-uuid", {
  last_message: "Thanks!",
  last_message_sent_by: currentUserId,
  last_message_time: new Date().toISOString(),
});
```

---

## Profile API (`profileAPI`)

Located: `src/api/profileAPI.ts`

### Get Profile

```typescript
profileAPI.getProfile(userId: string)
```

**Parameters:**

- `userId` - User's profile ID (UUID)

**Returns:** User profile data

**Example:**

```typescript
const { data, error } = await profileAPI.getProfile(userId);
```

---

### Update Profile

```typescript
profileAPI.updateProfile(userId: string, updates: Partial<AllValuesType>)
```

**Parameters:**

- `userId` - User's profile ID
- `updates` - Fields to update

**Updatable Fields:**

- `first_name`
- `second_name`
- `nickname`
- `email`
- `phone`
- `avatar_url`
- `bio`

**Example:**

```typescript
const { data, error } = await profileAPI.updateProfile(userId, {
  first_name: "John",
  second_name: "Doe",
  bio: "Food sharing enthusiast",
});
```

---

### Create Profile

```typescript
profileAPI.createProfile(profileData: Partial<AllValuesType>)
```

**Parameters:**

- `profileData` - New profile data (must include `id` from auth)

**Example:**

```typescript
const { data, error } = await profileAPI.createProfile({
  id: authUserId,
  first_name: "Jane",
  second_name: "Smith",
  email: "jane@example.com",
});
```

---

## Realtime Subscriptions

### Subscribe to Room Messages

```typescript
const subscription = supabase
  .channel(`room:${roomId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "room_participants",
      filter: `room_id=eq.${roomId}`,
    },
    (payload) => {
      console.log("New message:", payload.new);
      // Dispatch to Redux
    }
  )
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

---

### Subscribe to Product Updates

```typescript
const subscription = supabase
  .channel("products")
  .on(
    "postgres_changes",
    {
      event: "*", // INSERT, UPDATE, DELETE
      schema: "public",
      table: "posts",
    },
    (payload) => {
      console.log("Product changed:", payload);
    }
  )
  .subscribe();
```

---

## Error Handling

All API methods return Supabase response format:

```typescript
{
  data: T | null,
  error: PostgrestError | null,
  count: number | null,
  status: number,
  statusText: string
}
```

**Example Error Handling:**

```typescript
const { data, error } = await productAPI.getProducts("food");

if (error) {
  console.error("Error fetching products:", error.message);
  // Show user-friendly error
  dispatch(setError(error.message));
  return;
}

// Use data
console.log("Products:", data);
```

---

## TypeScript Types

All API functions use TypeScript types defined in their respective files:

- `InitialProductStateType` - Product/post structure
- `RoomType` - Chat room structure
- `RoomParticipantsType` - Message structure
- `AllValuesType` - User profile structure
- `ReviewsType` - Review structure

**Import Example:**

```typescript
import { InitialProductStateType } from "@/api/productAPI";
import { RoomType } from "@/api/chatAPI";
```

---

## Admin Server Actions

Admin functionality uses server actions following the server-first architecture pattern. Client-side `adminAPI` has been removed in favor of these server actions.

### Location

- **Mutations:** `src/app/actions/admin.ts` and `src/app/actions/admin-listings.ts`
- **Data fetching:** `src/lib/data/admin-listings.ts`

### Import

```typescript
// Server Actions (mutations)
import { approveListing, rejectListing, banUser, getUsers } from "@/app/actions/admin";
import {
  activateListing,
  deactivateListing,
  deleteListing,
  bulkActivateListings,
  bulkDeactivateListings,
  bulkDeleteListings,
  updateListing,
  updateAdminNotes,
} from "@/app/actions/admin-listings";

// Data fetching (Server Components)
import {
  getAdminListings,
  getCachedAdminListings,
  getListingStats,
} from "@/lib/data/admin-listings";
```

### Key Actions

| Action                                 | Description                  |
| -------------------------------------- | ---------------------------- |
| `approveListing(id)`                   | Approve a listing            |
| `rejectListing(id, reason)`            | Reject and delete a listing  |
| `activateListing(id)`                  | Activate a listing           |
| `deactivateListing(id, reason?)`       | Deactivate a listing         |
| `deleteListing(id)`                    | Permanently delete a listing |
| `bulkActivateListings(ids)`            | Bulk activate listings       |
| `bulkDeactivateListings(ids, reason?)` | Bulk deactivate listings     |
| `bulkDeleteListings(ids)`              | Bulk delete listings         |
| `updateListing(id, data)`              | Update listing fields        |
| `updateAdminNotes(id, notes)`          | Update admin notes           |
| `getUsers(filters?)`                   | Get users with filters       |
| `banUser(userId, reason)`              | Ban a user                   |
| `updateUserRole(userId, role)`         | Update user role             |

### Example Usage

```typescript
// In a Server Component or form action
import { approveListing } from "@/app/actions/admin";

const { success, error } = await approveListing(42);
if (!success) console.error(error);

// In a form
<form action={async () => {
  "use server";
  await approveListing(42);
}}>
  <button type="submit">Approve</button>
</form>
```

---

## Best Practices

1. **Always handle errors**: Check `error` before using `data`
2. **Use TypeScript types**: Import and use defined types
3. **Cleanup subscriptions**: Unsubscribe when component unmounts
4. **Loading states**: Show loading indicators during API calls
5. **Optimistic UI**: Update UI immediately, revert on error
6. **Debounce searches**: Avoid excessive API calls
7. **Bulk operations**: Use bulk APIs for better performance when operating on multiple items

---

## i18n Backend API (`i18nBackend`)

Located: `src/utils/i18n-backend.ts`

### Overview

Backend-level internationalization system for universal i18n across Web + Mobile (React Native) + Supabase. Provides server-side translation storage, mobile app translation API, and smart locale detection.

### Extended Locale Support

Supports 17 languages including RTL support for Arabic:

```typescript
const extendedLocales = [
  "en",
  "cs",
  "de",
  "es",
  "fr",
  "pt",
  "ru",
  "uk", // Current
  "zh",
  "hi",
  "ar", // Priority 1: High Impact
  "it",
  "pl",
  "nl", // Priority 2: European
  "ja",
  "ko",
  "tr", // Priority 3: Global
];
```

---

### Fetch Translations for Mobile

```typescript
i18nBackend.fetchTranslations(locale: ExtendedLocale, version?: string)
```

**Parameters:**

- `locale` - Target locale code (e.g., 'en', 'es', 'ar')
- `version` - Optional version string to check for updates

**Returns:** `TranslationBundle | null`

```typescript
interface TranslationBundle {
  locale: ExtendedLocale;
  version: string;
  messages: Record<string, string>;
  updatedAt: string;
}
```

**Example:**

```typescript
const bundle = await i18nBackend.fetchTranslations("es");
if (bundle) {
  console.log("Spanish translations:", bundle.messages);
}
```

---

### Sync Translations to Backend

```typescript
i18nBackend.syncTranslations(locale: ExtendedLocale, messages: Record<string, string>)
```

**Parameters:**

- `locale` - Target locale code
- `messages` - Key-value pairs of translations

**Returns:** `boolean` - Success status

**Use Case:** Admin syncing translations to Supabase for mobile apps

**Example:**

```typescript
const success = await i18nBackend.syncTranslations("es", {
  welcome: "Bienvenido",
  goodbye: "Adiós",
});
```

---

### Get User Locale Preference

```typescript
i18nBackend.getUserPreference(userId: string)
```

**Parameters:**

- `userId` - User's profile ID (UUID)

**Returns:** `UserLocalePreference | null`

```typescript
interface UserLocalePreference {
  userId: string;
  locale: ExtendedLocale;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
}
```

**Example:**

```typescript
const pref = await i18nBackend.getUserPreference(currentUserId);
if (pref) {
  console.log("User prefers:", pref.locale);
}
```

---

### Save User Locale Preference

```typescript
i18nBackend.saveUserPreference(userId: string, locale: ExtendedLocale)
```

**Parameters:**

- `userId` - User's profile ID
- `locale` - Selected locale code

**Returns:** `boolean` - Success status

**Example:**

```typescript
const success = await i18nBackend.saveUserPreference(userId, "fr");
```

---

### Detect Best Locale

```typescript
i18nBackend.detectLocale(userId?: string, deviceLocale?: string, browserLocales?: string[], ipCountry?: string)
```

**Parameters:**

- `userId` - Optional user ID for preference lookup
- `deviceLocale` - Optional device locale (mobile apps)
- `browserLocales` - Optional browser language preferences
- `ipCountry` - Optional country code from IP geolocation

**Returns:** `DeviceLocaleInfo`

```typescript
interface DeviceLocaleInfo {
  locale: ExtendedLocale;
  source: "user_preference" | "device" | "browser" | "ip_geolocation" | "default";
  confidence: number; // 0.0 - 1.0
}
```

**Priority Order:**

1. User preference (confidence: 1.0)
2. Device locale (confidence: 0.9)
3. Browser locales (confidence: 0.8)
4. IP geolocation (confidence: 0.5)
5. Default 'en' (confidence: 0.1)

**Example:**

```typescript
const localeInfo = await i18nBackend.detectLocale(userId, undefined, navigator.languages, "DE");
console.log(`Detected: ${localeInfo.locale} (${localeInfo.source})`);
```

---

### Check RTL Language

```typescript
i18nBackend.isRTL(locale: ExtendedLocale)
```

**Parameters:**

- `locale` - Locale code to check

**Returns:** `boolean` - True if RTL language (Arabic)

**Example:**

```typescript
if (i18nBackend.isRTL("ar")) {
  document.dir = "rtl";
}
```

---

### Access Locale Metadata

```typescript
i18nBackend.locales; // Array of all supported locale codes
i18nBackend.metadata; // Full metadata for all locales
```

**Metadata Structure:**

```typescript
{
  name: string; // "Arabic"
  nativeName: string; // "العربية"
  flag: string; // "🇸🇦"
  direction: "ltr" | "rtl";
  code: string; // "ar-SA"
  region: string; // "mena"
}
```

---

---

## PostGIS Utilities (`postgis`)

Located: `src/utils/postgis.ts`

### Overview

Utilities for handling PostGIS POINT data types and coordinate conversions. Supports multiple PostGIS formats (WKT strings, GeoJSON, stringified JSON) and provides distance calculations with coordinate validation.

---

### Parse PostGIS Point

```typescript
postgis.parsePostGISPoint(location: unknown)
```

**Parameters:**

- `location` - PostGIS location data in various formats

**Supported Formats:**

1. **GeoJSON**: `{ type: "Point", coordinates: [14.4208, 50.0875] }` (preferred)
2. **Raw Object**: `{ coordinates: [14.4208, 50.0875] }`
3. **WKT String**: `"POINT(14.4208 50.0875)"` (case-insensitive)
4. **Stringified GeoJSON**: `'{"type":"Point","coordinates":[14.4208,50.0875]}'`
5. **WKB Hex**: Returns `null` - use `ST_AsGeoJSON()` in query

**Returns:** `PostGISPoint | null`

```typescript
interface PostGISPoint {
  latitude: number; // -90 to 90
  longitude: number; // -180 to 180
}
```

Returns `null` for invalid input, out-of-range coordinates, or (0, 0) coordinates.

**Example:**

```typescript
import { parsePostGISPoint } from "@/utils/postgis";

// GeoJSON format (preferred)
const point1 = parsePostGISPoint({
  type: "Point",
  coordinates: [14.4208, 50.0875],
});
// { latitude: 50.0875, longitude: 14.4208 }

// WKT format
const point2 = parsePostGISPoint("POINT(14.4208 50.0875)");
// { latitude: 50.0875, longitude: 14.4208 }

// Stringified JSON
const point3 = parsePostGISPoint('{"coordinates":[14.4208,50.0875]}');
// { latitude: 50.0875, longitude: 14.4208 }

// Handle null safely
const point4 = parsePostGISPoint(null);
// null
```

---

### Create PostGIS Point

```typescript
postgis.createPostGISPoint(lat: number, lng: number)
```

**Parameters:**

- `lat` - Latitude (decimal degrees)
- `lng` - Longitude (decimal degrees)

**Returns:** WKT string with SRID 4326 (WGS84)

**Format:** `"SRID=4326;POINT(longitude latitude)"`

**Example:**

```typescript
import { createPostGISPoint } from "@/utils/postgis";

const wkt = createPostGISPoint(50.0875, 14.4208);
// "SRID=4326;POINT(14.4208 50.0875)"

// Use in Supabase insert
await supabase.from("posts").insert({
  post_name: "Fresh Apples",
  location: wkt,
});
```

---

### Calculate Distance

```typescript
postgis.calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number)
```

**Parameters:**

- `lat1`, `lng1` - First point coordinates
- `lat2`, `lng2` - Second point coordinates

**Returns:** Distance in meters (number)

**Algorithm:** Haversine formula for great-circle distance

**Example:**

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
```

---

### Format Distance

```typescript
postgis.formatDistance(meters: number)
```

**Parameters:**

- `meters` - Distance in meters

**Returns:** Human-readable string

**Format:**

- `< 1000m`: "X m"
- `>= 1000m`: "X.X km"

**Example:**

```typescript
import { formatDistance } from "@/utils/postgis";

formatDistance(500); // "500 m"
formatDistance(1500); // "1.5 km"
formatDistance(12345); // "12.3 km"
```

---

### Complete Usage Example

```typescript
import {
  parsePostGISPoint,
  createPostGISPoint,
  calculateDistance,
  formatDistance,
} from "@/utils/postgis";

// Fetch product with PostGIS location
const { data: product } = await supabase
  .from("posts")
  .select("*, location")
  .eq("id", productId)
  .single();

// Parse PostGIS location
const productLocation = parsePostGISPoint(product.location);

if (productLocation && userLocation) {
  // Calculate distance
  const distanceMeters = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    productLocation.latitude,
    productLocation.longitude
  );

  // Format for display
  const distanceText = formatDistance(distanceMeters);
  console.log(`Product is ${distanceText} away`);
}

// Create new product with location
const newLocation = createPostGISPoint(50.0875, 14.4208);
await supabase.from("posts").insert({
  post_name: "Fresh Vegetables",
  location: newLocation,
});
```

---

## Best Practices

1. **Always handle errors**: Check `error` before using `data`
2. **Use TypeScript types**: Import and use defined types
3. **Cleanup subscriptions**: Unsubscribe when component unmounts
4. **Loading states**: Show loading indicators during API calls
5. **Optimistic UI**: Update UI immediately, revert on error
6. **Debounce searches**: Avoid excessive API calls
7. **RTL Support**: Check `isRTL()` and set document direction for Arabic
8. **PostGIS Coordinates**: Always use `parsePostGISPoint()` when reading location data from database
9. **Distance Calculations**: Use `calculateDistance()` for client-side distance filtering
10. **Location Format**: Use `createPostGISPoint()` when inserting/updating location data

---

**Next Steps:**

- Review [Database Schema](DATABASE_SCHEMA.md) for table structure
- See [Architecture](ARCHITECTURE.md) for data flow
- Read [Development Guide](DEVELOPMENT_GUIDE.md) for workflows
