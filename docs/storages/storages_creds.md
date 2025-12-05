# Storage Services

FoodShare uses several Vercel/Upstash storage services for different purposes.

## Upstash Redis

**Purpose:** Distributed caching, rate limiting, session storage, distributed locks

**Client Location:** `src/lib/storage/redis.ts`

### Usage

```typescript
import { cache, rateLimiter, lock, REDIS_KEYS, CACHE_TTL } from '@/lib/storage/redis';

// Cache operations
const data = await cache.get<Product>(REDIS_KEYS.PRODUCT('123'));
await cache.set(REDIS_KEYS.PRODUCT('123'), data, CACHE_TTL.MEDIUM);

// Cache-aside pattern
const products = await cache.getOrSet(
  REDIS_KEYS.PRODUCTS_LIST('food'),
  () => fetchProducts('food'),
  CACHE_TTL.SHORT
);

// Rate limiting
const { allowed, remaining, reset } = await rateLimiter.check('api:user123', 100, 60);

// Distributed locks
const result = await lock.withLock('my-task', async () => {
  return await performCriticalTask();
});
```

### Environment Variables

```bash
KV_REST_API_URL=<your-url>
KV_REST_API_TOKEN=<your-token>
REDIS_URL=<your-redis-url>
```

## Vercel Blob

**Purpose:** File storage for user uploads (images, documents)

### Usage

```typescript
import { put, del } from '@vercel/blob';

// Upload file
const { url } = await put('images/photo.jpg', file, { access: 'public' });

// Delete file
await del(url);
```

### Environment Variables

Automatically configured when linked to Vercel project.

## Upstash Vector

**Purpose:** Vector embeddings for semantic search

**Client Location:** `src/lib/storage/vector.ts`

### Usage

```typescript
import {
  upsertVector,
  querySimilar,
  querySimilarByType,
  deleteVectors,
  deleteVectorsByType,
  type VectorContentType,
} from '@/lib/storage/vector';

// Upsert a vector
await upsertVector('product-123', embedding, {
  id: 'product-123',
  type: 'product',
  title: 'Organic Apples',
});

// Query similar vectors
const results = await querySimilar(queryVector, {
  topK: 10,
  filter: 'type = "product"',
  minScore: 0.7,
});

// Delete vectors by type (queries and deletes in batches)
await deleteVectorsByType('product');
```

See `docs/storages/storages.md` for full API documentation.

### Environment Variables

```bash
UPSTASH_VECTOR_REST_URL=<your-url>
UPSTASH_VECTOR_REST_TOKEN=<your-token>
```

## Upstash QStash

**Purpose:** Background jobs, scheduled tasks, webhooks

### Usage

```typescript
import { Client } from '@upstash/qstash';

const client = new Client({
  baseUrl: process.env.QSTASH_URL,
  token: process.env.QSTASH_TOKEN,
});

// Publish job
const { messageId } = await client.publishJSON({
  url: 'https://your-app.com/api/process',
  body: { taskId: '123' },
});
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

### Usage

```typescript
import { Search } from '@upstash/search';

const client = Search.fromEnv();
const index = client.index('products');

const result = await index.search({ query: 'organic vegetables' });
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
  FEATURE_FLAGS 
} from '@/lib/storage/edge-config';

// Check single feature flag
const newUiEnabled = await isFeatureEnabled(FEATURE_FLAGS.NEW_UI);

// Check multiple flags at once
const flags = await getFeatureFlags([
  FEATURE_FLAGS.NEW_UI,
  FEATURE_FLAGS.AI_SEARCH,
]);

// Check maintenance mode
if (await isMaintenanceMode()) {
  return <MaintenancePage />;
}
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
└────────────────────────────────────────────

-

Quickstart

UPSTASH_VECTOR_REST_READONLY_TOKEN="ABkIMGFkYXB0ZWQtb2N0b3B1cy0xNTM3OS11czFyZWFkb25seU9EY3pZbVUyWldRdE5XUmxaUzAwTTJaaUxUaGlOV1F0T1dVNFptWXpOR1JrTURrNA=="

UPSTASH_VECTOR_REST_TOKEN="ABkFMGFkYXB0ZWQtb2N0b3B1cy0xNTM3OS11czFhZG1pblpXTTFOV1ZrWVRVdFlUZGlaUzAwWlRFd0xXSmtOVGd0WmpnNFkySmpNalZpTXpBMg=="

UPSTASH_VECTOR_REST_URL="https://adapted-octopus-15379-us1-vector.upstash.io"

ProjectsSettingsGetting StartedUsage

RESOURCES

Upstash Vector DocsSupport



Next.js

1

Connect to a project

Start by connecting to your existing project and then run vercel link in the CLI to link to the project locally. If you are starting a new project, you can use our template.

2

Pull your latest environment variables

Run vercel env pull .env.development.local to make the latest environment variables available to your project locally.

3

Install the Upstash Vector SDK

Run the following command to install the Upstash Vector SDK:

npm install @upstash/vector

You can find more details and documentation on the Upstash Vector SDK for TypeScript.

4

Import and Initialize the SDK

To start using the SDK in your project, import the client and use it in your API endpoint:

import { Index } from "@upstash/vector";

import { NextResponse } from "next/server";

const index = new Index({

  url: process.env.UPSTASH_VECTOR_REST_URL,

  token: process.env.UPSTASH_VECTOR_REST_TOKEN,

})

export const GET = async () => {

const result = await index.fetch([”vector-id”], { includeData: true })

return new NextResponse(

JSON.stringify({ result: result[0] }),

{ status: 200 }

)

}



foodshare-qstash

All Databases

Installation

Upstash QStash/Workflow

Status

Available

Created

Nov 27

Plan

Free

Current Period

-

Period Total

-

Quickstart

QSTASH_CURRENT_SIGNING_KEY="sig_7yB4TuZhdfzmLYQMCmaVtUeEuaY1"

QSTASH_NEXT_SIGNING_KEY="sig_4zJLaBodP9iF81Pjn4vqBnrauUS1"

QSTASH_TOKEN="eyJVc2VySUQiOiJmMGVhYjVlYi05ZThkLTQ5YjYtOTljOS0yZDFmZDI2OTY1YTIiLCJQYXNzd29yZCI6IjY5MDAzMTE5YTIwMzQ3YzQ5MTY5MzY5ZjU2ZDZhNWRlIn0="

QSTASH_URL="https://qstash.upstash.io"

ProjectsSettingsGetting StartedUsage

RESOURCES

QStash DocsSupport



Next.js

1

Connect to a project

Start by connecting to your existing project and then run vercel link in the CLI to link to the project locally. If you are starting fresh, you can use our Next.js template.

2

Pull your latest environment variables

Run vercel env pull .env.development.local to make the latest environment variables available to your project locally.

3

Install the Upstash QStash SDK

Run the following command to install the Upstash QStash SDK:

npm install @upstash/qstash

You can find more details and documentation on the Upstash QStash SDK for TypeScript.

4

Import and Initialize the SDK

To start using the SDK in your project, import the client and use it in your API endpoint:

import { Client } from '@upstash/qstash'

import { NextRequest, NextResponse } from 'next/server'

const client = new Client({

  baseUrl: process.env.QSTASH_URL!,

  token: process.env.QSTASH_TOKEN!,

})

export const POST = async (request: NextRequest) => {

const { messageId } = await client.publishJSON({

    url: `${baseUrl}/${route}`,

    body: payload,

})

return new NextResponse(JSON.stringify({ messageId }), { status: 200 })

}

5

Protect Your Endpoints

If there are endpoints which should only be called by QStash, you can secure them using the verification utility:

import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

import { NextRequest, NextResponse } from "next/server";

async function handler(_req: NextRequest) {

return new NextResponse.json(JSON.stringify({ result: "finished" }), { status: 200 });

}

// wrap the handler with the verifier

export const POST = verifySignatureAppRouter(handler);

6

Try Upstash Workflow

Workflow is a layer between the client and Upstash QStash. Here, the business logic can be seperated and run in steps via reliable workflow api. For further clarifications, please check out the docs: Workflow - Getting Started.



foodshare-search

All Databases

Installation

Upstash Search

Status

Available

Created

Nov 27

Plan

Free

Current Period

-

Period Total

-

Quickstart

UPSTASH_SEARCH_REST_READONLY_TOKEN="AB0IMGNsZWFuLWZsb3VuZGVyLTIxMzQ2LWdjcC11c2MxcmVhZG9ubHlZbUZrTURNMU56UXRORE5oTnkwMFlXRm1MV0l6TlRFdFlUSXhORE14WlRjNE5EUms="

UPSTASH_SEARCH_REST_TOKEN="AB0FMGNsZWFuLWZsb3VuZGVyLTIxMzQ2LWdjcC11c2MxYWRtaW5ZVEExWkdJMU5XTXRNbU15WlMwME5qSXlMVGt3T0RZdE0yRTFObU01TkRNd01qRXo="

UPSTASH_SEARCH_REST_URL="https://clean-flounder-21346-gcp-usc1-search.upstash.io"

ProjectsSettingsGetting StartedUsage

RESOURCES

Upstash Search DocsSupport



Nextjs



Nuxt.js



Sveltekit

1

Connect to a project

Start by connecting to your existing project and then run vercel link in the CLI to link to the project locally.

2

Pull your latest environment variables

Run vercel env pull to make the latest environment variables available to your project locally.

3

Install the Upstash Search SDK

Run the following command to install the Upstash Search SDK:

npm install @upstash/search

You can find more details and documentation on the Upstash Search SDK for TypeScript.

4

Import and Initialize the SDK

To start using the SDK in your project, import the client and use it in your API endpoint:

import { Search } from '@upstash/search';

import { NextResponse } from 'next/server';

// Initialize Search

const client = Search.fromEnv();

const index = client.index("movies")

export const POST = async () => {

// Make search request

const result = await index.search({ query: "hello world!" });

// Return the result in the response

return new NextResponse(JSON.stringify({ result }), { status: 200 });

};

foodshare-store
All Databases

Edge Config Store

Last Updated

Just now

Created

2/20/23

ID


ecfg_fudq465jyiuwgt8hc75eta7kyd6z

Digest


e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
Storage Size

2 B

/ 8 kB

Items
Projects
Backups
Tokens
Settings
RESOURCES

Documentation
@vercel/edge-config
Tokens
Link an Edge Config to a project by storing the Connection String in an environment variable.

Tokens

Label
Token
Used by
foodshare-token	

b03e1e87-f2a7-4134-a0ee-ef08d4ebe755

foodshare-store
All Databases

Edge Config Store

Last Updated

Just now

Created

2/20/23

ID


ecfg_fudq465jyiuwgt8hc75eta7kyd6z

Digest


e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
Storage Size

2 B

/ 8 kB

Items
Projects
Backups
Tokens
Settings
RESOURCES

Documentation
@vercel/edge-config

  foodshare-motherduck
All Databases

Installation

MotherDuck

Status

Available

Created

2m ago

Plan

Free Trial

Current Period

-

Period Total

-

Quickstart







MOTHERDUCK_READ_SCALING_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImZvb2RzaGFyZS1tb3RoZXJkdWNrS1NDdkBzYS5tb3RoZXJkdWNrLmNvbSIsIm1kUmVnaW9uIjoiYXdzLXVzLWVhc3QtMSIsInNlc3Npb24iOiJmb29kc2hhcmUtbW90aGVyZHVja0tTQ3Yuc2EubW90aGVyZHVjay5jb20iLCJwYXQiOiIwell0dkNsRVE0cWc4QjRtZUFfZDZqTnFtSkVrc21WbEZMV1dNNFJ6bl9nIiwidXNlcklkIjoiZmI4NWFmNzEtYzk1NC00M2QzLWJlMGUtMWU4ZDU4NWViMzc3IiwiaXNzIjoibWRfcGF0IiwicmVhZE9ubHkiOnRydWUsInRva2VuVHlwZSI6InJlYWRfc2NhbGluZyIsImlhdCI6MTc2NDkxMzExMX0.KH2uvDRnmMHu-cVqOdd2koRKoDaGPpJPSGMPosue16w"
MOTHERDUCK_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImZvb2RzaGFyZS1tb3RoZXJkdWNrS1NDdkBzYS5tb3RoZXJkdWNrLmNvbSIsIm1kUmVnaW9uIjoiYXdzLXVzLWVhc3QtMSIsInNlc3Npb24iOiJmb29kc2hhcmUtbW90aGVyZHVja0tTQ3Yuc2EubW90aGVyZHVjay5jb20iLCJwYXQiOiJGdmZiaTRjQVA2VzA5V2hWenJoa3ZwWXNzSUV5SzNXektaelZpRW9mX1Y0IiwidXNlcklkIjoiZmI4NWFmNzEtYzk1NC00M2QzLWJlMGUtMWU4ZDU4NWViMzc3IiwiaXNzIjoibWRfcGF0IiwicmVhZE9ubHkiOmZhbHNlLCJ0b2tlblR5cGUiOiJyZWFkX3dyaXRlIiwiaWF0IjoxNzY0OTEzMTExfQ.BpwtIvNq7NdAXphDRaVgXvER5O4LPi7Cqx-Fz65u_E4"
Projects
Settings
Getting Started
Usage
RESOURCES

Docs
Support

Framework logo
Next.js
1

Explore the MotherDuck UI and run queries

Click on Open in MotherDuck to navigate to the MotherDuck UI. A product tour will guide you through a few queries and features in the UI.

2

Create a Next.js app

Run npx create-next-app -e https://github.com/MotherDuck-Open-Source/nextjs-motherduck-wasm-analytics-quickstart-minimal to create a Next.js app pre-configured with the MotherDuck Wasm client.

3

Link project to vercel

Run vercel link to link the Next.js app to Vercel.

4

Connect database to project

Now that a Vercle project is created and linked, click Connect Project to link this MotherDuck installation to the project.

5

Pull your latest environment variables

Run vercel env pull .env.development.local to make the latest environment variables available to your project locally.

6

Create users and orders table and refresh Next.js app

Follow the README instructions and launch the Next.js app locally.

At first, it should display an error message because the tables being queried haven't been created.

Navigate back to the MotherDuck UI by clicking Open in MotherDuck and create two new tables with some data.


CREATE TABLE IF NOT EXISTS my_db.main.users (
    user_id BIGINT,
    username VARCHAR,
    email VARCHAR
);

INSERT INTO my_db.main.users (user_id, username, email) VALUES
(1, 'johndoe', 'john.doe@example.com'),
(2, 'janesmith', 'jane.smith@example.com'),
(3, 'bobwilson', 'bob.wilson@example.com');

CREATE TABLE IF NOT EXISTS my_db.main.orders (
    order_id BIGINT,
    user_id BIGINT,
    total_amount DOUBLE,
    order_date TIMESTAMP WITH TIME ZONE
);

INSERT INTO my_db.main.orders (order_id, user_id, total_amount, order_date) VALUES
(101, 1, 45.50, '2024-01-15'),
(102, 2, 78.25, '2024-02-20'),
(103, 1, 32.75, '2024-03-10'),
(104, 3, 95.00, '2024-04-05');

Now, navigate back to the Next.js app, click on the Refresh button and you should see a list of orders and the associated customers.