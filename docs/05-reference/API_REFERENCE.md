# FoodShare API Reference

**Last Updated:** December 2025

## Overview

FoodShare uses a server-first architecture with Next.js 16. Data fetching is primarily done via Server Components using functions from `src/lib/data/`. Client-side API functions in `src/api/` are kept for backward compatibility and realtime subscriptions.

---

## Route Handlers

Next.js Route Handlers for client-side data fetching when Server Components aren't suitable.

### Chat Messages API

**Endpoint:** `GET /api/chat/messages`

**Location:** `src/app/api/chat/messages/route.ts`

Fetches messages for food sharing rooms. Used by `ChatPageClient` when switching between chats client-side.

**Authentication:** Required (returns 401 if not authenticated)

**Query Parameters:**

| Parameter | Type     | Required | Description                     |
| --------- | -------- | -------- | ------------------------------- |
| `roomId`  | `string` | Yes      | Food sharing room ID            |
| `limit`   | `number` | No       | Messages to fetch (default: 50) |
| `offset`  | `number` | No       | Pagination offset (default: 0)  |

**Success Response (200):**

```typescript
{
  messages: Array<{
    id: string;
    text: string;
    senderId: string;
    timestamp: string;
    image?: string;
    isOwn: boolean;
    senderName?: string;
    senderAvatar?: string;
  }>;
}
```

**Error Responses:**

| Status | Body                                    | Description                |
| ------ | --------------------------------------- | -------------------------- |
| 400    | `{ error: 'roomId is required' }`       | Missing required parameter |
| 401    | `{ error: 'Unauthorized' }`             | User not authenticated     |
| 500    | `{ error: 'Failed to fetch messages' }` | Server error               |

**Example Usage:**

```typescript
// Fetch food sharing messages
const response = await fetch(`/api/chat/messages?roomId=${roomId}`);
const { messages } = await response.json();

// Fetch forum messages with pagination
const response = await fetch(`/api/chat/messages?conversationId=${convId}&limit=20&offset=40`);
const { messages } = await response.json();
```

---

## Product API (`productAPI`)

Located: `src/api/productAPI.ts`

> ⚠️ **Deprecated:** This API layer is deprecated. Use `@/lib/data/products` for server-side data fetching instead. This file is kept for backward compatibility with client-side TanStack Query hooks.
>
> **Migration guide:**
>
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
  cursor?: number | null; // Last seen ID for cursor-based pagination
  limit?: number; // Items per page (default: 20, max: 100)
}
```

---

### Get Products by Type

```typescript
import { getProducts } from "@/lib/data/products";

// First page (cached)
const products = await getProducts("food");

// With pagination
const products = await getProducts("food", { limit: 10 });

// Subsequent pages (cursor-based)
const nextPage = await getProducts("food", { cursor: lastProductId, limit: 10 });
```

**Parameters:**

- `productType` - Type of product ('food', 'volunteer', 'fridge', etc.)
- `options` - Optional pagination options

**Returns:** `InitialProductStateType[]`

**Caching:** First page is cached with `CACHE_TAGS.PRODUCTS_BY_TYPE(type)`. Subsequent pages (with cursor) are fetched directly.

---

### Get Products Paginated (Infinite Scroll)

```typescript
import { getProductsPaginated } from "@/lib/data/products";

const result = await getProductsPaginated("food", { limit: 20 });
// { data: [...], nextCursor: 42, hasMore: true }

// Load more
const nextResult = await getProductsPaginated("food", {
  cursor: result.nextCursor,
  limit: 20,
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
import { getAllProducts } from "@/lib/data/products";

const products = await getAllProducts();
```

**Returns:** All active products ordered by `created_at` descending

**Caching:** Uses `CACHE_TAGS.PRODUCTS` tag

---

### Get Product by ID

```typescript
import { getProductById } from "@/lib/data/products";

const product = await getProductById(42);
```

**Parameters:**

- `productId` - Product ID (number)

**Returns:** `InitialProductStateType | null` - Active product with reviews, or null if not found or inactive

**Caching:** Uses `CACHE_TAGS.PRODUCT(productId)` tag

---

### Get Product Locations (Map)

```typescript
import { getProductLocations, getAllProductLocations } from "@/lib/data/products";

// By type
const foodLocations = await getProductLocations("food");

// All types
const allLocations = await getAllProductLocations();
```

**Returns:** `LocationType[]` - Minimal data for map markers (id, location_json, post_name, post_type, images)

**Caching:** Uses `CACHE_TAGS.PRODUCT_LOCATIONS` tag

---

### Get User Products

```typescript
import { getUserProducts } from "@/lib/data/products";

const userProducts = await getUserProducts(userId);
```

**Parameters:**

- `userId` - User's profile ID (UUID)

**Returns:** All products created by the user

**Caching:** Uses `CACHE_TAGS.USER_PRODUCTS(userId)` tag

---

### Search Products

```typescript
import { searchProducts } from "@/lib/data/products";

// Search all types
const results = await searchProducts("apple", "all");

// Search specific type
const foodResults = await searchProducts("apple", "food");
```

**Parameters:**

- `searchWord` - Search term (uses PostgreSQL full-text search)
- `productSearchType` - 'all' or specific type

**Returns:** `InitialProductStateType[]` - Matching products with reviews

**Caching:** Short cache duration due to dynamic nature

---

### Get Popular Product IDs

```typescript
import { getPopularProductIds } from "@/lib/data/products";

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
import { getChallenges } from "@/lib/data/challenges";

const challenges = await getChallenges();
```

**Returns:** `InitialProductStateType[]` - Challenges transformed for component compatibility

**Caching:** Uses `CACHE_TAGS.CHALLENGES` tag, revalidates per `CACHE_DURATIONS.CHALLENGES`

**Example (Server Component with parallel fetching):**

```typescript
// app/challenge/page.tsx
import { getChallenges, getPopularChallenges } from '@/lib/data/challenges';
import { getAuthSession } from '@/lib/data/auth';
import { ChallengesClient } from './ChallengesClient';

export const revalidate = 60;

export default async function ChallengePage() {
  // Parallel data fetching for optimal performance
  const [challenges, popularChallenges, user] = await Promise.all([
    getChallenges(),
    getPopularChallenges(3),
    getAuthSession(),
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
import { getChallengeById } from "@/lib/data/challenges";

const challenge = await getChallengeById(42);
```

**Parameters:**

- `challengeId` - Challenge ID (number)

**Returns:** `Challenge | null` - Raw challenge data (not transformed)

---

### Get Challenges by Difficulty

```typescript
import { getChallengesByDifficulty } from "@/lib/data/challenges";

const challenges = await getChallengesByDifficulty("easy");
```

**Parameters:**

- `difficulty` - Difficulty level string

**Returns:** `Challenge[]` - Raw challenge data

---

### Get User Challenges

```typescript
import { getUserChallenges } from "@/lib/data/challenges";

const challenges = await getUserChallenges(userId);
```

**Parameters:**

- `userId` - User's profile ID (UUID)

**Returns:** `Challenge[]` - All challenges created by the user

---

### Get Popular Challenges

```typescript
import { getPopularChallenges } from "@/lib/data/challenges";

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
import { acceptChallenge } from "@/app/actions/challenges";

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
import { hasAcceptedChallenge } from "@/app/actions/challenges";

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
import { toggleChallengeLike } from "@/app/actions/challenges";

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

## Auth Data Layer

Located: `src/lib/data/auth.ts`

Server-side data fetching functions for authentication and user data. These provide graceful degradation during database unavailability.

### Get Auth Session

```typescript
import { getAuthSession } from "@/lib/data/auth";

const user = await getAuthSession();
```

**Returns:** `AuthUser | null`

```typescript
interface AuthUser {
  id: string;
  email?: string;
  profile?: {
    id: string;
    first_name: string | null;
    second_name: string | null;
    nickname?: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}
```

> **Note:** Role data is not included in the profile. Use `checkIsAdmin()` from `@/lib/data/auth` to check admin status via the `user_roles` junction table.

**Graceful Degradation:**

Returns `null` (instead of throwing) when:

- User is not authenticated
- Auth service returns an error
- Database is unavailable (maintenance mode)
- Profile fetch fails (returns user without profile)

This ensures pages using `getAuthSession()` continue to render during maintenance, showing unauthenticated state rather than error pages.

**Example (Server Component with parallel fetching):**

```typescript
// app/challenge/[id]/page.tsx
import { getAuthSession } from '@/lib/data/auth';
import { getChallengeById } from '@/lib/data/challenges';

export default async function ChallengeDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Parallel fetch - getAuthSession() won't throw even if DB is down
  const [challenge, user] = await Promise.all([
    getChallengeById(parseInt(id, 10)),
    getAuthSession(),
  ]);

  if (!challenge) notFound();

  // user may be null (not logged in OR DB unavailable)
  return <ChallengeDetailClient challenge={challenge} user={user} />;
}
```

**Behavior During Maintenance:**

| Scenario                                | Result                                  |
| --------------------------------------- | --------------------------------------- |
| User authenticated, DB healthy          | Returns full `AuthUser` with profile    |
| User authenticated, profile fetch fails | Returns `AuthUser` with `profile: null` |
| User not authenticated                  | Returns `null`                          |
| Auth service error                      | Returns `null`                          |
| Database unavailable                    | Returns `null`                          |

**Note:** Components should handle `null` user gracefully, showing login prompts or limited functionality rather than assuming an error occurred.

---

## Safe Auth Helpers

Located: `src/lib/supabase/safe-auth.ts`

Low-level auth wrappers that gracefully handle database unavailability during maintenance. These return `null`/`false` instead of throwing errors.

### Safe Get Session

```typescript
import { safeGetSession } from "@/lib/supabase/safe-auth";

const session = await safeGetSession();
```

**Returns:** `Session | null`

Returns `null` if DB is unavailable or auth fails.

---

### Safe Get User

```typescript
import { safeGetUser } from "@/lib/supabase/safe-auth";

const user = await safeGetUser();
```

**Returns:** `User | null` (Supabase `User` type)

Returns `null` if DB is unavailable or auth fails.

---

### Safe Get User With Profile

```typescript
import { safeGetUserWithProfile } from "@/lib/supabase/safe-auth";

const user = await safeGetUserWithProfile();
```

**Returns:** `SafeAuthUser | null`

```typescript
interface SafeAuthUser {
  id: string;
  email: string | undefined;
  profile?: {
    id: string;
    first_name: string | null;
    second_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}
```

Returns user with profile data. If profile fetch fails, returns user with `profile: null`.

> **Note:** This function does not fetch role data. Use `safeCheckIsAdmin()` or `checkIsAdmin()` from `@/lib/data/auth` for admin status checks.

**Checking Admin Status:**

```typescript
// Use dedicated admin check function
import { safeCheckIsAdmin } from "@/lib/supabase/safe-auth";
const isAdmin = await safeCheckIsAdmin();

// Or use checkIsAdmin from data layer for detailed role info
import { checkIsAdmin } from "@/lib/data/auth";
const { isAdmin, roles } = await checkIsAdmin(userId);
```

---

### Safe Check Is Admin

```typescript
import { safeCheckIsAdmin } from "@/lib/supabase/safe-auth";

const isAdmin = await safeCheckIsAdmin();
```

**Returns:** `boolean`

Returns `false` if DB is unavailable, user not authenticated, or user is not admin.

---

### Is Database Available

```typescript
import { isDatabaseAvailable } from "@/lib/supabase/safe-auth";

const available = await isDatabaseAvailable();
```

**Returns:** `boolean`

Quick check if database is reachable. Useful for conditional rendering or feature flags.

---

### When to Use Safe Auth vs Regular Auth

| Use Case                         | Recommended                                   |
| -------------------------------- | --------------------------------------------- |
| Server Components (pages)        | User auth handled by Navbar in root layout    |
| Server Actions requiring user    | `getAuthSession()` from `@/lib/data/auth`     |
| Middleware auth checks           | `safeGetSession()`                            |
| Admin route protection           | `safeCheckIsAdmin()`                          |
| Feature flags based on DB status | `isDatabaseAvailable()`                       |
| Custom auth flows                | `safeGetUser()` or `safeGetUserWithProfile()` |

**Example (Middleware-style check):**

```typescript
import { safeGetSession, isDatabaseAvailable } from "@/lib/supabase/safe-auth";

export async function checkAccess() {
  // First check if DB is even available
  if (!(await isDatabaseAvailable())) {
    return { allowed: false, reason: "maintenance" };
  }

  const session = await safeGetSession();
  if (!session) {
    return { allowed: false, reason: "unauthenticated" };
  }

  return { allowed: true, userId: session.user.id };
}
```

---

## Chat Data Layer

Located: `src/lib/data/chat.ts`

Server-side data fetching functions for the unified chat system. Supports both food sharing chats and forum conversations.

> **Note:** Use these functions in Server Components. For client-side realtime subscriptions, use Supabase client directly.

### Food Sharing Chat Functions

#### Get User Chat Rooms

```typescript
import { getUserChatRooms } from "@/lib/data/chat";

const rooms = await getUserChatRooms(userId);
```

Returns all chat rooms where the user is either sharer or requester, with related post and profile data.

#### Get Chat Room

```typescript
import { getChatRoom } from "@/lib/data/chat";

const room = await getChatRoom(roomId);
```

Returns a specific chat room by ID with all relations.

#### Get or Create Chat Room

```typescript
import { getOrCreateChatRoom } from "@/lib/data/chat";

const room = await getOrCreateChatRoom(postId, sharerId, requesterId);
```

Finds existing room or creates a new one for the given post and participants.

#### Get Chat Messages

```typescript
import { getChatMessages } from "@/lib/data/chat";

const messages = await getChatMessages(roomId, limit, offset);
```

Returns paginated messages for a room in chronological order.

#### Get Unread Message Count

```typescript
import { getUnreadMessageCount } from "@/lib/data/chat";

const count = await getUnreadMessageCount(userId);
```

Returns the number of unread conversations for the user.

---

### Forum Conversation Functions

#### Get User Forum Conversations

```typescript
import { getUserForumConversations } from "@/lib/data/chat";

const conversations = await getUserForumConversations(userId);
```

Returns all forum conversations where the user is a participant (not archived, not left).

**Returns:** `ForumConversation[]` with participants and profiles

#### Get Forum Conversation

```typescript
import { getForumConversation } from "@/lib/data/chat";

const conversation = await getForumConversation(conversationId);
```

Returns a specific forum conversation by ID with participants and profiles.

#### Get Forum Messages

```typescript
import { getForumMessages } from "@/lib/data/chat";

const messages = await getForumMessages(conversationId, limit, offset);
```

**Parameters:**

- `conversationId` - Forum conversation UUID
- `limit` - Number of messages (default: 50)
- `offset` - Pagination offset (default: 0)

Returns paginated messages in chronological order (oldest first for display).

#### Get or Create Forum Conversation

```typescript
import { getOrCreateForumConversation } from "@/lib/data/chat";

const conversation = await getOrCreateForumConversation(userId, otherUserId);
```

Finds an existing 1:1 conversation between two users or creates a new one.

**Behavior:**

1. Searches for existing non-group conversation with exactly these two participants
2. If found, returns the full conversation with profiles
3. If not found, creates new conversation and adds both participants
4. Returns the new conversation with profiles

#### Get Unread Forum Message Count

```typescript
import { getUnreadForumMessageCount } from "@/lib/data/chat";

const count = await getUnreadForumMessageCount(userId);
```

Returns the number of forum conversations with unread messages.

---

### Unified Chat Functions

Functions that combine both food sharing and forum chat systems.

#### Get All User Chats

```typescript
import { getAllUserChats, type UnifiedChatRoom } from "@/lib/data/chat";

const chats = await getAllUserChats(userId);
```

Returns all chat rooms (both food sharing and forum) for a user, sorted by last message time.

**Returns:** `UnifiedChatRoom[]`

```typescript
type UnifiedChatRoom = {
  id: string;
  type: "food" | "forum";
  title: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  hasUnread: boolean;
  participants: Array<{
    id: string;
    firstName: string;
    secondName: string;
    avatarUrl: string | null;
  }>;
  // Food-specific
  postId?: number;
  postName?: string;
  postImage?: string;
  // Forum-specific
  isGroup?: boolean;
};
```

**Example (Server Component):**

```typescript
import { getAllUserChats } from '@/lib/data/chat';
import { getAuthSession } from '@/lib/data/auth';

export default async function ChatPage() {
  const user = await getAuthSession();
  if (!user) redirect('/auth/login');

  const chats = await getAllUserChats(user.id);

  return <ChatList chats={chats} />;
}
```

#### Get Total Unread Count

```typescript
import { getTotalUnreadCount } from "@/lib/data/chat";

const count = await getTotalUnreadCount(userId);
```

Returns the total unread message count across all chat systems (food + forum).

**Example (Navbar badge):**

```typescript
import { getTotalUnreadCount } from '@/lib/data/chat';

export async function ChatBadge({ userId }: { userId: string }) {
  const unreadCount = await getTotalUnreadCount(userId);

  if (unreadCount === 0) return null;

  return <Badge>{unreadCount}</Badge>;
}
```

---

### Chat Types

```typescript
// Food sharing chat room
type ChatRoom = {
  id: string;
  sharer: string;
  requester: string;
  post_id: number;
  last_message: string;
  last_message_sent_by: string;
  last_message_seen_by: string;
  last_message_time: string;
  posts?: { id: number; post_name: string; images: string[]; post_type: string };
  sharer_profile?: { id: string; first_name: string; second_name: string; avatar_url: string };
  requester_profile?: { id: string; first_name: string; second_name: string; avatar_url: string };
};

// Forum conversation
type ForumConversation = {
  id: string;
  is_group: boolean;
  title: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  is_archived: boolean;
  created_by: string;
  participants?: Array<{
    id: string;
    profile_id: string;
    role: string;
    last_read_at: string | null;
    is_muted: boolean;
    profiles?: { id: string; first_name: string; second_name: string; avatar_url: string };
  }>;
};

// Forum message
type ForumMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  sender?: { id: string; first_name: string; second_name: string; avatar_url: string };
};
```

---

## Chat API (`chatAPI`)

Located: `src/api/chatAPI.ts`

> ⚠️ **Note:** For server-side data fetching, prefer `@/lib/data/chat` functions. This client API is primarily for realtime subscriptions and client-side mutations.

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

## Admin API (Server Actions)

> **Note:** Admin API has been migrated to server actions following the server-first architecture.
> Use imports from `@/app/actions/admin.ts` and `@/app/actions/admin-listings.ts`.

### Check Admin Status

```typescript
import { checkIsAdmin } from "@/app/actions/auth";

const isAdmin = await checkIsAdmin();
if (isAdmin) {
  // Show admin features
}
```

### Get Admin Auth (with roles)

```typescript
import { getAdminAuth } from "@/lib/data/admin-auth";

const { isAdmin, isSuperAdmin, userId, roles } = await getAdminAuth();
```

---

### Get All Listings (Admin View)

```typescript
import { getAdminListings } from "@/lib/data/admin-listings";

const result = await getAdminListings({
  status: "pending",
  sortBy: "created_at",
  sortOrder: "desc",
  page: 1,
  limit: 20,
});
// result = { listings, total, page, totalPages }
```

---

## Admin Server Actions

Located: `src/app/actions/admin-listings.ts` and `src/app/actions/admin.ts`

Server actions for admin operations. All actions require admin authentication via `requireAdmin()` and log to the audit trail via `logAdminAction()`.

> **Note:** The client-side `adminAPI` has been removed. Use these server actions directly in components.

### Activate Listing

```typescript
import { activateListing } from "@/app/actions/admin-listings";

const result = await activateListing(42);
// { success: true } or { success: false, error: "..." }
```

**Parameters:**

- `id` - Post ID to activate

**Returns:** `{ success: boolean; error?: string }`

---

### Deactivate Listing

```typescript
import { deactivateListing } from "@/app/actions/admin-listings";

const result = await deactivateListing(42, "Violates community guidelines");
```

**Parameters:**

- `id` - Post ID to deactivate
- `reason` - Optional reason for deactivation (stored in admin_notes)

**Returns:** `{ success: boolean; error?: string }`

---

### Delete Listing

```typescript
import { deleteListing } from "@/app/actions/admin-listings";

const result = await deleteListing(42);
```

**Parameters:**

- `id` - Post ID to delete permanently

**Warning:** This is a destructive operation and cannot be undone.

**Returns:** `{ success: boolean; error?: string }`

---

### Update Listing

```typescript
import { updateListing } from "@/app/actions/admin-listings";

const result = await updateListing(42, {
  post_name: "Updated Name",
  post_description: "Updated description",
  admin_notes: "Edited by admin",
});
```

**Parameters:**

- `id` - Post ID to update
- `data` - `UpdateListingData` object with fields to update

```typescript
interface UpdateListingData {
  post_name?: string;
  post_description?: string;
  post_type?: string;
  pickup_time?: string;
  available_hours?: string;
  post_address?: string;
  is_active?: boolean;
  admin_notes?: string;
}
```

**Returns:** `{ success: boolean; error?: string }`

---

### Bulk Activate Listings

```typescript
import { bulkActivateListings } from "@/app/actions/admin-listings";

const result = await bulkActivateListings([42, 43, 44]);
```

**Parameters:**

- `ids` - Array of post IDs to activate

**Returns:** `{ success: boolean; error?: string }`

---

### Bulk Deactivate Listings

```typescript
import { bulkDeactivateListings } from "@/app/actions/admin-listings";

const result = await bulkDeactivateListings([42, 43, 44], "Spam content detected");
```

**Parameters:**

- `ids` - Array of post IDs to deactivate
- `reason` - Optional reason for deactivation (applied to all)

**Returns:** `{ success: boolean; error?: string }`

---

### Bulk Delete Listings

```typescript
import { bulkDeleteListings } from "@/app/actions/admin-listings";

const result = await bulkDeleteListings([42, 43, 44]);
```

**Parameters:**

- `ids` - Array of post IDs to delete permanently

**Warning:** This is a destructive operation and cannot be undone.

**Returns:** `{ success: boolean; error?: string }`

---

### Update Admin Notes

```typescript
import { updateAdminNotes } from "@/app/actions/admin-listings";

const result = await updateAdminNotes(42, "Reviewed and approved");
```

**Parameters:**

- `id` - Post ID
- `notes` - Admin notes to set

**Returns:** `{ success: boolean; error?: string }`

---

### Approve Listing (Alternative)

```typescript
import { approveListing } from "@/app/actions/admin";

const result = await approveListing(42);
```

**Parameters:**

- `id` - Post ID to approve (sets `is_active: true`)

**Returns:** `{ success: boolean; error?: string }`

---

### Reject Listing

```typescript
import { rejectListing } from "@/app/actions/admin";

const result = await rejectListing(42, "Inappropriate content");
```

**Parameters:**

- `id` - Post ID to reject (deletes the listing)
- `reason` - Reason for rejection (logged to audit)

**Returns:** `{ success: boolean; error?: string }`

---

### Get Users

```typescript
import { getUsers } from "@/app/actions/admin";

const { users, total } = await getUsers({
  search: "john",
  role: "admin",
  is_active: true,
  page: 1,
  limit: 20,
});
```

**Parameters:**

```typescript
interface UserFilters {
  search?: string; // Search by name or email
  role?: string; // Filter by role ('admin', 'user', etc.)
  is_active?: boolean; // Filter by active status
  page?: number; // Page number (default: 1)
  limit?: number; // Items per page (default: 20)
}
```

**Returns:** `{ users: AdminUser[]; total: number }`

---

### Update User Role

```typescript
import { updateUserRole } from "@/app/actions/admin";

const result = await updateUserRole(userId, "admin");
```

**Parameters:**

- `userId` - User's profile ID
- `role` - Role name to assign

**Returns:** `{ success: boolean; error?: string }`

---

### Update User Roles (Multiple)

```typescript
import { updateUserRoles } from "@/app/actions/admin-listings";

const result = await updateUserRoles(userId, {
  admin: true,
  volunteer: true,
  moderator: false,
});
```

**Parameters:**

- `userId` - User's profile ID
- `roles` - Object mapping role names to enabled/disabled

**Returns:** `{ success: boolean; error?: string }`

---

### Ban User

```typescript
import { banUser } from "@/app/actions/admin";

const result = await banUser(userId, "Repeated violations of community guidelines");
```

**Parameters:**

- `userId` - User's profile ID to ban
- `reason` - Reason for ban (stored in profile)

**Behavior:**

- Sets user's `is_active` to false
- Stores ban reason in profile
- Deactivates all user's listings
- Logs action to audit trail

**Returns:** `{ success: boolean; error?: string }`

---

## Admin Listings Data Layer

Located: `src/lib/data/admin-listings.ts`

Server-side data fetching functions for admin CRM listings management. Uses `unstable_cache` for optimal performance with tag-based invalidation.

### Types

```typescript
interface AdminListing {
  id: number;
  profile_id: string;
  post_name: string;
  post_description: string | null;
  post_type: string;
  pickup_time: string | null;
  available_hours: string | null;
  post_address: string | null;
  latitude: number | null;
  longitude: number | null;
  gif_url: string | null;
  gif_url_2: string | null;
  gif_url_3: string | null;
  is_active: boolean;
  post_arranged: boolean;
  post_arranged_to: string | null;
  post_arranged_at: string | null;
  post_views: number;
  post_like_counter: number;
  created_at: string;
  updated_at: string;
  admin_notes: string | null;
  status: "pending" | "approved" | "rejected" | "flagged";
  profile: {
    id: string;
    first_name: string | null;
    second_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface AdminListingsFilter {
  status?: "all" | "pending" | "approved" | "rejected" | "flagged";
  category?: string;
  search?: string;
  sortBy?: "created_at" | "updated_at" | "post_name" | "post_views";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

interface AdminListingsResult {
  listings: AdminListing[];
  total: number;
  page: number;
  totalPages: number;
}

interface ListingStats {
  total: number;
  active: number;
  inactive: number;
  arranged: number;
  byCategory: Record<string, number>;
}
```

---

### Get Admin Listings

```typescript
import { getAdminListings, getCachedAdminListings } from "@/lib/data/admin-listings";

// Direct fetch (no cache)
const result = await getAdminListings({
  status: "pending",
  category: "food",
  search: "apple",
  sortBy: "created_at",
  sortOrder: "desc",
  page: 1,
  limit: 20,
});

// Cached fetch (60s TTL)
const cachedResult = await getCachedAdminListings({ status: "pending" });
```

**Parameters:** `AdminListingsFilter` (all optional)

**Returns:** `AdminListingsResult`

**Caching:** `getCachedAdminListings` uses `CACHE_TAGS.ADMIN_LISTINGS` and `CACHE_TAGS.ADMIN` with 60s TTL

---

### Get Admin Listing by ID

```typescript
import { getAdminListingById } from "@/lib/data/admin-listings";

const listing = await getAdminListingById(42);
```

**Parameters:**

- `id` - Listing ID (number)

**Returns:** `AdminListing | null`

**Caching:** None (direct fetch)

---

### Get Listing Stats

```typescript
import { getListingStats } from "@/lib/data/admin-listings";

const stats = await getListingStats();
// { total: 150, active: 120, inactive: 30, arranged: 25, byCategory: { food: 80, ... } }
```

**Returns:** `ListingStats`

**Caching:** Uses `CACHE_TAGS.ADMIN_STATS` and `CACHE_TAGS.ADMIN` with 300s TTL

---

### Check Admin Role (Legacy)

> **Note:** For new code, prefer `getAdminAuth()` from `@/lib/data/admin-auth` which provides a cleaner API and doesn't require passing userId.

```typescript
import { checkAdminRole } from "@/lib/data/admin-listings";

const { isAdmin, roles } = await checkAdminRole(userId);
// { isAdmin: true, roles: { admin: true, volunteer: true } }
```

**Parameters:**

- `userId` - User's profile ID (UUID)

**Returns:** `{ isAdmin: boolean; roles: Record<string, boolean> }`

**Behavior:**

The function uses the `user_roles` junction table as single source of truth:

- Queries `user_roles` joined with `roles` table to get role names
- `isAdmin` is `true` if user has `admin` or `superadmin` role
- `roles` is an object with role names as keys and `true` as values
- Returns `{ isAdmin: false, roles: {} }` on error

**Example (Server Component):**

```typescript
// app/admin/listings/page.tsx
import { getAdminListings, getListingStats } from '@/lib/data/admin-listings';
import { getAdminAuth } from '@/lib/data/admin-auth';
import { redirect } from 'next/navigation';

export default async function AdminListingsPage() {
  const { isAdmin, userId } = await getAdminAuth();
  if (!userId) redirect('/auth/login');
  if (!isAdmin) redirect('/');

  const [{ listings, total, totalPages }, stats] = await Promise.all([
    getAdminListings({ status: 'pending', limit: 20 }),
    getListingStats(),
  ]);

  return (
    <AdminListingsClient
      initialListings={listings}
      total={total}
      totalPages={totalPages}
      stats={stats}
    />
  );
}
```

---

## Admin Auth API (`admin-auth`)

Located: `src/lib/data/admin-auth.ts`

Single source of truth for admin authentication and authorization. Use this module for all admin-related auth checks.

### Get Admin Auth

```typescript
import { getAdminAuth } from "@/lib/data/admin-auth";

const { isAdmin, isSuperAdmin, userId, roles } = await getAdminAuth();
```

**Returns:** `AdminAuthResult`

```typescript
interface AdminAuthResult {
  isAdmin: boolean; // true if user has 'admin' or 'superadmin' role
  isSuperAdmin: boolean; // true if user has 'superadmin' role
  userId: string | null; // User's profile ID or null if not authenticated
  roles: string[]; // Array of role names: ['admin', 'volunteer']
}
```

**Behavior:**

- Gets current user from Supabase auth session
- Queries `user_roles` junction table for role assignments
- Returns safe defaults if not authenticated or on error

**Example (Server Component):**

```typescript
// app/admin/page.tsx
import { getAdminAuth } from '@/lib/data/admin-auth';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const { isAdmin, userId } = await getAdminAuth();

  if (!userId) redirect('/auth/login');
  if (!isAdmin) redirect('/');

  return <AdminDashboard />;
}
```

---

### Require Admin

```typescript
import { requireAdmin } from "@/lib/data/admin-auth";

const userId = await requireAdmin();
```

**Returns:** `string` - User's profile ID

**Throws:**

- `Error("Not authenticated")` - If user is not logged in
- `Error("Admin access required")` - If user doesn't have admin role

**Use Case:** Server Actions that require admin privileges

**Example (Server Action):**

```typescript
// app/actions/admin.ts
"use server";

import { requireAdmin, logAdminAction } from "@/lib/data/admin-auth";
import { createClient } from "@/lib/supabase/server";

export async function deleteUser(userId: string) {
  const adminId = await requireAdmin(); // Throws if not admin

  const supabase = await createClient();
  await supabase.from("profiles").delete().eq("id", userId);

  await logAdminAction("delete", "user", userId, adminId);

  return { success: true };
}
```

---

### Require Super Admin

```typescript
import { requireSuperAdmin } from "@/lib/data/admin-auth";

const userId = await requireSuperAdmin();
```

**Returns:** `string` - User's profile ID

**Throws:**

- `Error("Not authenticated")` - If user is not logged in
- `Error("Super admin access required")` - If user doesn't have superadmin role

**Use Case:** Sensitive operations like role management, system configuration

---

### Log Admin Action

```typescript
import { logAdminAction } from "@/lib/data/admin-auth";

await logAdminAction(action, resourceType, resourceId, adminId, metadata);
```

**Parameters:**

| Parameter      | Type                      | Description                                                     |
| -------------- | ------------------------- | --------------------------------------------------------------- |
| `action`       | `string`                  | Action performed: 'create', 'update', 'delete', 'approve', etc. |
| `resourceType` | `string`                  | Type of resource: 'user', 'listing', 'review', etc.             |
| `resourceId`   | `string`                  | ID of the affected resource                                     |
| `adminId`      | `string`                  | ID of the admin performing the action                           |
| `metadata`     | `Record<string, unknown>` | Optional additional context                                     |

**Example:**

```typescript
await logAdminAction("approve", "listing", "42", adminId, {
  previousStatus: "pending",
  reason: "Meets guidelines",
});
```

**Database:** Inserts into `admin_audit_log` table for compliance and debugging

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
  status: "healthy" | "degraded" | "maintenance";
  database: boolean;
  timestamp: string;
  message?: string;
  retryAfter?: number; // seconds until next check recommended
  services: {
    database: "up" | "down" | "degraded";
    auth: "up" | "down" | "unknown";
    storage: "up" | "down" | "unknown";
  };
  upgradeStatus?: {
    status: string; // e.g., 'upgrading', 'COMPLETED', 'FAILED'
    progress?: string; // upgrade progress indicator
    targetVersion?: string; // target Postgres version
  };
}
```

**Response Codes:**

| Status        | Code | Description                                                      |
| ------------- | ---- | ---------------------------------------------------------------- |
| `healthy`     | 200  | Database reachable, all services operational                     |
| `maintenance` | 503  | Database unreachable, upgrade in progress, or services unhealthy |

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

- Adaptive polling interval (60s initial, exponential backoff up to 2 minutes max)
- 12-second fetch timeout with `AbortController` (accommodates slow cold starts)
- **Consecutive failures threshold** - banner only shows after 3 consecutive failures (reduces false positives)
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
  status: "healthy" | "degraded" | "maintenance";
  database: boolean;
  message?: string;
  retryAfter?: number;
}

// Polling with adaptive interval and exponential backoff
const INITIAL_POLL_INTERVAL = 60000; // 60 seconds between checks
const MAX_POLL_INTERVAL = 120000; // 2 minutes max
const CONSECUTIVE_FAILURES_THRESHOLD = 3; // Only show banner after 3 consecutive failures
const [pollInterval, setPollInterval] = useState(INITIAL_POLL_INTERVAL);
const [isChecking, setIsChecking] = useState(false);
const consecutiveFailures = useRef(0);
const [showBanner, setShowBanner] = useState(false);

const checkHealth = async () => {
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 12000); // 12s for slow cold starts

  try {
    const res = await fetch("/api/health", {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(fetchTimeout);

    const data: HealthStatus = await res.json();
    setStatus(data);

    // Adjust polling interval based on status
    if (data.status === "healthy") {
      pollIntervalRef.current = MAX_POLL_INTERVAL;
    } else {
      pollIntervalRef.current = data.retryAfter ? data.retryAfter * 1000 : INITIAL_POLL_INTERVAL;
    }
  } catch {
    // Network error or timeout = assume maintenance
    setStatus({
      status: "maintenance",
      database: false,
      timestamp: new Date().toISOString(),
      message: "Unable to reach server",
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

export default async function ProductsPage() {
  // 1. Check DB health first (fast fail)
  const dbHealthy = await isDatabaseHealthy();
  if (!dbHealthy) {
    redirect('/maintenance');
  }

  // 2. Fetch products
  let products;
  try {
    products = await getProducts();
  } catch {
    redirect('/maintenance');
  }

  // 3. Render page (user auth handled by Navbar in root layout)
  return <HomeClient initialProducts={products} productType={productType} />;
}
```

**Key Points:**

| Aspect       | Recommendation                                           |
| ------------ | -------------------------------------------------------- |
| Timeout      | 3 seconds (aggressive, fail fast)                        |
| Health check | Direct REST call to Supabase (no client library)         |
| User auth    | Handled by Navbar in root layout, not in page components |
| Order        | Health → Data (sequential with early exit)               |
| Failure      | Redirect to `/maintenance` page                          |

**When to Use:**

- Pages that must have data to render (product listings, forum posts)
- Pages where showing stale/empty data is worse than maintenance page
- High-traffic pages where fast failure detection is critical

**When NOT to Use:**

- Pages that can gracefully degrade (show login prompt, empty state)
- Client Components (use `MaintenanceBanner` polling instead)
- API routes (use the `/api/health` endpoint pattern)

---

## CRM Server Actions

Located: `src/app/actions/crm.ts`

Server actions for Customer Relationship Management mutations. These handle customer lifecycle management, notes, and tagging.

### Import Profiles as CRM Customers

```typescript
import { importProfilesAsCRMCustomers } from "@/app/actions/crm";

const result = await importProfilesAsCRMCustomers();
```

**Returns:** `{ success: boolean; imported: number; error?: string }`

**Behavior:**

- Finds profiles without CRM customer records
- Creates CRM customer records with default values:
  - `status: 'active'`
  - `lifecycle_stage: 'lead'`
  - `engagement_score: 50`
  - `churn_risk_score: 0`
- Invalidates `CRM_CACHE_TAGS.CUSTOMERS`

---

### Update Customer Lifecycle

```typescript
import { updateCustomerLifecycle } from "@/app/actions/crm";

const result = await updateCustomerLifecycle(customerId, "champion");
```

**Parameters:**

- `customerId` - CRM customer UUID
- `stage` - `'lead' | 'active' | 'champion' | 'at_risk' | 'churned'`

**Returns:** `{ success: boolean; error?: string }`

**Cache Invalidation:** `CRM_CACHE_TAGS.CUSTOMERS`, `CRM_CACHE_TAGS.CUSTOMER(customerId)`

---

### Update Engagement Score

```typescript
import { updateEngagementScore } from "@/app/actions/crm";

const result = await updateEngagementScore(customerId, 85);
```

**Parameters:**

- `customerId` - CRM customer UUID
- `score` - Number (clamped to 0-100)

**Returns:** `{ success: boolean; error?: string }`

---

### Archive Customer

```typescript
import { archiveCustomer } from "@/app/actions/crm";

const result = await archiveCustomer(customerId, "User requested deletion");
```

**Parameters:**

- `customerId` - CRM customer UUID
- `reason` - Optional archive reason

**Returns:** `{ success: boolean; error?: string }`

**Behavior:** Sets `is_archived: true`, `archived_at`, and `archived_reason`

---

### Add Customer Note

```typescript
import { addCustomerNote } from "@/app/actions/crm";

const result = await addCustomerNote(customerId, "Follow-up call scheduled", "call");
```

**Parameters:**

- `customerId` - CRM customer UUID
- `content` - Note text
- `noteType` - `'general' | 'call' | 'email' | 'meeting' | 'support'` (default: `'general'`)

**Returns:** `{ success: boolean; error?: string }`

**Behavior:**

- Requires authentication
- Records admin who created the note
- Updates customer's `last_interaction_at`
- Invalidates `CRM_CACHE_TAGS.CUSTOMER_NOTES(customerId)`

---

### Assign Tag to Customer

```typescript
import { assignTagToCustomer } from "@/app/actions/crm";

const result = await assignTagToCustomer(customerId, tagId);
```

**Parameters:**

- `customerId` - CRM customer UUID
- `tagId` - CRM tag UUID

**Returns:** `{ success: boolean; error?: string }`

**Note:** Silently succeeds if tag is already assigned (idempotent)

---

### Remove Tag from Customer

```typescript
import { removeTagFromCustomer } from "@/app/actions/crm";

const result = await removeTagFromCustomer(customerId, tagId);
```

**Parameters:**

- `customerId` - CRM customer UUID
- `tagId` - CRM tag UUID

**Returns:** `{ success: boolean; error?: string }`

---

### Create Tag

```typescript
import { createTag } from "@/app/actions/crm";

const result = await createTag("VIP", "#FFD700", "High-value customers");
```

**Parameters:**

- `name` - Tag name
- `color` - Hex color code
- `description` - Optional description

**Returns:** `{ success: boolean; tagId?: string; error?: string }`

**Cache Invalidation:** `CRM_CACHE_TAGS.TAGS`

---

### CRM Cache Tags

Located: `src/lib/data/crm.ts`

```typescript
export const CRM_CACHE_TAGS = {
  CUSTOMERS: "crm-customers",
  CUSTOMER: (id: string) => `crm-customer-${id}`,
  CUSTOMER_NOTES: (customerId: string) => `crm-customer-notes-${customerId}`,
  TAGS: "crm-tags",
  DASHBOARD: "crm-dashboard",
} as const;
```

---

## Campaign Server Actions

Located: `src/app/actions/campaigns.ts`

Server actions for newsletter campaign CRUD operations. All actions require admin authentication via `verifyAdminAccess()`.

### Types

```typescript
interface CreateCampaignInput {
  name: string; // Required
  subject: string; // Required
  content: string;
  campaignType?: string; // Default: 'newsletter'
  segmentId?: string;
  scheduledAt?: string; // ISO date - sets status to 'scheduled'
}

interface UpdateCampaignInput {
  id: string; // Required
  name?: string;
  subject?: string;
  content?: string;
  campaignType?: string;
  segmentId?: string;
  scheduledAt?: string;
}

interface CampaignResult {
  id: string;
  name: string;
  status: string;
}
```

### Create Campaign

```typescript
import { createCampaign } from "@/app/actions/campaigns";

const result = await createCampaign({
  name: "Weekly Newsletter",
  subject: "This Week in FoodShare",
  content: "<h1>Hello!</h1>...",
  campaignType: "newsletter",
  segmentId: "segment-uuid", // optional
  scheduledAt: "2025-12-15T10:00:00Z", // optional - sets status to 'scheduled'
});
```

**Returns:** `ServerActionResult<CampaignResult>`

**Behavior:**

- Creates campaign with status `draft` (or `scheduled` if `scheduledAt` provided)
- Validates required fields (name, subject)
- Invalidates `CACHE_TAGS.ADMIN` and revalidates `/admin/email`

---

### Update Campaign

```typescript
import { updateCampaign } from "@/app/actions/campaigns";

const result = await updateCampaign({
  id: "campaign-uuid",
  name: "Updated Name",
  subject: "New Subject Line",
});
```

**Returns:** `ServerActionResult<CampaignResult>`

**Behavior:**

- Updates only provided fields
- If `scheduledAt` is updated, status changes to `scheduled` or `draft`

---

### Delete Campaign

```typescript
import { deleteCampaign } from "@/app/actions/campaigns";

const result = await deleteCampaign("campaign-uuid");
```

**Returns:** `ServerActionResult<void>`

**Behavior:**

- Blocks deletion if campaign status is `sending`
- Returns error for campaigns currently being sent

---

### Duplicate Campaign

```typescript
import { duplicateCampaign } from "@/app/actions/campaigns";

const result = await duplicateCampaign("campaign-uuid");
```

**Returns:** `ServerActionResult<CampaignResult>`

**Behavior:**

- Creates copy with `(Copy)` suffix in name
- New campaign has `draft` status
- Copies content, subject, campaign_type, segment_id

---

### Pause Campaign

```typescript
import { pauseCampaign } from "@/app/actions/campaigns";

const result = await pauseCampaign("campaign-uuid");
```

**Returns:** `ServerActionResult<void>`

**Behavior:**

- Sets status to `paused`
- Only affects campaigns with status `sending` or `scheduled`

---

### Resume Campaign

```typescript
import { resumeCampaign } from "@/app/actions/campaigns";

const result = await resumeCampaign("campaign-uuid");
```

**Returns:** `ServerActionResult<void>`

**Behavior:**

- Resumes paused campaigns
- Sets status to `scheduled` (if has scheduled_at) or `sending`

---

## Reports Server Actions

Located: `src/app/actions/reports.ts`

Server actions for post reporting with AI-powered content analysis. Provides user-facing report submission and admin moderation workflows.

### Report Reasons

```typescript
type ReportReason =
  | "spam"
  | "inappropriate"
  | "misleading"
  | "expired"
  | "wrong_location"
  | "safety_concern"
  | "duplicate"
  | "other";
```

### Create Post Report

```typescript
import { createPostReport } from "@/app/actions/reports";

const result = await createPostReport({
  post_id: 42,
  reason: "spam",
  description: "This listing appears to be advertising",
});
```

**Parameters:**

```typescript
interface CreateReportInput {
  post_id: number; // Post ID to report
  reason: ReportReason; // Report category
  description?: string; // Optional details (max 1000 chars)
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
import { resolvePostReport } from "@/app/actions/reports";

const result = await resolvePostReport({
  report_id: "uuid",
  action: "post_hidden",
  notes: "Confirmed spam content",
});
```

**Parameters:**

```typescript
interface ResolveReportInput {
  report_id: string; // Report UUID
  action: "dismissed" | "warning_sent" | "post_hidden" | "post_removed" | "user_banned";
  notes?: string; // Optional moderator notes (max 500 chars)
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
  summary: string; // Brief summary of the report
  categories: string[]; // Detected content categories
  reasoning: string; // AI reasoning for assessment
  suggestedAction: string; // Recommended moderation action
  riskFactors: string[]; // Identified risk factors
}
```

**AI Analysis Endpoint:** `POST /api/moderation/analyze`

- **Authentication:** Requires admin role (401 if not logged in, 403 if not admin)
- The AI analysis is triggered asynchronously and does not block report creation
- If AI analysis fails, the report is still created with `pending` status

---

## Admin AI Insights Data Layer

Located: `src/lib/data/admin-insights.ts`

Server-side data fetching functions for AI-powered admin insights using xAI's Grok models via Vercel AI SDK. Provides platform metrics, churn analysis, and AI-generated business insights.

> **Note:** This module contains API keys and must only be used server-side. Use the server actions in `src/app/actions/admin-insights.ts` for client components.

**Dependencies:**

- `@ai-sdk/xai` - xAI provider for Vercel AI SDK
- `ai` - Vercel AI SDK for `generateText`

### Types

```typescript
interface PlatformMetrics {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalListings: number;
  activeListings: number;
  newListings7d: number;
  newListings30d: number;
  totalMessages: number;
  listingsByCategory: Record<string, number>;
  averageViews: number;
}

interface ChurnData {
  totalUsers: number;
  atRiskUsers: number;
  churnRate: number;
}

interface EmailCampaignData {
  totalEmails: number;
  successRate: number;
  bestSendTime: string;
  providerStats: Record<string, number>;
}
```

---

### Get Platform Metrics

```typescript
import { getPlatformMetrics } from "@/lib/data/admin-insights";

const metrics = await getPlatformMetrics();
```

**Returns:** `PlatformMetrics`

Aggregates user activity, listing statistics, and engagement metrics from the database.

---

### Get Churn Data

```typescript
import { getChurnData } from "@/lib/data/admin-insights";

const churn = await getChurnData();
// { totalUsers: 1000, atRiskUsers: 150, churnRate: 15.0 }
```

**Returns:** `ChurnData`

Identifies users at risk of churning (inactive for 30+ days).

---

### Get Email Campaign Data

```typescript
import { getEmailCampaignData } from "@/lib/data/admin-insights";

const emailData = await getEmailCampaignData();
```

**Returns:** `EmailCampaignData | null`

Analyzes email logs for success rates, optimal send times, and provider performance.

---

### Get Grok Insights

```typescript
import { getGrokInsights } from "@/lib/data/admin-insights";

const insight = await getGrokInsights("How can I reduce user churn?");

// With metrics context (default)
const insight = await getGrokInsights("Analyze listing trends", true);

// Without metrics (faster)
const insight = await getGrokInsights("General question", false);
```

**Parameters:**

- `userQuery` - The question to ask the AI
- `includeMetrics` - Whether to include platform metrics in context (default: `true`)

**Returns:** `string` - AI-generated insight

**Caching:** Results are cached for 1 hour based on query + includeMetrics.

**Model:** Uses `grok-3-mini` for all queries via Vercel AI Gateway for optimal cost/performance balance.

**Implementation:** Uses Vercel AI SDK (`generateText`) with xAI provider for standardized AI integration.

---

### Get Suggested Questions

```typescript
import { getSuggestedQuestions } from "@/lib/data/admin-insights";

const questions = await getSuggestedQuestions();
// ["Why is my churn rate so high?", "Which users are most likely to churn?", ...]
```

**Returns:** `string[]` - Up to 6 contextual question suggestions

Dynamically generates suggestions based on current platform metrics.

---

### Clear Insight Cache

```typescript
import { clearInsightCache } from "@/lib/data/admin-insights";

clearInsightCache();
```

Clears the in-memory insight cache. Useful after significant data changes.

---

### Server Actions

Located: `src/app/actions/admin-insights.ts`

Use these server actions from client components:

```typescript
"use client";
import { getGrokInsight, getInsightSuggestions } from "@/app/actions/admin-insights";

// Get AI insight
const result = await getGrokInsight("How can I improve engagement?");
if (result.success) {
  console.log(result.insight);
}

// Get suggested questions
const suggestions = await getInsightSuggestions();
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
