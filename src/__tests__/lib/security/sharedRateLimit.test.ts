/**
 * Shared rate limiting for server actions (see
 * `src/lib/security/sharedRateLimit.ts`).
 *
 * The estate ran a second web instance in November 2026, which made the
 * in-memory per-process counters in `post-activity.ts` and `ai-draft.ts`
 * worth N × their configured limit. The counters now live in the store
 * (Upstash Redis in production), and the tests below prove the two things
 * the fix has to deliver:
 *
 * 1. two simulated instances sharing one store share one budget — the
 *    101st post-activity request and the 11th AI draft are refused no
 *    matter which instance handles them;
 * 2. single-instance behavior is unchanged — the memory store's verdicts
 *    match the original in-action algorithm check for check;
 * 3. while the shared store does not answer, the limit still applies —
 *    counted against a per-instance fallback — instead of failing open to
 *    unlimited (the damage of the 2026-11-15 quota incident).
 */
import { describe, expect, it } from "bun:test";
import {
  AI_DRAFT_LIMIT,
  CircuitBreaker,
  FIXED_WINDOW_SCRIPT,
  MemoryRateLimitStore,
  POST_ACTIVITY_LIMIT,
  SharedRateLimiter,
  UpstashRateLimitStore,
  type RateLimitCountResult,
  type RateLimitStore,
} from "@/lib/security/sharedRateLimit";

// ============================================================================
// Fakes
// ============================================================================

/**
 * In-memory emulation of the single Upstash script this module runs (see
 * FIXED_WINDOW_SCRIPT): INCR the key, anchor the window on the first count,
 * report the remaining TTL. It implements the same `eval(script, keys,
 * args)` surface the real @upstash/redis client exposes, so the production
 * UpstashRateLimitStore runs unmodified against it.
 */
class FakeUpstash {
  private readonly keys = new Map<string, { count: number; expiresAt: number }>();

  constructor(private readonly now: () => number) {}

  async eval(script: string, keys: string[], args: unknown[]): Promise<[number, number]> {
    if (script !== FIXED_WINDOW_SCRIPT) {
      throw new Error(`unexpected script: ${script}`);
    }
    const key = keys[0];
    const windowMs = Number(args[0]);
    const now = this.now();

    let entry = this.keys.get(key);
    if (entry && entry.expiresAt <= now) {
      this.keys.delete(key);
      entry = undefined;
    }
    const count = (entry?.count ?? 0) + 1;
    const expiresAt = entry ? entry.expiresAt : now + windowMs;
    this.keys.set(key, { count, expiresAt });
    return [count, expiresAt - now];
  }
}

/** A store that does not answer — Upstash down, network error, etc. */
class BrokenStore implements RateLimitStore {
  async increment(): Promise<null> {
    return null;
  }
}

/**
 * A delegating store with a fail switch and a call counter: Upstash that
 * refuses service for a while and then recovers, without paying anything
 * while it refuses (the breaker's job).
 */
class FlakyStore implements RateLimitStore {
  fail = false;
  calls = 0;

  constructor(private readonly inner: RateLimitStore) {}

  async increment(key: string, windowMs: number): Promise<RateLimitCountResult | null> {
    this.calls++;
    if (this.fail) return null;
    return this.inner.increment(key, windowMs);
  }
}

/**
 * A verbatim copy of the in-memory check `post-activity.ts` used before
 * this change (clock injected so a scripted sequence can be replayed), so
 * the new limiter's verdicts can be compared against it check for check.
 * `max` is 5 instead of 100: the algorithm is scale-free, and the smaller
 * value keeps the sequence short.
 */
function makeLegacyCheck(max = 5, windowMs = 60_000) {
  const map = new Map<string, { count: number; resetAt: number }>();
  return (id: string, now: number): boolean => {
    const entry = map.get(id);
    if (!entry || now > entry.resetAt) {
      map.set(id, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= max) {
      return false;
    }
    entry.count++;
    return true;
  };
}

// ============================================================================
// The limit values are unchanged
// ============================================================================

describe("limit configuration", () => {
  it("keeps the post-activity limit: 100 requests per minute", () => {
    expect(POST_ACTIVITY_LIMIT.max).toBe(100);
    expect(POST_ACTIVITY_LIMIT.windowMs).toBe(60_000);
  });

  it("keeps the AI draft limit: 10 drafts per hour", () => {
    expect(AI_DRAFT_LIMIT.max).toBe(10);
    expect(AI_DRAFT_LIMIT.windowMs).toBe(60 * 60_000);
  });

  it("namespaces its keys so they cannot collide with the proxy's limiters", () => {
    // proxy.ts owns the "ratelimit:global|auth|mutations" prefixes.
    expect(POST_ACTIVITY_LIMIT.prefix).toBe("ratelimit:post-activity");
    expect(AI_DRAFT_LIMIT.prefix).toBe("ratelimit:ai-draft");
  });
});

// ============================================================================
// Two instances, one store, one budget
// ============================================================================

describe("two instances sharing one store", () => {
  it("shares one budget for post activity (100/min per IP, real values)", async () => {
    let t = 0;
    const clock = () => t;
    // Two web instances: separate limiter and store objects (what two
    // processes would each construct), one shared store (what one Upstash
    // is).
    const upstash = new FakeUpstash(clock);
    const instanceA = new SharedRateLimiter({
      ...POST_ACTIVITY_LIMIT,
      store: new UpstashRateLimitStore(upstash),
    });
    const instanceB = new SharedRateLimiter({
      ...POST_ACTIVITY_LIMIT,
      store: new UpstashRateLimitStore(upstash),
    });

    // 100 requests, alternating across the instances: every one allowed.
    for (let i = 1; i <= POST_ACTIVITY_LIMIT.max; i++) {
      const verdict = await (i % 2 ? instanceA : instanceB).check("203.0.113.7");
      expect(verdict.success, `request ${i} should be allowed`).toBe(true);
      expect(verdict.reason).toBe("ok");
    }

    // The 101st is refused — no matter which instance handles it.
    const nextA = await instanceA.check("203.0.113.7");
    expect(nextA.success).toBe(false);
    expect(nextA.reason).toBe("limited");
    const nextB = await instanceB.check("203.0.113.7");
    expect(nextB.success).toBe(false);
    expect(nextB.reason).toBe("limited");

    // And the refusal is one shared refusal, not two independent ones:
    // the budget is still exhausted on the other instance, and the
    // budget does not "top up" on the instance that did not see the load.
    expect((await instanceA.check("203.0.113.7")).success).toBe(false);

    // A different client is unaffected.
    expect((await instanceB.check("198.51.100.9")).success).toBe(true);
  });

  it("shares one budget for AI drafts (10/hour per user, real values)", async () => {
    let t = 0;
    const clock = () => t;
    const upstash = new FakeUpstash(clock);
    const instanceA = new SharedRateLimiter({
      ...AI_DRAFT_LIMIT,
      store: new UpstashRateLimitStore(upstash),
    });
    const instanceB = new SharedRateLimiter({
      ...AI_DRAFT_LIMIT,
      store: new UpstashRateLimitStore(upstash),
    });

    for (let i = 1; i <= AI_DRAFT_LIMIT.max; i++) {
      const verdict = await (i % 2 ? instanceA : instanceB).check("user-123");
      expect(verdict.success, `draft ${i} should be allowed`).toBe(true);
    }

    expect((await instanceA.check("user-123")).success).toBe(false);
    expect((await instanceB.check("user-123")).success).toBe(false);
    expect((await instanceB.check("user-456")).success).toBe(true);
  });

  it("expires the window on the shared store: both instances recover together", async () => {
    let t = 0;
    const clock = () => t;
    const upstash = new FakeUpstash(clock);
    const opts = { max: 2, windowMs: 1000, prefix: "ratelimit:test" };
    const instanceA = new SharedRateLimiter({
      ...opts,
      store: new UpstashRateLimitStore(upstash),
    });
    const instanceB = new SharedRateLimiter({
      ...opts,
      store: new UpstashRateLimitStore(upstash),
    });

    // One window, two shared requests: A gets one, B gets one, the third
    // is refused no matter which instance asks.
    expect((await instanceA.check("x")).success).toBe(true);
    expect((await instanceB.check("x")).success).toBe(true);
    expect((await instanceA.check("x")).success).toBe(false);
    expect((await instanceB.check("x")).success).toBe(false);

    t = 1001; // window expired
    expect((await instanceA.check("x")).success).toBe(true);
    expect((await instanceB.check("x")).success).toBe(true);
    expect((await instanceA.check("x")).success).toBe(false); // shared again
  });
});

// ============================================================================
// Single-instance behavior is unchanged
// ============================================================================

describe("memory store (development/CI fallback)", () => {
  it("matches the original in-action algorithm check for check", async () => {
    // Scripted sequence: a burst, a mid-window pause, the expiry boundary,
    // then another burst. Every verdict must agree with the legacy
    // implementation's verdict at the same instant.
    const times = [0, 1, 2, 3, 4, 5, 6, 30_000, 30_001, 59_999, 60_000, 60_001, 60_002, 61_000, 120_001];

    const max = 5;
    const windowMs = 60_000;
    const legacy = makeLegacyCheck(max, windowMs);
    let t = 0;
    const store = new MemoryRateLimitStore(() => t);
    const limiter = new SharedRateLimiter({
      max,
      windowMs,
      prefix: "ratelimit:test",
      store,
    });

    for (const now of times) {
      t = now;
      const expected = legacy("client-1", now);
      const verdict = await limiter.check("client-1");
      expect(verdict.success, `t=${now}: expected ${expected}`).toBe(expected);
    }
  });

  it("is per-process by construction: two memory stores do not share", async () => {
    // This documents the old weakness, now confined to development and CI
    // by the module's wiring: production always uses the shared store or
    // fails closed.
    const a = new SharedRateLimiter({
      max: 1,
      windowMs: 60_000,
      prefix: "p",
      store: new MemoryRateLimitStore(),
    });
    const b = new SharedRateLimiter({
      max: 1,
      windowMs: 60_000,
      prefix: "p",
      store: new MemoryRateLimitStore(),
    });

    expect((await a.check("x")).success).toBe(true);
    // Instance B has its own counter and does not see A's request.
    expect((await b.check("x")).success).toBe(true);
  });

  it("isolates budgets per identifier", async () => {
    const store = new MemoryRateLimitStore();
    const limiter = new SharedRateLimiter({
      max: 1,
      windowMs: 60_000,
      prefix: "p",
      store,
    });

    expect((await limiter.check("a")).success).toBe(true);
    expect((await limiter.check("a")).success).toBe(false);
    expect((await limiter.check("b")).success).toBe(true);
  });
});

// ============================================================================
// Failure policy: misconfiguration closed, runtime errors fall back to the
// per-instance store (the two directions the proxy settled in 450d733a,
// with the runtime-error path strengthened for these low-frequency
// endpoints — see the module docs)
// ============================================================================

describe("failure policy", () => {
  it("refuses with 'unavailable' when no store is configured (misconfiguration stays closed)", async () => {
    // Production without Upstash: the actions answer SERVICE_UNAVAILABLE
    // rather than running unlimited (same policy as the proxy's 503).
    const limiter = new SharedRateLimiter({
      max: 5,
      windowMs: 60_000,
      prefix: "p",
      store: null,
    });
    const verdict = await limiter.check("x");
    expect(verdict.success).toBe(false);
    expect(verdict.reason).toBe("unavailable");
  });

  it("counts degraded passes against the per-instance fallback (runtime errors no longer skip the limit)", async () => {
    // A rate limit is a control, not the app: when the wired-up store
    // refuses service (the 2026-11-15 quota incident), the request is
    // still served — but the limit still applies, counted against this
    // instance's per-instance fallback instead of being skipped.
    const limiter = new SharedRateLimiter({
      max: 5,
      windowMs: 60_000,
      prefix: "p",
      store: new BrokenStore(),
    });
    for (let i = 1; i <= 5; i++) {
      const verdict = await limiter.check("x");
      expect(verdict.success).toBe(true); // within the fallback budget: served
      expect(verdict.reason).toBe("degraded");
      expect(verdict.degraded).toBe("redis-error");
    }
    const over = await limiter.check("x"); // fallback budget exhausted
    expect(over.success).toBe(false);
    expect(over.reason).toBe("limited");
    expect(over.degraded).toBe("redis-error");
  });

  it("a degraded pass consumes fallback budget, not shared budget", async () => {
    let t = 0;
    const store = new FlakyStore(new MemoryRateLimitStore(() => t));
    const limiter = new SharedRateLimiter({
      max: 2,
      windowMs: 60_000,
      prefix: "p",
      store,
    });

    expect((await limiter.check("x")).reason).toBe("ok"); // shared counted: 1
    store.fail = true;
    expect((await limiter.check("x")).reason).toBe("degraded"); // fallback counted: 1
    store.fail = false;
    expect((await limiter.check("x")).reason).toBe("ok"); // shared counted: 2
    expect((await limiter.check("x")).reason).toBe("limited"); // shared counted: 3
    // The one degraded pass did not touch the shared budget (the shared
    // store is already exhausted at 3/2), but it did consume the
    // fallback's budget of 2: one more degraded pass is served, the next
    // is limited — by the fallback, with the marker to show it.
    store.fail = true;
    expect((await limiter.check("x")).reason).toBe("degraded"); // fallback counted: 2
    const over = await limiter.check("x"); // fallback counted: 3
    expect(over.success).toBe(false);
    expect(over.reason).toBe("limited");
    expect(over.degraded).toBe("redis-error");
  });

  it("the breaker stops paying Upstash after five errors, re-tries half-open, closes on success", async () => {
    let t = 0;
    const store = new FlakyStore(new MemoryRateLimitStore(() => t));
    store.fail = true;
    const breaker = new CircuitBreaker(5, 60_000, 30_000, () => t);
    const limiter = new SharedRateLimiter({
      max: 5,
      windowMs: 60_000,
      prefix: "p",
      store,
      breaker,
    });

    // Five errors, all served against the per-instance fallback budget,
    // none counted on the shared store.
    for (let i = 0; i < 5; i++) {
      const verdict = await limiter.check("x");
      expect(verdict.success).toBe(true);
      expect(verdict.degraded).toBe("redis-error");
    }

    // The fifth failure opened the circuit: the next check must not pay
    // Upstash at all. The fallback budget (5) is exhausted by now, so the
    // pass is served the normal rate-limit response — limited, not open.
    const calls = store.calls;
    const open = await limiter.check("x");
    expect(open.success).toBe(false);
    expect(open.reason).toBe("limited");
    expect(open.degraded).toBe("circuit-open");
    expect(store.calls).toBe(calls);

    // A minute later the circuit is half-open: exactly one re-trial.
    t = 60_001;
    const retry = await limiter.check("x");
    expect(retry.degraded).toBe("redis-error");
    expect(store.calls).toBe(calls + 1);

    // The re-trial failed, so the circuit re-opens; a minute later the
    // half-open request finds Upstash recovered and closes the circuit.
    t = 120_002;
    store.fail = false;
    const ok = await limiter.check("x");
    expect(ok.success).toBe(true);
    expect(ok.reason).toBe("ok");
    expect(breaker.isOpen()).toBe(false);
    expect((await limiter.check("x")).reason).toBe("ok"); // counting for real again
  });
});

// ============================================================================
// Degraded mode still rate-limits (red test from t_c22f82b8, t_9483b145)
// ============================================================================

/**
 * An Upstash outage must not turn the production limiters into "no limit".
 * The red test (t_c22f82b8) proved the gap: every check while the store
 * errors (or while the breaker is open) answered success, so the AI-draft
 * limiter (10/hour/user) had no limit at all on a single instance —
 * strictly worse than the in-memory Map it replaced. The fix routes the
 * two degraded branches through the per-instance fallback
 * (MemoryRateLimitStore), so the budget still applies per instance; the
 * accepted N× residual across instances is recorded in the module docs.
 */
describe("degraded mode on one instance (N=1)", () => {
  it("the AI draft limiter still enforces 10/hour/user while Upstash errors", async () => {
    let t = 0;
    const limiter = new SharedRateLimiter({
      ...AI_DRAFT_LIMIT,
      store: new BrokenStore(),
      // The production composition: the shared breaker opens after five
      // errors, so passes 6+ go through the circuit-open branch.
      breaker: new CircuitBreaker(5, 60_000, 30_000, () => t),
    });

    for (let i = 1; i <= AI_DRAFT_LIMIT.max; i++) {
      t = i * 1_000;
      const verdict = await limiter.check("user-1");
      expect(verdict.success).toBe(true); // (a) within budget: served
    }
    t = (AI_DRAFT_LIMIT.max + 1) * 1_000;
    const over = await limiter.check("user-1");
    expect(over.success).toBe(false); // (b) budget + 1: limited, not served
    expect(over.reason).toBe("limited");
  });
});

// ============================================================================
// Bounded retention for the memory store (F-1, t_ff490d55): the degraded
// fallback Map is capped — expired sweep + evict-oldest on cap pressure —
// so a large unique-IP cohort during an Upstash outage cannot grow it
// without bound
// ============================================================================

describe("memory store bounded retention (cap + sweep + evict-oldest)", () => {
  it("evicts the oldest entry, not an arbitrary one, when a new key hits the cap", async () => {
    let t = 0;
    const store = new MemoryRateLimitStore(() => t, 3); // cap 3
    const limiter = new SharedRateLimiter({
      max: 1,
      windowMs: 60_000,
      prefix: "p",
      store,
    });

    // Fill the store to the cap: three identifiers, one counted request each.
    for (const id of ["a", "b", "c"]) {
      expect((await limiter.check(id)).success).toBe(true);
    }
    expect(store.size).toBe(3);

    // A fourth identifier hits the cap. Nothing has expired, so exactly the
    // oldest-inserted entry ("a") is evicted to make room; the store stays
    // bounded at the cap.
    expect((await limiter.check("d")).success).toBe(true);
    expect(store.size).toBe(3);

    // The retained identifiers still enforce their budget — proving the
    // eviction was the oldest, not any of these:
    expect((await limiter.check("b")).success).toBe(false);
    expect((await limiter.check("b")).reason).toBe("limited");
    expect((await limiter.check("c")).success).toBe(false);
    expect((await limiter.check("d")).success).toBe(false);

    // The evicted identifier was uncounted from the eviction on: its next
    // request re-anchors a fresh window and is served.
    expect((await limiter.check("a")).success).toBe(true);
  });

  it("sweeps expired entries on cap pressure — a full window elapse reclaims them", async () => {
    let t = 0;
    const store = new MemoryRateLimitStore(() => t, 3);
    const limiter = new SharedRateLimiter({
      max: 1,
      windowMs: 1000,
      prefix: "p",
      store,
    });

    // Window 1: three identifiers fill the cap.
    for (const id of ["a", "b", "c"]) {
      expect((await limiter.check(id)).success).toBe(true);
    }
    expect(store.size).toBe(3);

    // A full window elapses: every entry is now expired.
    t = 1001;

    // A new identifier hits the cap: the sweep reclaims all three expired
    // entries before the insert — the store drops to the one live entry
    // instead of rotating a single one out.
    expect((await limiter.check("d")).success).toBe(true);
    expect(store.size).toBe(1);

    // "b" is proof the sweep, not a single evict-oldest, ran: it is the
    // middle-aged entry, and it starts fresh rather than staying limited.
    expect((await limiter.check("b")).success).toBe(true);
    expect(store.size).toBe(2);
  });

  it("keeps the store bounded across repeated windows (no growth, stable or rotating set)", async () => {
    let t = 0;
    const store = new MemoryRateLimitStore(() => t, 3);
    const limiter = new SharedRateLimiter({
      max: 1,
      windowMs: 1000,
      prefix: "p",
      store,
    });

    // A stable identifier set across three full windows: the entries are
    // re-anchored in place, the store never accumulates them.
    for (let w = 0; w < 3; w++) {
      for (const id of ["a", "b", "c"]) {
        expect((await limiter.check(id)).success, `window ${w}: ${id} should start fresh`).toBe(true);
      }
      expect(store.size).toBe(3);
      t += 1001;
    }

    // The outage shape the finding measured — a fresh cohort of identifiers
    // per window — holds at the cap instead of accumulating one cohort per
    // window (the reviewer's probe saw 200k entries ≈ 22 MiB after two
    // cohorts).
    for (let w = 0; w < 3; w++) {
      for (const id of [`w${w}x`, `w${w}y`, `w${w}z`]) {
        await limiter.check(id);
      }
      expect(store.size, `after window ${w}`).toBe(3);
    }
  });
});

// ============================================================================
// Verdict shape
// ============================================================================

describe("verdict shape", () => {
  it("reports remaining budget while the window is open", async () => {
    let t = 0;
    const store = new MemoryRateLimitStore(() => t);
    const limiter = new SharedRateLimiter({
      max: 3,
      windowMs: 1000,
      prefix: "p",
      store,
    });

    expect((await limiter.check("x")).remaining).toBe(2);
    expect((await limiter.check("x")).remaining).toBe(1);
    expect((await limiter.check("x")).remaining).toBe(0);
  });

  it("reports how long the window stays closed when limited", async () => {
    let t = 0;
    const upstash = new FakeUpstash(() => t);
    const limiter = new SharedRateLimiter({
      max: 1,
      windowMs: 60_000,
      prefix: "p",
      store: new UpstashRateLimitStore(upstash),
    });

    expect((await limiter.check("x")).success).toBe(true);
    t = 30_000;
    const limited = await limiter.check("x");
    expect(limited.success).toBe(false);
    expect(limited.retryAfterMs).toBe(30_000);
  });
});
