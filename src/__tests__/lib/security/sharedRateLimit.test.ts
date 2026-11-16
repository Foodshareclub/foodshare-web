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
 *    match the original in-action algorithm check for check.
 */
import { describe, expect, it } from "bun:test";
import {
  AI_DRAFT_LIMIT,
  FIXED_WINDOW_SCRIPT,
  MemoryRateLimitStore,
  POST_ACTIVITY_LIMIT,
  SharedRateLimiter,
  UpstashRateLimitStore,
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
// Failure policy: closed, not open
// ============================================================================

describe("failure policy", () => {
  it("refuses with 'unavailable' when no store is configured", async () => {
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

  it("refuses with 'unavailable' when the store does not answer", async () => {
    const limiter = new SharedRateLimiter({
      max: 5,
      windowMs: 60_000,
      prefix: "p",
      store: new BrokenStore(),
    });
    const verdict = await limiter.check("x");
    expect(verdict.success).toBe(false);
    expect(verdict.reason).toBe("unavailable");
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
