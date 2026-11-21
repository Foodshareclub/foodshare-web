# Upstash on the free tier

Operator decision, 2026-11-21 (board cards t_58ea319d and t_6538730f, option A): the production
Redis database `foodshare-production-rate-limit` stays on the Upstash free tier (500,000
requests a month), analytics stay off, and the web app keeps working without Upstash until
the monthly reset. On 2026-11-21 the database had used 495,546 of its 500,000 requests.

## How the web app behaves

All Redis access goes through `src/lib/upstash/access.ts`. It holds one client (1.5 s request
timeout, one network retry) and one circuit breaker for the whole process.

| Breaker state | When                                                                                      | Effect                                                     |
| ------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| closed        | normal                                                                                    | commands go to Upstash                                     |
| open          | first quota (`max requests limit exceeded`), auth or timeout error; or 5 other errors in a row | Upstash is skipped for 10 minutes                     |
| half-open     | the 10 minutes have passed                                                                | one probe goes through: success closes, failure re-opens |

The breaker logs one line when it opens and one when it closes. After the monthly reset the
next probe succeeds and the breaker closes on its own.

| Consumer                                        | Breaker closed                         | Breaker open                                 |
| ----------------------------------------------- | -------------------------------------- | -------------------------------------------- |
| Proxy global limiter (100 / 10 s per IP)        | in memory                              | in memory                                    |
| Proxy auth (10 / min) and mutation (30 / min)   | Upstash `Ratelimit`                    | same limits in memory                        |
| Server-action limiters (`rateLimit.ts`, `sharedRateLimit.ts`) | Upstash                  | same limits in memory                        |
| Caches (`lib/redis.ts`, `lib/storage/redis.ts`, `lib/email/redis-cache.ts`) | Upstash, keys under `fs:web:`, every write has a TTL | reads miss, writes skipped, data comes from the source |
| `/api/health` Redis line                        | one PING, reused for 5 minutes         | `degraded`, no command                       |
| `/api/ready`                                    | never touches Upstash                  | never touches Upstash                        |

Every `Ratelimit` uses `analytics: false` and an ephemeral cache. Static assets, `_next/*`,
images, favicon/robots/sitemap, `/api/health`, `/api/ready` and prefetch requests (GET/HEAD
only) are not rate limited. A production deploy with no Upstash credentials still answers
503: that is a misconfiguration, not a quota outage.

Upstash Search and Vector (`src/lib/storage/search.ts`, `vector.ts`) are separate Upstash
products with their own quotas and are not configured in the production deploy.

## Probes

The quadlet health checks (`foodshare-web.container`, `.github/quadlet/`, `systemd/`) already
probe `/api/ready`. The external monitor (`scripts/external-monitor.sh`, every 5 minutes) still
checks `https://foodshare.club/`. Its source of truth is the `foodshare-backend` copy, and web
CI requires both copies to be identical, so the switch to `/api/ready` has to land in the
backend first and then be copied here. The deploy script's `/api/health` checks run only
during a deploy and reuse the cached Redis PING.

## Daily budget guard

`.github/workflows/upstash-budget.yml` runs `scripts/upstash-budget-guard.ts` every day at
05:40 UTC. It reads `GET https://api.upstash.com/v2/redis/stats/{id}` and posts a workflow
warning when `total_monthly_requests` is above 70% of 500,000. It never fails the run.

The operator must add two repository secrets (Settings, Secrets and variables, Actions):

- `UPSTASH_EMAIL`: the Upstash account email.
- `UPSTASH_API_KEY`: an Upstash Developer API key (Upstash console, Account, Management API).

Without them the job logs a notice and skips. The script looks the database up by name; set
`UPSTASH_REDIS_DATABASE_ID` to skip the lookup. The app's own secrets
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are unchanged.
