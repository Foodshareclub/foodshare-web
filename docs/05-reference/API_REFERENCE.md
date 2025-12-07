# FoodShare API Reference

**Last Updated:** December 2025

## Overview

FoodShare uses a client-side API layer that interfaces with Supabase backend services. All API functions are located in `src/api/` and return Supabase query builders.

---

## Product API (`productAPI`)

Located: `src/api/productAPI.ts`

> ⚠️ **Deprecated:** This API layer is deprecated. Use `@/lib/data/products` for server-side data fetching instead. This file is kept for backward compatibility with client-side TanStack Query hooks.
>
> **Migration guide:**
> - Server Components: `import { getProducts } from '@/lib/data/products'`
> - Server Actions: `import { createClient } from '@/lib/supabase/server'`
> - Client (realtime only): Keep using this file

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

## Products Data Layer

Located: `src/lib/data/products.ts`

Server-side data fetching functions for products with caching and cursor-based pagination. Uses `unstable_cache` for optimal performance with tag-based invalidation.

> **Note:** Uses `createCachedClient()` instead of `createClient()` because `cookies()` cannot be called inside `unstable_cache()`.

### Pagination Types

```typescript
interface PaginatedResult<T> {
  data: T[];
  nextCursor: number | null;
  hasMore: boolean;
  totalCount?: number;
}

interface PaginationOptions {
  cursor?: number | null;  // Last seen ID for cursor-based pagination
  limit?: number;          // Items per page (default: 20, max: 100)
}
```

---

### Get Products by Type

```typescript
import { getProducts } from '@/lib/data/products';

// First page (cached)
const products = await getProducts('food');

// With pagination
const products = await getProducts('food', { limit: 10 });

// Subsequent pages (cursor-based)
const nextPage = await getProducts('food', { cursor: lastProductId, limit: 10 });
```

**Parameters:**

- `productType` - Type of product ('food', 'volunteer', 'fridge', etc.)
- `options` - Optional pagination options

**Returns:** `InitialProductStateType[]`

**Caching:** First page is cached with `CACHE_TAGS.PRODUCTS_BY_TYPE(type)`. Subsequent pages (with cursor) are fetched directly.

---

### Get Products Paginated (Infinite Scroll)

```typescript
import { getProductsPaginated } from '@/lib/data/products';

const result = await getProductsPaginated('food', { limit: 20 });
// { data: [...], nextCursor: 42, hasMore: true }

// Load more
const nextResult = await getProductsPaginated('food', { 
  cursor: result.nextCursor, 
  limit: 20 
});
```

**Parameters:**

- `productType` - Type of product
- `options` - Optional pagination options

**Returns:** `PaginatedResult<InitialProductStateType>`

**Optimization:** Fetches `limit + 1` items to efficiently determine `hasMore` without a separate count query.

**Example (Server Component with infinite scroll):**

```typescript
// app/food/page.tsx
import { getProductsPaginated } from '@/lib/data/products';
import { ProductGrid } from '@/components/productCard/ProductGrid';

export default async function FoodPage() {
  const { data, nextCursor, hasMore } = await getProductsPaginated('food', { limit: 20 });

  return (
    <ProductGrid 
      initialProducts={data} 
      initialCursor={nextCursor}
      hasMore={hasMore}
      productType="food"
    />
  );
}
```

---

### Get All Products

```typescript
import { getAllProducts } from '@/lib/data/products';

const products = await getAllProducts();
```

**Returns:** All active products ordered by `created_at` descending

**Caching:** Uses `CACHE_TAGS.PRODUCTS` tag

---

### Get Product by ID

```typescript
import { getProductById } from '@/lib/data/products';

const product = await getProductById(42);
```

**Parameters:**

- `productId` - Product ID (number)

**Returns:** `InitialProductStateType | null` - Product with reviews, or null if not found

**Caching:** Uses `CACHE_TAGS.PRODUCT(productId)` tag

---

### Get Product Locations (Map)

```typescript
import { getProductLocations, getAllProductLocations } from '@/lib/data/products';

// By type
const foodLocations = await getProductLocations('food');

// All types
const allLocations = await getAllProductLocations();
```

**Returns:** `LocationType[]` - Minimal data for map markers (id, location_json, post_name, post_type, images)

**Caching:** Uses `CACHE_TAGS.PRODUCT_LOCATIONS` tag

---

### Get User Products

```typescript
import { getUserProducts } from '@/lib/data/products';

const userProducts = await getUserProducts(userId);
```

**Parameters:**

- `userId` - User's profile ID (UUID)

**Returns:** All products created by the user

**Caching:** Uses `CACHE_TAGS.USER_PRODUCTS(userId)` tag

---

### Search Products

```typescript
import { searchProducts } from '@/lib/data/products';

// Search all types
const results = await searchProducts('apple', 'all');

// Search specific type
const foodResults = await searchProducts('apple', 'food');
```

**Parameters:**

- `searchWord` - Search term (uses PostgreSQL full-text search)
- `productSearchType` - 'all' or specific type

**Returns:** `InitialProductStateType[]` - Matching products with reviews

**Caching:** Short cache duration due to dynamic nature

---

### Get Popular Product IDs

```typescript
import { getPopularProductIds } from '@/lib/data/products';

const ids = await getPopularProductIds(50);
```

**Parameters:**

- `limit` - Number of IDs to return (default: 50)

**Returns:** `number[]` - Product IDs for static generation

**Use Case:** `generateStaticParams()` for product detail pages

---

### Pagination Constants

Located: `src/lib/constants.ts`

```typescript
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
```

---

## Challenges Data Layer

Located: `src/lib/data/challenges.ts`

Server-side data fetching functions for challenges with caching. Uses `unstable_cache` for optimal performance.

> **Note:** `getChallenges()` returns data transformed to `InitialProductStateType` for compatibility with `ProductGrid` and `HomeClient` components. Numeric fields (views, likes) are coerced from strings since Supabase may return them as strings.

### Get All Challenges

```typescript
import { getChallenges } from '@/lib/data/challenges';

const challenges = await getChallenges();
```

**Returns:** `InitialProductStateType[]` - Challenges transformed for component compatibility

**Caching:** Uses `CACHE_TAGS.CHALLENGES` tag, revalidates per `CACHE_DURATIONS.CHALLENGES`

**Example (Server Component with parallel fetching):**

```typescript
// app/challenge/page.tsx
import { getChallenges, getPopularChallenges } from '@/lib/data/challenges';
import { getUser } from '@/app/actions/auth';
import { ChallengesClient } from './ChallengesClient';

export const revalidate = 60;

export default async function ChallengePage() {
  // Parallel data fetching for optimal performance
  const [challenges, popularChallenges, user] = await Promise.all([
    getChallenges(),
    getPopularChallenges(3),
    getUser(),
  ]);

  const stats = {
    totalChallenges: challenges.length,
    totalParticipants: challenges.reduce(
      (sum, c) => sum + (Number(c.post_like_counter) || 0),
      0
    ),
  };

  return (
    <ChallengesClient
      challenges={challenges}
      popularChallenges={popularChallenges}
      user={user}
      stats={stats}
    />
  );
}
```

---

### Get Challenge by ID

```typescript
import { getChallengeById } from '@/lib/data/challenges';

const challenge = await getChallengeById(42);
```

**Parameters:**

- `challengeId` - Challenge ID (number)

**Returns:** `Challenge | null` - Raw challenge data (not transformed)

---

### Get Challenges by Difficulty

```typescript
import { getChallengesByDifficulty } from '@/lib/data/challenges';

const challenges = await getChallengesByDifficulty('easy');
```

**Parameters:**

- `difficulty` - Difficulty level string

**Returns:** `Challenge[]` - Raw challenge data

---

### Get User Challenges

```typescript
import { getUserChallenges } from '@/lib/data/challenges';

const challenges = await getUserChallenges(userId);
```

**Parameters:**

- `userId` - User's profile ID (UUID)

**Returns:** `Challenge[]` - All challenges created by the user

---

### Get Popular Challenges

```typescript
import { getPopularChallenges } from '@/lib/data/challenges';

const popular = await getPopularChallenges(10);
```

**Parameters:**

- `limit` - Number of challenges to return (default: 10)

**Returns:** `Challenge[]` - Challenges ordered by views

---

### Challenge Type

```typescript
interface Challenge {
  id: number;
  challenge_title: string;
  challenge_description: string;
  challenge_image: string;
  challenge_difficulty: string;
  challenge_action: string;
  challenge_score: number;
  challenge_views: number;
  challenge_likes_counter: number;
  challenged_people: number;
  challenge_published: boolean;
  challenge_created_at: string;
  challenge_updated_at: string;
  profile_id: string;
}
```

---

## Challenge Server Actions

Located: `src/app/actions/challenges.ts`

Server actions for challenge interactions. These handle user participation and engagement with challenges.

### Accept Challenge

```typescript
import { acceptChallenge } from '@/app/actions/challenges';

const result = await acceptChallenge(challengeId);
```

**Parameters:**

- `challengeId` - Challenge ID (number)

**Returns:** `{ success: boolean; error?: string }`

**Behavior:**

- Adds user to `challenge_participants` table
- Increments `challenged_people` count via RPC
- Invalidates challenge cache and revalidates path
- Returns success if already accepted (idempotent)

**Example (Client Component):**

```typescript
'use client';
import { acceptChallenge } from '@/app/actions/challenges';
import { Button } from '@/components/ui/button';

export function AcceptChallengeButton({ challengeId }: { challengeId: number }) {
  const handleAccept = async () => {
    const result = await acceptChallenge(challengeId);
    if (!result.success) {
      console.error(result.error);
    }
  };

  return <Button onClick={handleAccept}>Accept Challenge</Button>;
}
```

---

### Check Challenge Acceptance

```typescript
import { hasAcceptedChallenge } from '@/app/actions/challenges';

const isAccepted = await hasAcceptedChallenge(challengeId);
```

**Parameters:**

- `challengeId` - Challenge ID (number)

**Returns:** `boolean` - True if current user has accepted the challenge

**Example:**

```typescript
const hasAccepted = await hasAcceptedChallenge(42);
if (hasAccepted) {
  // Show "Already Accepted" state
}
```

---

### Toggle Challenge Like

```typescript
import { toggleChallengeLike } from '@/app/actions/challenges';

const result = await toggleChallengeLike(challengeId);
```

**Parameters:**

- `challengeId` - Challenge ID (number)

**Returns:** `{ success: boolean; isLiked: boolean; error?: string }`

**Note:** Current implementation increments the counter. For production, consider implementing a `challenge_likes` table similar to `post_likes` for proper toggle behavior.

**Example:**

```typescript
'use client';
import { toggleChallengeLike } from '@/app/actions/challenges';

export function LikeChallengeButton({ challengeId }: { challengeId: number }) {
  const handleLike = async () => {
    const result = await toggleChallengeLike(challengeId);
    if (result.success) {
      // Update UI
    }
  };

  return <Button variant="ghost" onClick={handleLike}>❤️ Like</Button>;
}
```

---

## Auth Server Actions

Located: `src/app/actions/auth.ts`

Server actions for authentication and user data. These provide graceful degradation during database unavailability.

### Get Current User

```typescript
import { getUser } from '@/app/actions/auth';

const user = await getUser();
```

**Returns:** `AuthUser | null`

```typescript
interface AuthUser {
  id: string;
  email?: string;
  profile: {
    id: string;
    name?: string;
    first_name?: string;
    second_name?: string;
    avatar_url?: string;
    role?: string;
    email?: string;
  } | null;
}
```

**Graceful Degradation:**

Returns `null` (instead of throwing) when:
- User is not authenticated
- Auth service returns an error
- Database is unavailable (maintenance mode)
- Profile fetch fails (returns user without profile)

This ensures pages using `getUser()` continue to render during maintenance, showing unauthenticated state rather than error pages.

**Example (Server Component with parallel fetching):**

```typescript
// app/challenge/[id]/page.tsx
import { getUser } from '@/app/actions/auth';
import { getChallengeById } from '@/lib/data/challenges';

export default async function ChallengeDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Parallel fetch - getUser() won't throw even if DB is down
  const [challenge, user] = await Promise.all([
    getChallengeById(parseInt(id, 10)),
    getUser(),
  ]);

  if (!challenge) notFound();

  // user may be null (not logged in OR DB unavailable)
  return <ChallengeDetailClient challenge={challenge} user={user} />;
}
```

**Behavior During Maintenance:**

| Scenario | Result |
|----------|--------|
| User authenticated, DB healthy | Returns full `AuthUser` with profile |
| User authenticated, profile fetch fails | Returns `AuthUser` with `profile: null` |
| User not authenticated | Returns `null` |
| Auth service error | Returns `null` |
| Database unavailable | Returns `null` |

**Note:** Components should handle `null` user gracefully, showing login prompts or limited functionality rather than assuming an error occurred.

---

## Safe Auth Helpers

Located: `src/lib/supabase/safe-auth.ts`

Low-level auth wrappers that gracefully handle database unavailability during maintenance. These return `null`/`false` instead of throwing errors.

### Safe Get Session

```typescript
import { safeGetSession } from '@/lib/supabase/safe-auth';

const session = await safeGetSession();
```

**Returns:** `Session | null`

Returns `null` if DB is unavailable or auth fails.

---

### Safe Get User

```typescript
import { safeGetUser } from '@/lib/supabase/safe-auth';

const user = await safeGetUser();
```

**Returns:** `User | null` (Supabase `User` type)

Returns `null` if DB is unavailable or auth fails.

---

### Safe Get User With Profile

```typescript
import { safeGetUserWithProfile } from '@/lib/supabase/safe-auth';

const user = await safeGetUserWithProfile();
```

**Returns:** `SafeAuthUser | null`

```typescript
interface SafeAuthUser {
  id: string;
  email: string | undefined;
  profile?: {
    id: string;
    name: string;
    first_name: string | null;
    second_name: string | null;
    avatar_url: string | null;
    role: string;
    email: string | null;
  } | null;
}
```

Returns user with profile data. If profile fetch fails, returns user with `profile: null`.

---

### Safe Check Is Admin

```typescript
import { safeCheckIsAdmin } from '@/lib/supabase/safe-auth';

const isAdmin = await safeCheckIsAdmin();
```

**Returns:** `boolean`

Returns `false` if DB is unavailable, user not authenticated, or user is not admin.

---

### Is Database Available

```typescript
import { isDatabaseAvailable } from '@/lib/supabase/safe-auth';

const available = await isDatabaseAvailable();
```

**Returns:** `boolean`

Quick check if database is reachable. Useful for conditional rendering or feature flags.

---

### When to Use Safe Auth vs Regular Auth

| Use Case | Recommended |
|----------|-------------|
| Server Components (pages) | `getUser()` from `@/app/actions/auth` |
| Middleware auth checks | `safeGetSession()` |
| Admin route protection | `safeCheckIsAdmin()` |
| Feature flags based on DB status | `isDatabaseAvailable()` |
| Custom auth flows | `safeGetUser()` or `safeGetUserWithProfile()` |

**Example (Middleware-style check):**

```typescript
import { safeGetSession, isDatabaseAvailable } from '@/lib/supabase/safe-auth';

export async function checkAccess() {
  // First check if DB is even available
  if (!await isDatabaseAvailable()) {
    return { allowed: false, reason: 'maintenance' };
  }

  const session = await safeGetSession();
  if (!session) {
    return { allowed: false, reason: 'unauthenticated' };
  }

  return { allowed: true, userId: session.user.id };
}
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

- `full_name`
- `email`
- `phone`
- `avatar_url`
- `bio`
- `address`

**Example:**

```typescript
const { data, error } = await profileAPI.updateProfile(userId, {
  full_name: "John Doe",
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
  full_name: "Jane Smith",
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

## Admin API (`adminAPI`)

Located: `src/api/adminAPI.ts`

### Check Admin Status

```typescript
adminAPI.checkIsAdmin();
```

**Returns:** `{ isAdmin: boolean, error: Error | null }`

**Example:**

```typescript
const { isAdmin, error } = await adminAPI.checkIsAdmin();
if (isAdmin) {
  // Show admin features
}
```

---

### Get All Listings (Admin View)

```typescript
adminAPI.getAllListings(filters?: AdminListingsFilter)
```

**Parameters:**

```typescript
{
  status?: 'pending' | 'approved' | 'rejected' | 'flagged' | 'all',
  searchTerm?: string,
  category?: string | 'all',
  sortBy?: 'created_at' | 'updated_at' | 'post_name' | 'status',
  sortOrder?: 'asc' | 'desc',
  limit?: number,
  offset?: number
}
```

**Returns:** All listings with admin fields (status, approval info, etc.)

**Example:**

```typescript
const { data, error } = await adminAPI.getAllListings({
  status: "pending",
  sortBy: "created_at",
  sortOrder: "desc",
});
```

---

### Approve Listing

```typescript
adminAPI.approvePost(payload: ApprovePostPayload)
```

**Parameters:**

```typescript
{
  postId: number,
  adminNotes?: string
}
```

**Example:**

```typescript
const { error } = await adminAPI.approvePost({
  postId: 42,
  adminNotes: "Looks good, approved",
});
```

---

### Reject Listing

```typescript
adminAPI.rejectPost(payload: RejectPostPayload)
```

**Parameters:**

```typescript
{
  postId: number,
  rejectionReason: string,
  adminNotes?: string
}
```

**Example:**

```typescript
const { error } = await adminAPI.rejectPost({
  postId: 42,
  rejectionReason: "Inappropriate content",
  adminNotes: "Violates community guidelines",
});
```

---

### Flag Listing

```typescript
adminAPI.flagPost(payload: FlagPostPayload)
```

**Parameters:**

```typescript
{
  postId: number,
  flaggedReason: string,
  adminNotes?: string
}
```

**Example:**

```typescript
const { error } = await adminAPI.flagPost({
  postId: 42,
  flaggedReason: "Needs review - suspicious activity",
});
```

---

### Bulk Approve Listings

```typescript
adminAPI.bulkApproveListings(postIds: number[])
```

**Parameters:**

- `postIds` - Array of post IDs to approve

**Returns:** Supabase response

**Example:**

```typescript
const { error } = await adminAPI.bulkApproveListings([42, 43, 44]);
```

---

### Bulk Reject Listings

```typescript
adminAPI.bulkRejectListings(postIds: number[], rejectionReason: string)
```

**Parameters:**

- `postIds` - Array of post IDs to reject
- `rejectionReason` - Reason for rejection (applied to all)

**Example:**

```typescript
const { error } = await adminAPI.bulkRejectListings([42, 43, 44], "Spam content detected");
```

---

### Bulk Flag Listings

```typescript
adminAPI.bulkFlagListings(postIds: number[], flaggedReason: string)
```

**Parameters:**

- `postIds` - Array of post IDs to flag
- `flaggedReason` - Reason for flagging (applied to all)

**Example:**

```typescript
const { error } = await adminAPI.bulkFlagListings([42, 43, 44], "Requires manual review");
```

---

### Bulk Delete Listings

```typescript
adminAPI.bulkDeleteListings(postIds: number[])
```

**Parameters:**

- `postIds` - Array of post IDs to delete permanently

**Warning:** This is a destructive operation and cannot be undone.

**Example:**

```typescript
const { error } = await adminAPI.bulkDeleteListings([42, 43, 44]);
```

---

### Get Audit Log

```typescript
adminAPI.getPostAuditLog(postId: number)
```

**Parameters:**

- `postId` - Post ID to get audit history for

**Returns:** Array of audit log entries

**Example:**

```typescript
const { data, error } = await adminAPI.getPostAuditLog(42);
// data = [{ action: 'approved', admin_id: '...', created_at: '...' }, ...]
```

---

### Get Dashboard Stats

```typescript
adminAPI.getDashboardStats();
```

**Returns:** `AdminDashboardStats` object with counts and metrics

**Example:**

```typescript
const { data, error } = await adminAPI.getDashboardStats();
// data = { totalListings: 150, pendingCount: 12, approvedCount: 120, ... }
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

Supports 21 languages including RTL support for Arabic:

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
  latitude: number;  // -90 to 90
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

## Health Check API

Located: `src/app/api/health/route.ts`

Edge runtime endpoint that performs comprehensive health monitoring by checking:
1. Direct database connectivity
2. Supabase project health via Management API
3. Supabase upgrade status (detects ongoing Postgres upgrades)

### Check Health Status

```
GET /api/health
```

**Runtime:** Edge (low latency, global distribution)

**Caching:** Disabled (`revalidate = 0`, `dynamic = 'force-dynamic'`)

**Timeouts:**
- Database check: 8 seconds (increased for cold-start on free tier)
- Management API checks: 5 seconds

**Returns:** `HealthStatus`

```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'maintenance';
  database: boolean;
  timestamp: string;
  message?: string;
  retryAfter?: number; // seconds until next check recommended
  services: {
    database: 'up' | 'down' | 'degraded';
    auth: 'up' | 'down' | 'unknown';
    storage: 'up' | 'down' | 'unknown';
  };
  upgradeStatus?: {
    status: string;      // e.g., 'upgrading', 'COMPLETED', 'FAILED'
    progress?: string;   // upgrade progress indicator
    targetVersion?: string; // target Postgres version
  };
}
```

**Response Codes:**

| Status | Code | Description |
|--------|------|-------------|
| `healthy` | 200 | Database reachable, all services operational |
| `maintenance` | 503 | Database unreachable, upgrade in progress, or services unhealthy |

**How It Works:**

The endpoint performs three checks in parallel:
1. **Direct DB connectivity** - REST API call to Supabase (`/rest/v1/profiles?select=id&limit=1`)
2. **Project health** - Supabase Management API (`/v1/projects/{ref}/health?services=db,auth,storage`)
3. **Upgrade status** - Supabase Management API (`/v1/projects/{ref}/upgrade/status`)

**Maintenance Detection:**

Returns maintenance status when:
- Postgres upgrade is in progress (detected via upgrade status API)
- Project health API reports unhealthy services
- Database connection times out (8s limit)
- Network errors occur (DNS failure, connection refused/reset, SSL errors)
- Supabase returns 5xx errors
- Missing environment configuration
- Any uncaught exception (fail-safe)

**Note:** 4xx errors (except 5xx) are treated as "healthy" since they indicate the database is reachable but there's a configuration or query issue.

**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Used to extract project reference
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - For direct DB connectivity check
- `SUPABASE_ACCESS_TOKEN` - Personal Access Token (PAT) for Management API calls (project health & upgrade status). Generate at: https://supabase.com/dashboard/account/tokens. Note: This is NOT the service role key.

**Example Response (Healthy):**

```json
{
  "status": "healthy",
  "database": true,
  "timestamp": "2025-12-06T10:30:00.000Z",
  "services": {
    "database": "up",
    "auth": "up",
    "storage": "up"
  }
}
```

**Example Response (Maintenance - Database Down):**

```json
{
  "status": "maintenance",
  "database": false,
  "timestamp": "2025-12-06T10:30:00.000Z",
  "message": "We're sprucing things up! Back shortly — thanks for your patience! 💚",
  "retryAfter": 30,
  "services": {
    "database": "down",
    "auth": "unknown",
    "storage": "unknown"
  }
}
```

**Example Response (Postgres Upgrade in Progress):**

```json
{
  "status": "maintenance",
  "database": false,
  "timestamp": "2025-12-06T10:30:00.000Z",
  "message": "Database upgrade to v15.4 in progress...",
  "retryAfter": 30,
  "services": {
    "database": "down",
    "auth": "unknown",
    "storage": "unknown"
  },
  "upgradeStatus": {
    "status": "upgrading",
    "progress": "50%",
    "targetVersion": "15.4"
  }
}
```

**Example Response (Services Under Maintenance):**

```json
{
  "status": "maintenance",
  "database": false,
  "timestamp": "2025-12-06T10:30:00.000Z",
  "message": "Services under maintenance: db, auth",
  "retryAfter": 30,
  "services": {
    "database": "down",
    "auth": "down",
    "storage": "up"
  }
}
```

**Usage Example (Client-side polling):**

The `MaintenanceBanner` component (`src/components/maintenance/MaintenanceBanner.tsx`) is integrated into the root layout (`src/app/layout.tsx`) and automatically displays on all pages when maintenance is detected. Features:
- Adaptive polling interval (30s initial, exponential backoff up to 60s max)
- 12-second fetch timeout with `AbortController` (accommodates slow cold starts)
- **Consecutive failures threshold** - banner only shows after 2 consecutive failures (reduces false positives)
- **Initial delay** - first health check delayed by 2s to let page load first
- Respects `retryAfter` from server response for polling interval
- Dismissible banner with close button
- Manual refresh button with loading spinner animation
- Fixed position at top of viewport with gradient background (amber/orange)
- Progress indicator bar during maintenance status
- Responsive design with different messages for mobile/desktop
- Accessibility: `aria-live="polite"` for screen readers
- Auto-resets dismissed state and consecutive failure counter when status returns to healthy

```typescript
// Client-side interface matching the health API response
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'maintenance';
  database: boolean;
  message?: string;
  retryAfter?: number;
}

// Polling with adaptive interval and exponential backoff
const INITIAL_POLL_INTERVAL = 30000; // 30 seconds between checks
const MAX_POLL_INTERVAL = 60000;     // 60 seconds max
const CONSECUTIVE_FAILURES_THRESHOLD = 2; // Only show banner after 2 consecutive failures
const [pollInterval, setPollInterval] = useState(INITIAL_POLL_INTERVAL);
const [isChecking, setIsChecking] = useState(false);
const consecutiveFailures = useRef(0);
const [showBanner, setShowBanner] = useState(false);

const checkHealth = async () => {
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 12000); // 12s for slow cold starts

  try {
    const res = await fetch('/api/health', {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(fetchTimeout);

    const data: HealthStatus = await res.json();
    setStatus(data);

    // Adjust polling interval based on status
    if (data.status === 'healthy') {
      pollIntervalRef.current = MAX_POLL_INTERVAL;
    } else {
      pollIntervalRef.current = data.retryAfter
        ? data.retryAfter * 1000
        : INITIAL_POLL_INTERVAL;
    }
  } catch {
    // Network error or timeout = assume maintenance
    setStatus({
      status: 'maintenance',
      database: false,
      timestamp: new Date().toISOString(),
      message: 'Unable to reach server',
    });
    pollIntervalRef.current = INITIAL_POLL_INTERVAL;
  }

  // Schedule next check
  timeoutId = setTimeout(checkHealth, pollIntervalRef.current);
};
```

**Use Cases:**

- Display maintenance banners during database downtime (`MaintenanceBanner` component)
- Uptime monitoring integrations (Vercel, UptimeRobot, etc.)
- Graceful degradation in client applications
- Load balancer health checks

---

### Server-Side Health Check Pattern

For Server Components that need to check database availability before rendering, use a direct health check instead of calling the `/api/health` endpoint (avoids extra network hop).

**Pattern:** Check DB health → Redirect to maintenance if unhealthy → Fetch data → Render

```typescript
// app/food/page.tsx (or any Server Component)

/**
 * Direct database health check for Server Components
 * Uses REST API call with 3s timeout - faster than /api/health endpoint
 */
async function isDatabaseHealthy(): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

/**
 * Safe user fetch - uses dynamic import to avoid import-time errors
 */
async function safeGetUser() {
  try {
    const { getUser } = await import('@/app/actions/auth');
    return await getUser();
  } catch {
    return null;
  }
}

export default async function ProductsPage() {
  // 1. Check DB health first (fast fail)
  const dbHealthy = await isDatabaseHealthy();
  if (!dbHealthy) {
    redirect('/maintenance');
  }

  // 2. Fetch primary data
  let products;
  try {
    products = await getProducts();
  } catch {
    redirect('/maintenance');
  }

  // 3. Fetch user only if products succeeded
  const user = await safeGetUser();

  return <HomeClient products={products} user={user} />;
}
```

**Key Points:**

| Aspect | Recommendation |
|--------|----------------|
| Timeout | 3 seconds (aggressive, fail fast) |
| Health check | Direct REST call to Supabase (no client library) |
| User fetch | Dynamic import to avoid import-time errors |
| Order | Health → Data → User (sequential with early exit) |
| Failure | Redirect to `/maintenance` page |

**When to Use:**

- Pages that must have data to render (product listings, forum posts)
- Pages where showing stale/empty data is worse than maintenance page
- High-traffic pages where fast failure detection is critical

**When NOT to Use:**

- Pages that can gracefully degrade (show login prompt, empty state)
- Client Components (use `MaintenanceBanner` polling instead)
- API routes (use the `/api/health` endpoint pattern)

---

## Reports Server Actions

Located: `src/app/actions/reports.ts`

Server actions for post reporting with AI-powered content analysis. Provides user-facing report submission and admin moderation workflows.

### Report Reasons

```typescript
type ReportReason =
  | 'spam'
  | 'inappropriate'
  | 'misleading'
  | 'expired'
  | 'wrong_location'
  | 'safety_concern'
  | 'duplicate'
  | 'other';
```

### Create Post Report

```typescript
import { createPostReport } from '@/app/actions/reports';

const result = await createPostReport({
  post_id: 42,
  reason: 'spam',
  description: 'This listing appears to be advertising',
});
```

**Parameters:**

```typescript
interface CreateReportInput {
  post_id: number;           // Post ID to report
  reason: ReportReason;      // Report category
  description?: string;      // Optional details (max 1000 chars)
}
```

**Returns:** `ActionResult<{ id: string; aiAnalyzed: boolean }>`

```typescript
// Success
{ success: true, data: { id: 'uuid', aiAnalyzed: true } }

// Error
{ success: false, error: 'You have already reported this post' }
```

**Behavior:**

1. Validates input with Zod schema
2. Checks user authentication
3. Prevents duplicate reports from same user
4. Creates report with `pending` status
5. Triggers async AI analysis (non-blocking)
6. Updates report with AI results if successful
7. Invalidates admin cache

**AI Analysis Fields (when successful):**

- `ai_analysis` - Structured analysis object
- `ai_severity_score` - Numeric severity (0-1)
- `ai_recommended_action` - Suggested moderation action
- `ai_confidence` - AI confidence score (0-1)
- `status` - Updated to `ai_reviewed`

**Example (Client Component):**

```typescript
'use client';
import { createPostReport, type ReportReason } from '@/app/actions/reports';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function ReportButton({ postId }: { postId: number }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReport = async (reason: ReportReason) => {
    setIsSubmitting(true);
    const result = await createPostReport({ post_id: postId, reason });
    setIsSubmitting(false);

    if (result.success) {
      toast.success('Report submitted. Thank you for helping keep our community safe!');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={() => handleReport('spam')}
      disabled={isSubmitting}
    >
      Report
    </Button>
  );
}
```

---

### Resolve Post Report (Admin)

```typescript
import { resolvePostReport } from '@/app/actions/reports';

const result = await resolvePostReport({
  report_id: 'uuid',
  action: 'post_hidden',
  notes: 'Confirmed spam content',
});
```

**Parameters:**

```typescript
interface ResolveReportInput {
  report_id: string;  // Report UUID
  action: 'dismissed' | 'warning_sent' | 'post_hidden' | 'post_removed' | 'user_banned';
  notes?: string;     // Optional moderator notes (max 500 chars)
}
```

**Returns:** `ActionResult<undefined>`

```typescript
// Success
{ success: true, data: undefined }

// Error
{ success: false, error: 'Admin access required' }
```

**Behavior:**

1. Validates input with Zod schema
2. Verifies admin/super_admin role
3. Checks report exists and is not already resolved
4. Updates report with resolution details:
   - `status` → `resolved`
   - `moderator_id` → current admin
   - `moderator_action` → selected action
   - `moderator_notes` → optional notes
   - `resolved_at` → timestamp
5. If action is `post_hidden` or `post_removed`:
   - Sets `posts.is_active = false`
   - Invalidates product caches
6. Invalidates admin cache

**Example (Admin Component):**

```typescript
'use client';
import { resolvePostReport } from '@/app/actions/reports';

export function ReportActions({ reportId }: { reportId: string }) {
  const handleResolve = async (action: string) => {
    const result = await resolvePostReport({
      report_id: reportId,
      action: action as any,
    });

    if (result.success) {
      toast.success('Report resolved');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="ghost" onClick={() => handleResolve('dismissed')}>
        Dismiss
      </Button>
      <Button variant="destructive" onClick={() => handleResolve('post_removed')}>
        Remove Post
      </Button>
    </div>
  );
}
```

---

### AI Analysis Types

```typescript
interface AIAnalysis {
  summary: string;           // Brief summary of the report
  categories: string[];      // Detected content categories
  reasoning: string;         // AI reasoning for assessment
  suggestedAction: string;   // Recommended moderation action
  riskFactors: string[];     // Identified risk factors
}
```

**AI Analysis Endpoint:** `POST /api/moderation/analyze`

The AI analysis is triggered asynchronously and does not block report creation. If AI analysis fails, the report is still created with `pending` status.

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
