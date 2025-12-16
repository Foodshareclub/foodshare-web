# Geocoding System Deployment Guide

This guide walks through deploying and testing the new queue-based geocoding system for FoodShare.

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Access to Supabase Dashboard
- Service role key for testing

## Deployment Steps

### Step 1: Deploy Database Migration

The migration creates the queue table, triggers, functions, and backfills existing posts.

```bash
# Option A: Via Supabase CLI (recommended)
cd /Users/organic/dev/work/foodshare/foodshare
supabase db push

# Option B: Via Supabase Dashboard
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Copy contents of supabase/migrations/20251215_comprehensive_geocoding_system.sql
# 3. Execute the SQL
```

**Expected output:**
- `location_update_queue` table created
- Queue management functions created
- Trigger `trigger_queue_location_update` created on `posts` table
- Existing posts without coordinates queued
- pg_cron job created (if extension enabled)

### Step 2: Deploy Edge Function

Deploy the updated `update-post-coordinates` function.

```bash
# Deploy Edge Function
supabase functions deploy update-post-coordinates

# Verify deployment
supabase functions list
```

### Step 3: Enable pg_cron Extension (Optional but Recommended)

For automatic batch processing every 5 minutes:

```bash
# Via Supabase Dashboard
# 1. Go to Database → Extensions
# 2. Search for "pg_cron"
# 3. Enable the extension
# 4. Re-run the migration to create the cron job
```

**Note:** If pg_cron is not available, you'll need to schedule the Edge Function externally (e.g., via GitHub Actions, cron job, or Vercel Cron).

### Step 4: Verify Deployment

```sql
-- Check queue table exists
SELECT COUNT(*) FROM location_update_queue;

-- Check trigger exists
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'posts'::regclass
AND tgname = 'trigger_queue_location_update';

-- Check functions exist
SELECT proname FROM pg_proc
WHERE proname IN (
  'get_pending_geocode_queue',
  'mark_geocode_processing',
  'mark_geocode_completed',
  'mark_geocode_failed',
  'cleanup_old_geocode_queue',
  'queue_location_update'
);

-- Check pg_cron job (if enabled)
SELECT * FROM cron.job WHERE jobname = 'geocode-posts-batch';
```

## Testing

### Test 1: Create New Post (Automatic Queueing)

Test that new posts are automatically queued for geocoding.

```sql
-- 1. Create a test post with an address
INSERT INTO posts (
  post_name,
  post_type,
  post_description,
  post_address,
  profile_id,
  is_active
) VALUES (
  'Test Geocoding Post',
  'food',
  'Testing the geocoding system',
  '1600 Amphitheatre Parkway, Mountain View, CA 94043',
  '<your-user-id>', -- Replace with actual user ID
  true
) RETURNING id;

-- 2. Verify it was queued
SELECT * FROM location_update_queue
WHERE post_id = <post-id-from-above>
ORDER BY created_at DESC;

-- Expected: One row with status = 'pending'

-- 3. Verify location is NULL
SELECT id, post_name, post_address, location
FROM posts
WHERE id = <post-id>;

-- Expected: location IS NULL
```

### Test 2: Manual Edge Function Invocation

Test the Edge Function by manually processing the queue.

```bash
# Set your service role key
export SERVICE_ROLE_KEY="your-service-role-key-here"
export SUPABASE_URL="https://***REMOVED***.supabase.co"

# Process batch
curl -X POST "$SUPABASE_URL/functions/v1/update-post-coordinates" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "BATCH_UPDATE", "batch_size": 10}'
```

**Expected response:**
```json
{
  "message": "Processed 1 items: 1 successful, 0 failed",
  "processed": 1,
  "successful": 1,
  "failed": 0,
  "results": [
    {
      "queue_id": 1,
      "post_id": 123,
      "success": true,
      "coordinates": {
        "latitude": 37.4220656,
        "longitude": -122.0840897
      }
    }
  ]
}
```

### Test 3: Verify Geocoding Result

```sql
-- Check queue status
SELECT id, post_id, status, retry_count, completed_at, error_message
FROM location_update_queue
WHERE post_id = <post-id>
ORDER BY created_at DESC;

-- Expected: status = 'completed', completed_at IS NOT NULL

-- Check post location updated
SELECT
  id,
  post_name,
  post_address,
  ST_AsText(location::geometry) as location_wkt,
  ST_Y(location::geometry) as latitude,
  ST_X(location::geometry) as longitude
FROM posts
WHERE id = <post-id>;

-- Expected: location is not NULL, coordinates match Google's address
```

### Test 4: Update Address (Re-queueing)

Test that changing an address triggers re-geocoding.

```sql
-- 1. Update address
UPDATE posts
SET post_address = 'One Apple Park Way, Cupertino, CA 95014'
WHERE id = <post-id>
RETURNING id, post_address, location;

-- Expected: location should be NULL (cleared by trigger)

-- 2. Check queue
SELECT * FROM location_update_queue
WHERE post_id = <post-id>
ORDER BY created_at DESC;

-- Expected: New row with status = 'pending', old row status = 'completed' with error_message = 'Superseded by address change'

-- 3. Process queue again
-- (Run curl command from Test 2)

-- 4. Verify new coordinates
SELECT
  ST_Y(location::geometry) as latitude,
  ST_X(location::geometry) as longitude
FROM posts
WHERE id = <post-id>;

-- Expected: Different coordinates (Apple Park location)
```

### Test 5: Failed Geocoding (Retry Logic)

Test retry logic with an invalid address.

```sql
-- 1. Create post with invalid address
INSERT INTO posts (
  post_name,
  post_type,
  post_description,
  post_address,
  profile_id,
  is_active
) VALUES (
  'Invalid Address Test',
  'food',
  'Testing retry logic',
  'ThisIsNotARealAddressXYZ12345',
  '<your-user-id>',
  true
) RETURNING id;

-- 2. Process queue (will fail)
-- (Run curl command from Test 2 multiple times)

-- 3. Check retry count
SELECT
  id,
  post_id,
  status,
  retry_count,
  max_retries,
  error_message
FROM location_update_queue
WHERE post_id = <post-id>;

-- Expected after 3 attempts:
-- status = 'failed'
-- retry_count = 3
-- error_message = 'No coordinates found for address'
```

### Test 6: Get Queue Statistics

```bash
curl -X POST "$SUPABASE_URL/functions/v1/update-post-coordinates" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "STATS"}'
```

**Expected response:**
```json
{
  "message": "Queue statistics",
  "stats": {
    "pending": 0,
    "processing": 0,
    "failed_retryable": 0,
    "failed_permanent": 1,
    "completed_today": 2
  }
}
```

### Test 7: Cleanup Old Entries

```bash
curl -X POST "$SUPABASE_URL/functions/v1/update-post-coordinates" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "CLEANUP", "days_old": 1}'
```

## Monitoring Setup

### Create Dashboard Query

Save this in Supabase Dashboard → SQL Editor for ongoing monitoring:

```sql
-- Geocoding Queue Health Dashboard
WITH queue_stats AS (
  SELECT
    status,
    COUNT(*) as count,
    AVG(retry_count) as avg_retries,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
  FROM location_update_queue
  GROUP BY status
),
hourly_completion AS (
  SELECT
    DATE_TRUNC('hour', completed_at) as hour,
    COUNT(*) as completed
  FROM location_update_queue
  WHERE completed_at >= NOW() - INTERVAL '24 hours'
  GROUP BY hour
  ORDER BY hour DESC
  LIMIT 24
)
SELECT
  'Queue Status' as metric,
  jsonb_object_agg(status, count) as data
FROM queue_stats
UNION ALL
SELECT
  'Hourly Completion (Last 24h)',
  jsonb_object_agg(hour, completed)
FROM hourly_completion;
```

### Alert Conditions

Set up alerts (via Supabase or external monitoring) for:

1. **Queue backlog**: `SELECT COUNT(*) FROM location_update_queue WHERE status = 'pending' > 100`
2. **Stuck processing**: `SELECT COUNT(*) FROM location_update_queue WHERE status = 'processing' AND last_attempt_at < NOW() - INTERVAL '1 hour' > 0`
3. **High failure rate**: `SELECT COUNT(*) FROM location_update_queue WHERE status = 'failed' AND retry_count >= max_retries AND created_at >= NOW() - INTERVAL '1 day' > 10`

## Troubleshooting

### Queue Not Processing

**Symptom:** Posts remain in `pending` status indefinitely.

**Solutions:**

1. Check pg_cron is enabled and job exists:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'geocode-posts-batch';
   ```

2. If pg_cron not available, set up external scheduler (see below)

3. Manually trigger processing:
   ```bash
   curl -X POST "$SUPABASE_URL/functions/v1/update-post-coordinates" \
     -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
     -d '{"operation": "BATCH_UPDATE"}'
   ```

### High Failure Rate

**Symptom:** Many items in `failed` status.

**Solutions:**

1. Check error messages:
   ```sql
   SELECT error_message, COUNT(*)
   FROM location_update_queue
   WHERE status = 'failed'
   GROUP BY error_message;
   ```

2. If "No coordinates found" - addresses may be too vague. Consider:
   - Adding country suffix in geocoding logic
   - Improving address validation on frontend
   - Using more specific addresses

3. If "Geocoding service unavailable" - Nominatim may be down:
   - Wait for retry logic to handle it
   - Consider implementing backup geocoding service

### Stuck Items

**Symptom:** Items in `processing` status for > 1 hour.

**Solution:**

```sql
-- Reset stuck items to pending
UPDATE location_update_queue
SET status = 'pending'
WHERE status = 'processing'
  AND last_attempt_at < NOW() - INTERVAL '1 hour';
```

## External Scheduler Setup (If pg_cron Not Available)

If pg_cron extension is not available, set up external scheduling:

### Option A: GitHub Actions

Create `.github/workflows/geocode-posts.yml`:

```yaml
name: Geocode Posts Batch
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  geocode:
    runs-on: ubuntu-latest
    steps:
      - name: Invoke Edge Function
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/update-post-coordinates" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"operation": "BATCH_UPDATE"}'
```

### Option B: Vercel Cron (Next.js Route Handler)

Create `src/app/api/cron/geocode/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-post-coordinates`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operation: 'BATCH_UPDATE' }),
    }
  );

  const data = await response.json();
  return NextResponse.json(data);
}
```

Then configure in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/geocode",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Rollback Plan

If issues occur, rollback by:

```sql
-- 1. Disable trigger
DROP TRIGGER IF EXISTS trigger_queue_location_update ON posts;

-- 2. Stop pg_cron job (if exists)
SELECT cron.unschedule('geocode-posts-batch');

-- 3. Optionally drop queue table
DROP TABLE IF EXISTS location_update_queue CASCADE;

-- 4. Revert to old Edge Function (restore from git)
git checkout HEAD~1 supabase/functions/update-post-coordinates/index.ts
supabase functions deploy update-post-coordinates
```

## Performance Benchmarks

Expected performance (with Nominatim rate limit of 1 req/sec):

- **Processing rate**: ~60 posts per minute (with 1s delay between requests)
- **Batch size 10**: ~10-15 seconds per batch
- **1000 posts backfill**: ~16-17 minutes
- **Queue overhead**: <10ms per queue operation

## Next Steps

After successful deployment:

1. Monitor queue for first 24 hours
2. Adjust batch size and frequency based on load
3. Set up alerts for queue health
4. Schedule weekly cleanup job
5. Review permanently failed items monthly

## Support

For issues:
1. Check Supabase Dashboard → Functions → update-post-coordinates → Logs
2. Query queue: `SELECT * FROM location_update_queue ORDER BY created_at DESC LIMIT 20;`
3. Review Edge Function README: `/supabase/functions/update-post-coordinates/README.md`
