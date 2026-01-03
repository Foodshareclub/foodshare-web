# MotherDuck / DuckDB Integration

> **Date:** January 2026
> **Status:** Implemented (v3.0.0)
> **Contact:** Weyman Cohen (MotherDuck)

## Overview

MotherDuck serves as the analytics layer for FoodShare, syncing data from Supabase to power dashboards, reports, and LLM-driven insights without impacting production app performance.

## Current Implementation

We implemented **Option 3: Scheduled Edge Function → Batch Sync** with incremental sync support.

### Architecture

```text
Supabase (PostgreSQL)
    ↓ Edge Function (sync-analytics)
    ↓ Incremental sync via updated_at
MotherDuck (DuckDB cloud)
    ↓ Server Actions query
Next.js Analytics Dashboard
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Sync Edge Function | `foodshare-backend/functions/sync-analytics/index.ts` | Syncs profiles/posts to MotherDuck |
| MotherDuck Service | `foodshare-web/src/lib/analytics/motherduck.ts` | DuckDB connection via duckdb-async |
| Analytics Actions | `foodshare-web/src/app/actions/analytics.ts` | Server actions for dashboard queries |
| Vault Integration | `foodshare-web/src/lib/email/vault.ts` | Secure token retrieval |

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

| Function | Description |
|----------|-------------|
| `getAnalyticsSummary()` | Total users, listings, food saved |
| `getMonthlyGrowth()` | User/listing growth by month |
| `getDailyActiveUsers()` | DAU for last 30 days |
| `getEventDistribution()` | Top 5 event types |
| `getConversionFunnel()` | Listing → Request → Arranged |
| `getUserRetentionCohorts()` | Monthly cohort retention |
| `getInventoryAging()` | Active listings by age bucket |
| `getListingTypeDistribution()` | Breakdown by post_type |
| `getTopSharers()` | Users with most arranged listings |
| `getSyncStatus()` | Last sync metadata |
| `trackEvent()` | Track custom events |

### Sync Modes

```bash
# Incremental sync (default) - syncs records updated since last sync
POST /functions/v1/sync-analytics

# Full sync - deletes and replenishes all data
POST /functions/v1/sync-analytics?mode=full

# Cron-compatible GET endpoint
GET /functions/v1/sync-analytics
```

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

| Metric | Estimate |
|--------|----------|
| Transactional data | 1-5GB (posts, profiles, messages, reviews) |
| Images | Stored in Supabase Storage (separate) |
| Ingestion frequency | Hourly batches (initial) |
| Growth rate | TBD based on user adoption |

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

| Tool | Type | Notes |
|------|------|-------|
| **Fivetran** | Managed | Easiest setup, use `postgres` user + logical replication |
| **Airbyte** | Self-hosted/Cloud | Good free tier, known WAL cleanup issue |
| **Estuary** | Managed | Has specific [Supabase docs](https://docs.estuary.dev/reference/Connectors/capture-connectors/PostgreSQL/Supabase/) |

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
    timestamp: new Date().toISOString()
  });
  
  if (buffer.length >= BATCH_SIZE) {
    await flushToMotherDuck(buffer);
    buffer.length = 0;
  }
  
  return new Response(JSON.stringify({ queued: true }), {
    headers: { 'Content-Type': 'application/json' }
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
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Get last sync timestamp from KV or table
  const lastSync = await getLastSyncTime();
  
  // Fetch changes since last sync
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .gte('updated_at', lastSync);
  
  const { data: profiles } = await supabase
    .from('profiles_with_stats')
    .select('*')
    .gte('updated_at', lastSync);
  
  // Write to MotherDuck (via S3 or direct)
  await syncToMotherDuck({ posts, profiles });
  
  // Update last sync time
  await setLastSyncTime(new Date().toISOString());
  
  return new Response(JSON.stringify({ 
    synced: { posts: posts?.length, profiles: profiles?.length }
  }));
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

| Method | Use Case |
|--------|----------|
| S3/GCS import | Batch loads from object storage |
| PostgreSQL connector | Direct query (not CDC) |
| Parquet files | Efficient columnar format |
| CSV upload | Simple, small datasets |

### Querying from Edge Functions

```typescript
// Potential approach - query MotherDuck from Deno
const response = await fetch('https://api.motherduck.com/v1/sql', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${MOTHERDUCK_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sql: `
      SELECT post_type, COUNT(*) as count, SUM(quantity_kg) as kg_saved
      FROM posts 
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY post_type
    `
  })
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

## Changelog

| Date | Update |
|------|--------|
| 2026-01-03 | v3.0.0 - Production implementation with incremental sync |
| 2026-01-02 | Initial research document |
