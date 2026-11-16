# Multi-instance rate limiting for server actions

**Status:** shipped 2026-11-16 · **Kanban:** `t_c74b6630` · **Code:** `src/lib/security/sharedRateLimit.ts` · **Tests:** `src/__tests__/lib/security/sharedRateLimit.test.ts`

## The finding

The estate API's action-level rate limits lived in in-memory `Map`s, one per
process, inside the server actions themselves:

| Action                                                      | File                               | Limit                 | Key                                     |
| ----------------------------------------------------------- | ---------------------------------- | --------------------- | --------------------------------------- |
| Post activity logging (`logPostView`, `logPostActivity`, …) | `src/app/actions/post-activity.ts` | 100 requests / minute | client IP (`x-forwarded-for` first hop) |
| AI listing drafts (`generateListingDraft`)                  | `src/app/actions/ai-draft.ts`      | 10 drafts / hour      | Supabase user id                        |

At single-instance scale the control worked as designed. The estate ran a
**second web instance** in November 2026 (both VPS hosts now run the same
`foodshare-web` image, each with its own cloudflared tunnel), which changed
the math: each instance kept its own counter, so the effective limit became
**N × the configured limit**, and a client rotating across instances degraded
the control toward bypass. The proxy's own limiters (`src/proxy.ts`) already
used Upstash and were never affected — this was the gap the security lane
filed on 2026-11-16.

## The fix: shared-store, not edge

Two directions were on the table when the card was filed: a shared-store
limiter in the app, or Cloudflare edge rate-limiting rules. The shared store
wins here, for three reasons:

1. **The AI-draft limit is per user, not per IP.** Edge rules key on IP or
   custom headers; the app holds the Supabase session, the edge does not.
   Expressing "10 drafts per user per hour" at the edge would mean shipping
   the user id in a header to the edge, which is a new trust surface, not a
   simplification.
2. **The estate already has the idiom.** `src/proxy.ts` runs
   `@upstash/ratelimit` against the same Upstash REST credentials, and
   `src/lib/redis.ts` already holds the shared client. Reusing the store
   means no new dependency, no new credential, no new trust boundary.
3. **The acceptance test is expressible in the repo.** "Two simulated
   instances share one limit" is a unit test against the store interface. An
   edge rule can only be proven against the live proxy.

Cloudflare edge limiting remains a valid _additional_ layer (it would catch
traffic before it spends an Upstash call), but it does not replace the
per-user limit, and the card's acceptance criteria are met without it.

## What the implementation does

`src/lib/security/sharedRateLimit.ts` provides a `SharedRateLimiter` with a
pluggable `RateLimitStore`:

- **`UpstashRateLimitStore`** — the production store. Each check is one
  `EVAL` of a three-line Lua script (`INCR`, `PEXPIRE` on the first count,
  `PTTL`), so the increment and the window anchor are atomic on the Redis
  server: concurrent first requests from different instances cannot race the
  window. Keys are namespaced `ratelimit:post-activity:*` and
  `ratelimit:ai-draft:*`, which cannot collide with the proxy's
  `ratelimit:global|auth|mutations` prefixes.
- **`MemoryRateLimitStore`** — the development/CI fallback, with exactly the
  semantics the original in-action `Map`s had (fixed window anchored at the
  first request, strict `now > resetAt` expiry). It is per-process by
  construction and is only used when Upstash is not configured **and** the
  deploy is not production.

### What is unchanged

- **Limit values:** 100/minute per client IP (post activity), 10/hour per
  user (AI drafts). A test pins both.
- **Window algorithm:** fixed window, first request anchors it — identical to
  the original `Map` implementation. A test replays a scripted sequence
  through both the new memory store and a verbatim copy of the old function
  and requires the verdicts to agree check for check.
- **Key derivation:** same client-IP / user-id identity as before.
- **Check order in the actions:** rate limit still runs before dedup and
  auth, so a rate-limited request is still not deduped and does not reach
  the AI provider.

### What is new

- **Failure policy: closed, not open.** A production deploy without
  `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` logs FATAL at module
  init and the affected actions answer `SERVICE_UNAVAILABLE` — the same
  policy the proxy applies (503) for the same reason: the failure mode of a
  missing limiter is "unlimited traffic", and falling back to a per-instance
  `Map` would quietly recreate the N × limit this fix removes. A store that
  is configured but does not answer (Upstash down, network error) is refused
  the same way. The proxy's limiters share this dependency and failure
  domain, so an availability argument for failing open does not apply to the
  action layer: the request would not have reached the action anyway.
- **One Upstash call per check.** See quota below.

## Upstash quota cost

Each check costs exactly **one** REST call (a single `EVAL`), and only on
the two limited endpoints:

- post activity is low-frequency user actions (views, likes, logs), already
  behind the proxy's global limiter (100/10 s per IP) and mutation limiter
  (30/minute) — both of which hit Upstash on **every** proxied request;
- AI drafts are LLM calls: at most 10 per user per hour by definition.

The added volume is negligible against the caching traffic (leaderboards,
dedup, sessions) that dominates the free-plan quota pressure tracked by the
quota card. If the free plan ever binds, the levers are the cache TTLs, not
these two limiters.

## Tests

`bun test src/__tests__/lib/security/sharedRateLimit.test.ts` — 13 tests:

- **two instances, one store, one budget** (the acceptance test): two
  limiter/store object pairs sharing one fake Upstash, driven with the real
  limit values — the 101st post-activity request and the 11th AI draft are
  refused no matter which instance handles them;
- window expiry on the shared store: both instances recover, and the budget
  is still one;
- memory store matches the original algorithm check for check (behavior
  unchanged);
- fail-closed verdicts for missing store and unresponsive store;
- verdict shape (`remaining`, `retryAfterMs`).

The fake implements the same `eval(script, keys, args)` surface the real
`@upstash/redis` client exposes, so the production store code path runs
unmodified in the test.

## Operational notes

- No new environment variables; the existing `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN` production secrets are the only input.
- The limiter keys accumulate no user data beyond the identifier already
  used (IP / user id) and expire with the window.
- The dead `src/lib/security/rateLimit.ts` tier helper (no callers, silent
  no-op when Redis is absent) was left untouched by this change; it is a
  candidate for deletion on a separate card.
