# Storage Services

FoodShare uses several Vercel/Upstash storage services for different purposes.

## Upstash Redis

**Purpose:** Distributed caching, rate limiting, session storage, distributed locks

**Client Location:** `src/lib/storage/redis.ts`

### Usage

```typescript
import { cache, rateLimiter, lock, REDIS_KEYS, CACHE_TTL } from '@/lib/storage/redis';

// Cache operations (all methods have built-in error handling)
const data = await cache.get<Product>(REDIS_KEYS.PRODUCT('123'));
const success = await cache.set(REDIS_KEYS.PRODUCT('123'), data, CACHE_TTL.MEDIUM);

// Cache-aside pattern
const products = await cache.getOrSet(
  REDIS_KEYS.PRODUCTS_LIST('food'),
  () => fetchProducts('food'),
  CACHE_TTL.SHORT
);

// Delete operations
await cache.del('key');                    // Returns boolean
await cache.delMany(['key1', 'key2']);     // Returns number of deleted keys
await cache.delByPattern('products:*');    // Returns number of deleted keys

// Counter operations
const count = await cache.incr('counter:views');

// TTL operations
await cache.expire('key', 3600);           // Set expiration
const ttl = await cache.ttl('key');        // Get remaining TTL

// Rate limiting
const { allowed, remaining, reset } = await rateLimiter.check('api:user123', 100, 60);

// Distributed locks
const result = await lock.withLock('my-task', async () => {
  // Critical section - only one instance runs at a time
  return await performTask();
});
```

### Cache Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `get<T>(key)` | `T \| null` | Get cached value |
| `set(key, value, ttl?)` | `boolean` | Set value with optional TTL |
| `del(key)` | `boolean` | Delete single key |
| `delMany(keys)` | `number` | Delete multiple keys |
| `delByPattern(pattern)` | `number` | Delete by glob pattern |
| `exists(key)` | `boolean` | Check if key exists |
| `getOrSet(key, fetcher, ttl?)` | `T` | Cache-aside pattern |
| `incr(key)` | `number` | Increment counter |
| `expire(key, seconds)` | `boolean` | Set expiration |
| `ttl(key)` | `number` | Get remaining TTL |

All methods include error handling and return sensible defaults on failure (null, false, 0, -1).

### Environment Variables

```bash
KV_REST_API_URL=<your-url>
KV_REST_API_TOKEN=<your-token>
REDIS_URL=<your-redis-url>
```

## Vercel Blob

**Purpose:** File storage for user uploads (images, documents)

**Client Location:** `src/lib/storage/blob.ts`

### Usage

```typescript
import {
  uploadBlob,
  deleteBlob,
  listBlobs,
  getBlobMetadata,
  validateFile,
  uploadProductImage,
  uploadUserAvatar,
  uploadChatAttachment,
  deleteProductBlobs,
  MAX_FILE_SIZES,
  ALLOWED_IMAGE_TYPES,
  BLOB_PATHS,
} from '@/lib/storage/blob';

// Upload with validation
const result = await uploadProductImage(productId, file, 'photo.jpg');
if ('error' in result) {
  console.error(result.error);
} else {
  console.log(result.url);
}

// Upload user avatar
const avatarResult = await uploadUserAvatar(userId, file);

// Upload chat attachment
const attachmentResult = await uploadChatAttachment(roomId, file, 'document.pdf');

// Generic upload
const blob = await uploadBlob('images/photo.jpg', file, {
  access: 'public',
  cacheControlMaxAge: 31536000, // 1 year
});

// Delete single blob
await deleteBlob(url);

// Delete all product images
const deletedCount = await deleteProductBlobs(productId);

// List blobs with prefix
const { blobs, hasMore, cursor } = await listBlobs({
  prefix: 'products/',
  limit: 100,
});

// Get blob metadata
const metadata = await getBlobMetadata(url);

// Validate file before upload
const validation = validateFile(file, {
  maxSize: MAX_FILE_SIZES.IMAGE, // 5MB
  allowedTypes: ALLOWED_IMAGE_TYPES,
});
if (!validation.valid) {
  console.error(validation.error);
}
```

### File Size Limits

```typescript
MAX_FILE_SIZES.IMAGE    // 5MB - Product images
MAX_FILE_SIZES.AVATAR   // 2MB - User avatars
MAX_FILE_SIZES.DOCUMENT // 10MB - Documents
```

### Blob Path Organization

```typescript
BLOB_PATHS.PRODUCT_IMAGES(productId)  // 'products/{productId}/'
BLOB_PATHS.USER_AVATARS(userId)       // 'avatars/{userId}/'
BLOB_PATHS.CHAT_ATTACHMENTS(roomId)   // 'chat/{roomId}/'
BLOB_PATHS.DOCUMENTS                  // 'documents/'
```

### Environment Variables

Automatically configured when linked to Vercel project.

## Upstash Vector

**Purpose:** Vector embeddings for semantic search

### Usage

```typescript
import { Index } from '@upstash/vector';

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Query vectors
const result = await index.fetch(['vector-id'], { includeData: true });
```

### Environment Variables

```bash
UPSTASH_VECTOR_REST_URL=<your-url>
UPSTASH_VECTOR_REST_TOKEN=<your-token>
```

## Upstash QStash

**Purpose:** Background jobs, scheduled tasks, webhooks

**Client Location:** `src/lib/storage/qstash.ts`

### Usage

```typescript
import {
  publishMessage,
  publishDelayed,
  createSchedule,
  getSchedule,
  pauseSchedule,
  resumeSchedule,
  deleteSchedule,
  listSchedules,
  verifyRequest,
  queueEmail,
  queueImageProcessing,
  JOB_TYPES,
} from '@/lib/storage/qstash';

// Publish a message to a URL endpoint
const result = await publishMessage(
  'https://your-app.com/api/process',
  { taskId: '123' },
  {
    retries: 3,
    delay: 60, // delay in seconds
    deduplicationId: 'unique-id',
    contentBasedDeduplication: true,
  }
);
if (result.success) {
  console.log('Message ID:', result.messageId);
}

// Publish with delay
const delayed = await publishDelayed(
  'https://your-app.com/api/notify',
  { userId: 'abc' },
  300 // 5 minutes delay
);

// Create a recurring schedule (cron)
const schedule = await createSchedule(
  'daily-cleanup',
  'https://your-app.com/api/jobs/cleanup-expired',
  '0 0 * * *', // Daily at midnight
  { type: 'expired-listings' }
);

// Get schedule info
const info = await getSchedule('daily-cleanup');
// Returns: { scheduleId, cron, destination, createdAt, isPaused }

// Pause/resume schedules
await pauseSchedule('daily-cleanup');
await resumeSchedule('daily-cleanup');

// List all schedules
const schedules = await listSchedules();

// Delete a schedule
await deleteSchedule('daily-cleanup');

// Queue common jobs
await queueEmail('user@example.com', 'Welcome!', 'welcome', { name: 'John' });
await queueImageProcessing('https://...', 'product-123');

// Verify incoming webhook (in API route)
export async function POST(request: Request) {
  const isValid = await verifyRequest(request);
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 });
  }
  // Process the job...
}
```

### Publish Options

| Option | Type | Description |
|--------|------|-------------|
| `delay` | `number` | Delay in seconds before delivery |
| `notBefore` | `number` | Unix timestamp for scheduled delivery |
| `retries` | `number` | Number of retry attempts (default: 3) |
| `callback` | `string` | URL to call after successful completion |
| `failureCallback` | `string` | URL to call on failure |
| `deduplicationId` | `string` | Unique ID to prevent duplicate messages |
| `contentBasedDeduplication` | `boolean` | Deduplicate based on message content |

### Job Types

```typescript
JOB_TYPES.SEND_EMAIL         // 'send-email'
JOB_TYPES.PROCESS_IMAGE      // 'process-image'
JOB_TYPES.CLEANUP_EXPIRED    // 'cleanup-expired'
JOB_TYPES.SYNC_SEARCH_INDEX  // 'sync-search-index'
JOB_TYPES.GENERATE_EMBEDDINGS // 'generate-embeddings'
```

### Environment Variables

```bash
QSTASH_URL=<your-url>
QSTASH_TOKEN=<your-token>
QSTASH_CURRENT_SIGNING_KEY=<signing-key>
QSTASH_NEXT_SIGNING_KEY=<next-signing-key>
```

## Upstash Search

**Purpose:** Full-text search functionality

**Client Location:** `src/lib/storage/search.ts`

### Usage

```typescript
import {
  indexDocument,
  indexDocuments,
  searchDocuments,
  deleteDocument,
  deleteDocuments,
  indexProduct,
  searchProducts,
  removeProductFromSearch,
  SEARCH_INDEXES,
} from '@/lib/storage/search';

// Index a single document (returns boolean)
const success = await indexDocument(SEARCH_INDEXES.PRODUCTS, {
  id: 'product-123',
  title: 'Organic Apples',
  description: 'Fresh organic apples',
  type: 'food',
});

// Index multiple documents (returns boolean)
const bulkSuccess = await indexDocuments(SEARCH_INDEXES.PRODUCTS, products);

// Search documents (returns empty results on error)
const { results, total } = await searchDocuments(SEARCH_INDEXES.PRODUCTS, 'organic', {
  limit: 10,
  offset: 0,
  filter: 'type = "food"',
});

// Delete single document (returns boolean)
const deleted = await deleteDocument(SEARCH_INDEXES.PRODUCTS, 'product-123');

// Delete multiple documents (returns count of deleted)
const deletedCount = await deleteDocuments(SEARCH_INDEXES.PRODUCTS, ['id1', 'id2']);

// Product-specific helpers
await indexProduct({ id: '123', title: 'Apples', description: '...', type: 'food', ... });
const { results } = await searchProducts('vegetables', { type: 'food', activeOnly: true });
await removeProductFromSearch('product-123');
```

### Search Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `indexDocument(index, doc)` | `boolean` | Index single document |
| `indexDocuments(index, docs)` | `boolean` | Index multiple documents |
| `searchDocuments(index, query, opts?)` | `{ results, total }` | Search with pagination |
| `deleteDocument(index, id)` | `boolean` | Delete single document |
| `deleteDocuments(index, ids)` | `number` | Delete multiple, returns count |

All methods include built-in error handling and return sensible defaults on failure (false, 0, empty results).

### Search Indexes

```typescript
SEARCH_INDEXES.PRODUCTS  // 'products'
SEARCH_INDEXES.USERS     // 'users'
SEARCH_INDEXES.MESSAGES  // 'messages'
```

### Environment Variables

```bash
UPSTASH_SEARCH_REST_URL=<your-url>
UPSTASH_SEARCH_REST_TOKEN=<your-token>
```

## Vercel Edge Config

**Purpose:** Ultra-low latency key-value store for feature flags and configuration

**Client Location:** `src/lib/storage/edge-config.ts`

### Usage

```typescript
import { 
  isFeatureEnabled, 
  getFeatureFlags, 
  isMaintenanceMode,
  getConfig,
  FEATURE_FLAGS,
  CONFIG_KEYS 
} from '@/lib/storage/edge-config';

// Check single feature flag
const newUiEnabled = await isFeatureEnabled(FEATURE_FLAGS.NEW_UI);

// Check multiple flags at once
const flags = await getFeatureFlags([
  FEATURE_FLAGS.NEW_UI,
  FEATURE_FLAGS.AI_SEARCH,
  FEATURE_FLAGS.REALTIME_CHAT,
]);

// Check maintenance mode
if (await isMaintenanceMode()) {
  return <MaintenancePage />;
}

// Get custom config value
const rateLimit = await getConfig<{ requests: number; windowSeconds: number }>(
  CONFIG_KEYS.RATE_LIMIT
);
```

### Available Feature Flags

```typescript
FEATURE_FLAGS.NEW_UI          // 'feature_new_ui'
FEATURE_FLAGS.DARK_MODE       // 'feature_dark_mode'
FEATURE_FLAGS.BETA_FEATURES   // 'feature_beta'
FEATURE_FLAGS.MAINTENANCE_MODE // 'maintenance_mode'
FEATURE_FLAGS.AI_SEARCH       // 'feature_ai_search'
FEATURE_FLAGS.REALTIME_CHAT   // 'feature_realtime_chat'
```

### Available Config Keys

```typescript
CONFIG_KEYS.RATE_LIMIT        // 'config_rate_limit'
CONFIG_KEYS.MAX_UPLOAD_SIZE   // 'config_max_upload_size'
CONFIG_KEYS.SUPPORTED_LOCALES // 'config_supported_locales'
CONFIG_KEYS.DEFAULT_LOCALE    // 'config_default_locale'
```

### Environment Variables

Automatically configured when linked to Vercel project.

## Setup

1. Link storage services via Vercel dashboard or CLI
2. Run `vercel env pull .env.development.local` to sync environment variables
3. Install required SDKs:

```bash
npm install @upstash/redis @upstash/vector @upstash/qstash @upstash/search @vercel/blob @vercel/edge-config
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│   Redis   │  │   Blob    │  │  Vector   │
│  (Cache)  │  │ (Files)   │  │ (Search)  │
└───────────┘  └───────────┘  └───────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                                │
│              (Primary Database + Auth)                       │
└─────────────────────────────────────────────────────────────┘
```
