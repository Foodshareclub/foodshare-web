# MotherDuck / DuckDB Integration

> **Date:** January 2026
> **Status:** Partially Migrated (v3.1.0)
> **Contact:** Weyman Cohen (MotherDuck)

## Overview

MotherDuck was originally designed as the analytics layer for FoodShare, syncing data from Supabase to power dashboards, reports, and LLM-driven insights without impacting production app performance.

## Current Status

> **⚠️ Important:** MotherDuck/DuckDB native binaries don't work in Vercel's serverless environment. Core analytics queries (`getAnalyticsSummary`, `getMonthlyGrowth`, `getDailyActiveUsers`) now use **Supabase directly** instead of MotherDuck.

The sync infrastructure remains in place for:

- Browser-based WASM sync (admin UI)
- Edge Function sync for data warehousing
- Future analytics that require DuckDB's analytical capabilities

### Current Architecture

```text
Primary Analytics (Production):
Supabase (PostgreSQL)
    ↓ Server Actions query directly
Next.js Analytics Dashboard

Data Warehouse (Background Sync):
Supabase (PostgreSQL)
    ↓ Edge Function (sync-analytics)
    ↓ Incremental sync via updated_at
MotherDuck (DuckDB cloud)
    ↓ WASM client queries (admin only)
```

### Key Components

| Component            | Location                                              | Purpose                                       |
| -------------------- | ----------------------------------------------------- | --------------------------------------------- |
| Sync Edge Function   | `foodshare-backend/functions/sync-analytics/index.ts` | Syncs profiles/posts to MotherDuck            |
| Sync API Route       | `foodshare-web/src/app/api/admin/sync-analytics/`     | Next.js API route for sync (Node.js runtime)  |
| **WASM Sync Page**   | `foodshare-web/src/app/admin/analytics/sync/page.tsx` | Browser-based sync using MotherDuck WASM      |
| Python Sync Script   | `foodshare-backend/tools/sync-to-motherduck.py`       | CLI tool for manual/cron sync                 |
| MotherDuck Service   | `foodshare-web/src/lib/analytics/motherduck.ts`       | DuckDB connection (WASM only, not serverless) |
| Analytics Actions    | `foodshare-web/src/app/actions/analytics.ts`          | Server actions - **uses Supabase directly**   |
| AI Analytics Actions | `foodshare-web/src/app/actions/analytics-ai.ts`       | LLM-powered queries and insights              |
| Vault Integration    | `foodshare-web/src/lib/email/vault.ts`                | Secure token retrieval                        |

> **Note:** The `analytics.ts` server actions now query Supabase directly because DuckDB native binaries are incompatible with Vercel's serverless environment. The MotherDuck service is only used for browser-based WASM queries in the admin panel.

### MotherDuck Tables

```sql
-- Synced from Supabase profiles
full_users (
  id VARCHAR PRIMARY KEY,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  email VARCHAR,
  nickname VARCHAR,
  first_name VARCHAR,
  second_name VARCHAR,
  is_active BOOLEAN,
  is_verified BOOLEAN,
  last_seen_at TIMESTAMP,
  synced_at TIMESTAMP
)

-- Synced from Supabase posts
full_listings (
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  post_name VARCHAR,
  post_type VARCHAR,
  is_active BOOLEAN,
  is_arranged BOOLEAN,
  post_arranged_at TIMESTAMP,
  profile_id VARCHAR,
  post_views INTEGER,
  post_like_counter INTEGER,
  synced_at TIMESTAMP
)

-- Real-time event tracking
events (
  id VARCHAR PRIMARY KEY,
  event_name VARCHAR,
  user_id VARCHAR,
  properties VARCHAR,
  timestamp TIMESTAMP,
  synced_at TIMESTAMP
)

-- Sync metadata
sync_metadata (
  table_name VARCHAR PRIMARY KEY,
  last_sync_at TIMESTAMP,
  records_synced INTEGER,
  sync_mode VARCHAR
)
```

### Available Analytics Endpoints

| Function                       | Description                       |
| ------------------------------ | --------------------------------- |
| `getAnalyticsSummary()`        | Total users, listings, food saved |
| `getMonthlyGrowth()`           | User/listing growth by month      |
| `getDailyActiveUsers()`        | DAU for last 30 days              |
| `getEventDistribution()`       | Top 5 event types                 |
| `getConversionFunnel()`        | Listing → Request → Arranged      |
| `getUserRetentionCohorts()`    | Monthly cohort retention          |
| `getInventoryAging()`          | Active listings by age bucket     |
| `getListingTypeDistribution()` | Breakdown by post_type (Supabase) |
| `getTopSharers()`              | Users with most arranged listings |
| `getSyncStatus()`              | Last sync metadata                |
| `trackEvent()`                 | Track custom events               |

### AI-Powered Analytics (LLM Integration)

Located in `src/app/actions/analytics-ai.ts`, these server actions use MotherDuck's `prompt()` function for LLM-powered insights:

| Function                         | Description                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `askAnalyticsQuestion(question)` | Natural language to SQL - converts questions into queries and returns answers |
| `generateWeeklyReport()`         | LLM-generated weekly community report with metrics and highlights             |
| `getAIInsights()`                | AI-powered pattern analysis returning trends, anomalies, and recommendations  |

#### Natural Language Query Example

```typescript
import { askAnalyticsQuestion } from "@/app/actions/analytics-ai";

const result = await askAnalyticsQuestion("What food categories are most shared in London?");
// Returns: { question, generatedSQL, answer, data, executionTimeMs }
```

#### Weekly Report Structure

```typescript
interface WeeklyReport {
  period: string; // "12/27/2025 - 1/3/2026"
  summary: string; // LLM-generated narrative
  highlights: string[]; // 3 bullet points
  metrics: {
    newUsers: number;
    newListings: number;
    arrangedItems: number;
    topCategory: string;
  };
  generatedAt: string;
}
```

#### AI Insights Types

```typescript
interface AIInsight {
  type: "trend" | "anomaly" | "recommendation";
  title: string;
  description: string;
  confidence: number; // 0.0 to 1.0
  metric?: string;
  value?: number;
}
```

**Security Notes:**

- All AI queries require authentication
- Natural language queries are sanitized and limited to 500 chars
- Only SELECT queries are allowed (no mutations)
- Results are truncated to prevent token overflow

### Sync Modes

There are multiple ways to trigger analytics sync:

#### 1. Browser-Based WASM Sync (Admin UI)

The admin panel includes a browser-based sync page using MotherDuck's WASM client:

```text
URL: /admin/analytics/sync
```

**Features:**

- Runs entirely in the browser using `@motherduck/wasm-client`
- Fetches MotherDuck token from Supabase Vault via RPC
- Supports incremental sync (unsynced records) and full sync
- Test connectivity button to verify both PostgreSQL and MotherDuck connections
- Real-time progress status updates

**Requirements:**

- Cross-origin isolation headers (configured in `next.config.ts`):
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- MotherDuck token stored in Supabase Vault as `MOTHERDUCK_TOKEN`
- Supabase RPC function `get_vault_secret` for secure token retrieval

**Usage:**

1. Navigate to `/admin/analytics/sync`
2. Click "Test Connectivity" to verify connections
3. Click "Incremental Sync" for unsynced records only
4. Click "Full Sync" to resync all data

**Tables synced:**

- `analytics_daily_stats` → `daily_stats`
- `analytics_user_activity` → `user_activity_summary`
- `analytics_post_activity` → `post_activity_daily_stats`

#### 2. Supabase Edge Function

#### 2. Supabase Edge Function

```bash
# Incremental sync (default) - syncs records updated since last sync
POST /functions/v1/sync-analytics

# Full sync - deletes and replenishes all data
POST /functions/v1/sync-analytics?mode=full

# Cron-compatible GET endpoint
GET /functions/v1/sync-analytics
```

#### 3. Next.js API Route (Node.js Runtime)

The web app includes a dedicated API route that uses native DuckDB for better performance:

```bash
# Incremental sync (default)
POST /api/admin/sync-analytics
Authorization: Bearer <CRON_SECRET>

# Full sync
POST /api/admin/sync-analytics?mode=full
Authorization: Bearer <CRON_SECRET>

# GET also supported for cron compatibility
GET /api/admin/sync-analytics
```

**Response format:**

```typescript
interface SyncResult {
  success: boolean;
  mode: "full" | "incremental";
  stats: {
    dailyStats: number;
    userActivity: number;
    postActivity: number;
  };
  durationMs: number;
  error?: string;
}
```

**Environment variables required:**

- `MOTHERDUCK_TOKEN` - MotherDuck access token
- `CRON_SECRET` - Secret for authenticating cron requests

**Features:**

- Uses Node.js runtime (not Edge) for native DuckDB support
- 60-second max duration for large syncs
- Syncs from PostgreSQL staging tables (`analytics_daily_stats`, `analytics_user_activity`, `analytics_post_activity`)
- Marks records as synced after successful transfer

#### 4. Python CLI Script

For manual syncs or external cron jobs:

```bash
# Install dependencies
pip install duckdb psycopg2-binary python-dotenv

# Incremental sync
python foodshare-backend/tools/sync-to-motherduck.py

# Full sync
python foodshare-backend/tools/sync-to-motherduck.py --full

# Test connectivity only
python foodshare-backend/tools/sync-to-motherduck.py --test
```

**Environment variables:**

- `DATABASE_URL` or `SUPABASE_DB_URL` - PostgreSQL connection string
- `MOTHERDUCK_TOKEN` - MotherDuck access token

### Setup Instructions

1. **Add MotherDuck token to Supabase Vault:**

   ```sql
   SELECT vault.create_secret('MOTHERDUCK_TOKEN', 'your-token-here');
   ```

2. **Deploy the Edge Function:**

   ```bash
   cd foodshare-backend
   npx supabase functions deploy sync-analytics
   ```

3. **Run initial full sync:**

   ```bash
   curl -X POST "https://your-project.supabase.co/functions/v1/sync-analytics?mode=full"
   ```

4. **Set up hourly cron (via Supabase Dashboard or pg_cron):**
   ```sql
   SELECT cron.schedule(
     'sync-analytics-hourly',
     '0 * * * *',
     $$SELECT net.http_get('https://your-project.supabase.co/functions/v1/sync-analytics')$$
   );
   ```

## Current Data Profile

| Metric              | Estimate                                   |
| ------------------- | ------------------------------------------ |
| Transactional data  | 1-5GB (posts, profiles, messages, reviews) |
| Images              | Stored in Supabase Storage (separate)      |
| Ingestion frequency | Hourly batches (initial)                   |
| Growth rate         | TBD based on user adoption                 |

## Analytics Goals

- Food waste prevented (kg saved over time)
- Geographic heat maps of sharing activity
- User engagement/retention cohorts
- Listing-to-claim conversion rates
- Peak activity times by region
- LLM-powered weekly community reports
- Natural language queries ("What food categories are most shared in London?")

---

## Integration Architecture Options

### Option 1: Logical Replication → ETL Tool → MotherDuck (Recommended)

**Best for:** Near real-time analytics, production-grade setup

```
Supabase (PostgreSQL)
    ↓ Logical Replication (CDC)
Fivetran / Airbyte / Estuary
    ↓ Batch loads (hourly/daily)
MotherDuck (DuckDB cloud)
    ↓ SQL queries
Dashboards / LLM
```

**Supported ETL tools (per Supabase docs):**

| Tool         | Type              | Notes                                                                                                               |
| ------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Fivetran** | Managed           | Easiest setup, use `postgres` user + logical replication                                                            |
| **Airbyte**  | Self-hosted/Cloud | Good free tier, known WAL cleanup issue                                                                             |
| **Estuary**  | Managed           | Has specific [Supabase docs](https://docs.estuary.dev/reference/Connectors/capture-connectors/PostgreSQL/Supabase/) |

**Setup steps:**

1. Create publication in Supabase:

```sql
CREATE PUBLICATION foodshare_analytics
FOR TABLE posts, profiles, rooms, reviews, profile_stats;
```

2. Create replication slot:

```sql
SELECT pg_create_logical_replication_slot('motherduck_slot', 'pgoutput');
```

3. Connect ETL tool:
   - Use **direct connection** (not connection pooler)
   - Use `postgres` user
   - Select `logical replication` as sync method

4. Configure ETL destination to MotherDuck

**Pros:**

- Production-grade, battle-tested
- Handles schema changes, retries, monitoring
- Near real-time (minutes of lag)

**Cons:**

- Additional cost (ETL tool pricing)
- Another service to manage

---

### Option 2: Database Webhooks → Edge Function → MotherDuck

**Best for:** Event-driven, lightweight, specific tables only

```
Supabase Table Change (INSERT/UPDATE/DELETE)
    ↓ pg_net webhook (async, non-blocking)
Edge Function (Deno)
    ↓ Transform + batch buffer
MotherDuck REST API / S3 staging
```

**Implementation:**

```sql
-- Create webhook trigger
CREATE TRIGGER posts_to_analytics
AFTER INSERT OR UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://your-project.supabase.co/functions/v1/sync-analytics',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '5000'
);
```

```typescript
// Edge function: supabase/functions/sync-analytics/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const BATCH_SIZE = 100;
const buffer: any[] = [];

Deno.serve(async (req: Request) => {
  const payload = await req.json();

  buffer.push({
    type: payload.type,
    table: payload.table,
    record: payload.record,
    timestamp: new Date().toISOString(),
  });

  if (buffer.length >= BATCH_SIZE) {
    await flushToMotherDuck(buffer);
    buffer.length = 0;
  }

  return new Response(JSON.stringify({ queued: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function flushToMotherDuck(records: any[]) {
  // Option A: Write to S3, MotherDuck reads from S3
  // Option B: Use MotherDuck's REST API (if available)
  // Option C: Write to Parquet file in Supabase Storage
}
```

**Pros:**

- No external ETL tool
- Stays in Supabase ecosystem
- Pay only for Edge Function invocations

**Cons:**

- Custom code to maintain
- Need to handle batching, retries, failures
- Less mature than ETL tools

---

### Option 3: Scheduled Edge Function → Batch Sync

**Best for:** Simple batch analytics, hourly/daily syncs, lowest complexity

```
Cron Schedule (hourly)
    ↓
Edge Function
    ↓ Query Supabase for changes since last sync
    ↓ Write to MotherDuck
```

**Implementation:**

```typescript
// Edge function with pg_cron or external scheduler
Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get last sync timestamp from KV or table
  const lastSync = await getLastSyncTime();

  // Fetch changes since last sync
  const { data: posts } = await supabase.from("posts").select("*").gte("updated_at", lastSync);

  const { data: profiles } = await supabase
    .from("profiles_with_stats")
    .select("*")
    .gte("updated_at", lastSync);

  // Write to MotherDuck (via S3 or direct)
  await syncToMotherDuck({ posts, profiles });

  // Update last sync time
  await setLastSyncTime(new Date().toISOString());

  return new Response(
    JSON.stringify({
      synced: { posts: posts?.length, profiles: profiles?.length },
    })
  );
});
```

**Pros:**

- Simplest to implement
- Full control over sync logic
- No CDC complexity

**Cons:**

- Not real-time (hourly/daily lag)
- Need to track `updated_at` properly
- Deletes harder to capture

---

### Option 4: Supabase Analytics Buckets → Iceberg → DuckDB

**Best for:** Future-proof, native Supabase solution

Supabase recently launched **Analytics Buckets** (private alpha) with built-in replication to Iceberg tables. DuckDB has native Iceberg support.

```
Supabase
    ↓ Built-in ETL (Supabase ETL)
Analytics Bucket (Iceberg format)
    ↓
DuckDB / MotherDuck (native Iceberg reader)
```

**Status:** Private alpha - worth monitoring

**Setup (when available):**

1. Create Analytics Bucket in Supabase Dashboard
2. Create publication for tables
3. Create replication pipeline to bucket
4. Query with DuckDB:

```sql
SELECT * FROM iceberg_scan('s3://your-bucket/warehouse/posts');
```

---

## MotherDuck-Specific Considerations

### Data Loading Options

| Method               | Use Case                        |
| -------------------- | ------------------------------- |
| S3/GCS import        | Batch loads from object storage |
| PostgreSQL connector | Direct query (not CDC)          |
| Parquet files        | Efficient columnar format       |
| CSV upload           | Simple, small datasets          |

### Querying from Edge Functions

```typescript
// Potential approach - query MotherDuck from Deno
const response = await fetch("https://api.motherduck.com/v1/sql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${MOTHERDUCK_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    sql: `
      SELECT post_type, COUNT(*) as count, SUM(quantity_kg) as kg_saved
      FROM posts 
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY post_type
    `,
  }),
});
```

---

## Recommended Approach

### Phase 1: Proof of Concept (Now)

- Use **Option 3** (Scheduled Edge Function)
- Hourly batch sync of key tables
- Write to S3/Supabase Storage as Parquet
- Query with local DuckDB or MotherDuck trial

### Phase 2: Production (If POC successful)

- Evaluate **Fivetran** vs **Estuary** for managed CDC
- Set up proper monitoring and alerting
- Build dashboards on MotherDuck

### Phase 3: LLM Integration

- Create aggregation views in MotherDuck
- Edge function queries MotherDuck for insights
- Feed structured data to LLM for natural language reports

---

## Questions for MotherDuck (Weyman)

1. What's the typical Supabase → MotherDuck setup? Fivetran/Airbyte, or lighter-weight?
2. Any direct Supabase integration planned (like BigQuery/S3 connectors)?
3. Can I query MotherDuck directly from Deno Edge Functions?
4. Pricing model for ~5GB data, hourly ingestion, moderate query volume?
5. Any customers doing similar food-tech / community platform analytics?

---

## Resources

- [Supabase Replication Docs](https://supabase.com/docs/guides/database/replication)
- [Supabase Database Webhooks](https://supabase.com/docs/guides/database/webhooks)
- [Supabase Manual Replication Setup](https://supabase.com/docs/guides/database/replication/manual-replication-setup)
- [Estuary + Supabase](https://docs.estuary.dev/reference/Connectors/capture-connectors/PostgreSQL/Supabase/)
- [MotherDuck Docs](https://motherduck.com/docs)
- [DuckDB Iceberg Extension](https://duckdb.org/docs/extensions/iceberg)

---

## Partnership Notes (Weyman Cohen - MotherDuck)

> LinkedIn conversation, December 2025

**Dec 12, 2025** - Weyman Cohen (MotherDuck)

> Glad to connect! Curious what sparked your interest in Motherduck initially?

**Dec 14, 2025** - Tarlan Isaev

> I'm exploring MotherDuck for streaming Supabase data (CDC/webhooks) into DuckDB for fast analytics and dashboards.

**Dec 15, 2025** - Weyman Cohen

> Curious what kind of dataset you're working with/what kinds of analytical questions you're trying to uncover with data? Also interested to hear what other tools you're considering to potentially sit alongside Motherduck (BI tools, data sources, ingestion tools, etc)?

**Dec 29, 2025** - Tarlan Isaev

> I'm building Foodshare—cross-platform iOS/Android/Web apps that help neighbors share surplus food. Here's my latest launch on Product Hunt: https://www.producthunt.com/products/foodshare/launches/foodshare-3

**Dec 30, 2025** - Tarlan Isaev

> For the web app, I built a custom CRM and an email load-balancer that rotates across three different email providers for scheduled newsletters — boosts deliverability and reliability. Next, I'm expanding backend analytics on the collected data and planning to spin up a lightweight LLM on my VPS to feed the data into and pull insights from it.

**Jan 1, 2026** - Weyman Cohen

> I've seen this type of use case work really well - MotherDuck becomes your analytics layer next to Supabase, so you can stream changes from your app data to power dashboards and reports without slowing down your live app, and it makes feeding clean, structured data into your LLM much simpler since everything's already queryable in one place.
>
> Curious - what data volume you have (500MBs, 30GBs, 5TB, etc?)
> And how often would you need to ingest the data? (hourly, daily, weekly, real-time)

**Key Takeaways:**

- MotherDuck positioned as analytics layer alongside Supabase (not replacement)
- Stream app changes → power dashboards without impacting live app performance
- Simplifies LLM integration by keeping data queryable in one place
- Follow-up needed: data volume estimate and ingestion frequency requirements

---

## Changelog

| Date       | Update                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| 2026-01-04 | Migrated `getListingTypeDistribution()` to Supabase direct query          |
| 2026-01-04 | Migrated core analytics to Supabase direct queries (Vercel compatibility) |
| 2026-01-03 | Added browser-based WASM sync page (`/admin/analytics/sync`)              |
| 2026-01-03 | Added Next.js API route for sync (`/api/admin/sync-analytics`)            |
| 2026-01-03 | v3.0.0 - Production implementation with incremental sync                  |
| 2026-01-03 | Added partnership notes from Weyman Cohen conversation                    |
| 2026-01-02 | Initial research document                                                 |
