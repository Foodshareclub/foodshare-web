# Email Workers & QStash Setup

This document explains how to set up distributed email workers using Upstash QStash for the FoodShare email system.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Email System Architecture                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Next.js API Routes (Client-facing)                         │
│  └─> /api/admin/email/* ──────┐                            │
│                                 │                             │
│  Supabase Edge Function         ├──> Upstash Redis          │
│  └─> /functions/v1/email ──────┤    (Caching & Locks)      │
│                                 │                             │
│  QStash Workers (Background)    │                            │
│  ├─> Queue Processor ──────────┤                            │
│  │    (Every 2 min)            │                            │
│  ├─> Health Monitor ───────────┤                            │
│  │    (Every 5 min)            │                            │
│  └─> Quota Sync ───────────────┘                            │
│       (Every hour)                                           │
│                                                               │
│  Database: Supabase Postgres                                │
│  └─> email_queue, email_logs, email_provider_quota          │
└─────────────────────────────────────────────────────────────┘
```

## Benefits

### 1. **Distributed Processing**
- Multiple workers can process queue simultaneously
- Redis-based distributed locks prevent duplicate processing
- Fault-tolerant with automatic retries

### 2. **Scheduled Tasks**
- Queue processor runs every 2 minutes
- Health monitoring every 5 minutes
- Quota sync every hour
- No polling needed - push-based execution

### 3. **Redis Caching**
- Health data cached for 5 minutes
- Reduces Edge Function calls
- Fast API responses
- Real-time metrics storage

### 4. **Better Performance**
- Async processing doesn't block user requests
- Concurrent email sending (10 at a time)
- Batch processing (100 emails per run)
- Smart rate limiting

## QStash Cron Jobs Setup

### Using QStash Dashboard

1. Go to [Upstash Console](https://console.upstash.com/qstash)
2. Click "Schedules" → "Create Schedule"
3. Create these schedules:

#### Queue Processor
```
Name: email-queue-processor
URL: https://foodshare.club/api/email/worker/queue-processor
Schedule: */2 * * * * (every 2 minutes)
Method: POST
Headers:
  - Content-Type: application/json
```

#### Health Monitor
```
Name: email-health-monitor
URL: https://foodshare.club/api/email/worker/health-monitor
Schedule: */5 * * * * (every 5 minutes)
Method: POST
```

### Using QStash CLI

```bash
# Install QStash CLI
npm install -g @upstash/qstash-cli

# Create schedules
qstash schedule create \
  --destination "https://foodshare.club/api/email/worker/queue-processor" \
  --cron "*/2 * * * *" \
  --name "email-queue-processor"

qstash schedule create \
  --destination "https://foodshare.club/api/email/worker/health-monitor" \
  --cron "*/5 * * * *" \
  --name "email-health-monitor"
```

### Using Vercel Integration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/email/worker/queue-processor",
      "schedule": "*/2 * * * *"
    },
    {
      "path": "/api/email/worker/health-monitor",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Environment Variables Required

```bash
# Upstash QStash
QSTASH_CURRENT_SIGNING_KEY=sig_xxx
QSTASH_NEXT_SIGNING_KEY=sig_xxx
QSTASH_TOKEN=xxx

# Upstash Redis
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

## Worker Endpoints

### 1. Queue Processor
**Endpoint:** `POST /api/email/worker/queue-processor`

**Features:**
- Processes up to 100 queued emails per run
- Distributed locking (prevents duplicate processing)
- Concurrent sending (10 emails at once)
- Automatic retry on failure
- Updates Redis stats

**Redis Keys Used:**
- `email:queue:lock` - Distributed lock (5 min TTL)
- `email:stats:daily` - Daily statistics (processed, successful, failed)

### 2. Health Monitor
**Endpoint:** `POST /api/email/worker/health-monitor`

**Features:**
- Calls Edge Function health check
- Caches results in Redis (5 min)
- Tracks critical alerts
- Time-series metrics for dashboards

**Redis Keys Used:**
- `email:health:latest` - Latest health data (5 min TTL)
- `email:alerts:critical` - Critical alerts (last 100)
- `email:metrics:timeseries` - Time-series metrics (24h)

## Monitoring

### Check Worker Status

```bash
# View Redis health cache
redis-cli GET email:health:latest

# View alerts
redis-cli LRANGE email:alerts:critical 0 10

# View metrics
redis-cli ZRANGE email:metrics:timeseries -10 -1
```

### Manual Testing

```bash
# Test queue processor (dev only)
curl http://localhost:3000/api/email/worker/queue-processor

# Test health monitor (dev only)
curl http://localhost:3000/api/email/worker/health-monitor

# Production (requires QStash signature)
curl -X POST https://foodshare.club/api/email/worker/queue-processor \
  -H "Upstash-Signature: xxx"
```

### Logs

Workers log to Vercel/Console:
```
[email-worker] Processing 50 emails...
[health-monitor] Critical alerts: 1
```

## Performance Metrics

Expected performance:
- **Queue Processing**: 100 emails in ~30-60 seconds
- **Health Check**: Complete in ~2-5 seconds
- **Concurrency**: 10 simultaneous email sends
- **Throughput**: ~3,000 emails/hour (with 2min schedule)

## Scaling

To increase throughput:

1. **Increase batch size** (up to 500)
   ```typescript
   const BATCH_SIZE = 500;
   ```

2. **Increase concurrency** (up to 20)
   ```typescript
   const CONCURRENCY = 20;
   ```

3. **Reduce schedule interval** (every 1 minute)
   ```
   */1 * * * *
   ```

4. **Add more workers** (different regions)
   - Deploy workers to edge locations
   - Use geo-based routing

## Troubleshooting

### Worker not running
1. Check QStash dashboard for errors
2. Verify Upstash-Signature is being sent
3. Check Vercel logs
4. Ensure environment variables are set

### Duplicate processing
- Redis lock should prevent this
- Check lock TTL (default 5 min)
- Verify Redis connection

### High failure rate
1. Check Edge Function health
2. Review provider quotas
3. Check email queue for invalid data
4. Monitor error logs

## Cost Estimates

**Upstash QStash:**
- Free tier: 500 schedules, 10K messages/month
- Pro: $10/mo for 1M messages

**Upstash Redis:**
- Free tier: 10K commands/day
- Pay-as-you-go: $0.20 per 100K commands

**Expected Monthly Costs:**
- QStash: Free tier sufficient for most use cases
- Redis: ~$5-10/month for caching and metrics
