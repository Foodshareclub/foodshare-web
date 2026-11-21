import { describe, expect, it } from "bun:test";
import { Glob } from "bun";
import {
  HybridRateLimiter,
  MemorySlidingWindowLimiter,
  type UpstashLimiterLike,
  shouldSkipRateLimit,
  upstashRatelimitOptions,
} from "@/lib/security/localRateLimit";
import { UpstashBreaker } from "@/lib/upstash/access";

/**
 * The in-memory limiter the proxy's global limiter runs on, and the hybrid
 * the auth and mutation limiters use: Upstash while the breaker is closed,
 * the same limits in memory while it is open (task 23.1).
 */

const QUOTA = new Error("ERR max requests limit exceeded. Limit: 500000, Usage: 500001");

describe("MemorySlidingWindowLimiter", () => {
  it("allows exactly the limit within a window", () => {
    const t = 1_000_000;
    const limiter = new MemorySlidingWindowLimiter({ limit: 100, windowMs: 10_000, now: () => t });
    for (let i = 0; i < 100; i++) expect(limiter.check("ip").success).toBe(true);
    const blocked = limiter.check("ip");
    expect(blocked.success).toBe(false);
    expect(blocked.reset).toBeGreaterThan(t);
    // Another identifier has its own budget.
    expect(limiter.check("other-ip").success).toBe(true);
  });

  it("slides: the previous window still counts for the part that overlaps", () => {
    let t = 0;
    const limiter = new MemorySlidingWindowLimiter({ limit: 10, windowMs: 1000, now: () => t });
    for (let i = 0; i < 10; i++) limiter.check("k");
    // 10% into the next window, 90% of the previous 10 still count.
    t = 1100;
    expect(limiter.check("k").success).toBe(true); // 9 + 0 < 10
    expect(limiter.check("k").success).toBe(false); // 9 + 1 >= 10
    // Two windows later the old count is gone.
    t = 3000;
    expect(limiter.check("k").success).toBe(true);
  });

  it("is bounded: least recently used identifiers are evicted", () => {
    const limiter = new MemorySlidingWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 3, now: () => 0 });
    limiter.check("a");
    limiter.check("b");
    limiter.check("c");
    limiter.check("a"); // touch a, so b is the least recently used
    limiter.check("d");
    expect(limiter.size).toBe(3);
    // a kept its count (blocked); b was evicted and starts fresh.
    expect(limiter.check("a").success).toBe(false);
    expect(limiter.check("b").success).toBe(true);
  });
});

function upstashFake(behaviour: () => Promise<Awaited<ReturnType<UpstashLimiterLike["limit"]>>>) {
  const fake = { calls: 0, limit: async () => (fake.calls++, behaviour()) };
  return fake;
}

describe("HybridRateLimiter", () => {
  it("uses Upstash while the breaker is closed", async () => {
    const upstash = upstashFake(async () => ({ success: false, limit: 10, remaining: 0, reset: 42 }));
    const limiter = new HybridRateLimiter({
      upstash,
      memory: new MemorySlidingWindowLimiter({ limit: 10, windowMs: 60_000 }),
      breaker: new UpstashBreaker({ log: () => {} }),
    });
    const result = await limiter.check("fp");
    expect(result).toMatchObject({ success: false, source: "upstash", reset: 42 });
    expect(upstash.calls).toBe(1);
  });

  it("falls back to the same limit in memory once the quota is gone, and never fails open", async () => {
    const upstash = upstashFake(async () => {
      throw QUOTA;
    });
    const breaker = new UpstashBreaker({ log: () => {} });
    const limiter = new HybridRateLimiter({
      upstash,
      memory: new MemorySlidingWindowLimiter({ limit: 10, windowMs: 60_000 }),
      breaker,
    });
    const results = [];
    for (let i = 0; i < 11; i++) results.push(await limiter.check("fp"));
    expect(upstash.calls).toBe(1);
    expect(breaker.state).toBe("open");
    expect(results[0]).toMatchObject({ success: true, source: "memory", degraded: "redis-error" });
    expect(results[1]).toMatchObject({ success: true, source: "memory", degraded: "circuit-open" });
    expect(results.slice(0, 10).every((r) => r.success)).toBe(true);
    expect(results[10].success).toBe(false);
  });

  it("treats a Ratelimit timeout verdict as a failure and counts locally", async () => {
    const upstash = upstashFake(async () => ({ success: true, limit: 10, remaining: 10, reset: 0, reason: "timeout" }));
    const breaker = new UpstashBreaker({ log: () => {} });
    const limiter = new HybridRateLimiter({
      upstash,
      memory: new MemorySlidingWindowLimiter({ limit: 1, windowMs: 60_000 }),
      breaker,
    });
    expect((await limiter.check("fp")).source).toBe("memory");
    expect(breaker.state).toBe("open");
    expect(breaker.lastReason).toBe("timeout");
    expect((await limiter.check("fp")).success).toBe(false);
  });
});

describe("Ratelimit options", () => {
  it("turn analytics off and give every limiter an ephemeral cache", () => {
    const options = upstashRatelimitOptions(1500);
    expect(options.analytics).toBe(false);
    expect(options.ephemeralCache).toBeInstanceOf(Map);
    expect(options.timeout).toBe(1500);
    // Each limiter gets its own cache.
    expect(upstashRatelimitOptions(1500).ephemeralCache).not.toBe(options.ephemeralCache);
  });

  it("no source file enables Ratelimit analytics", async () => {
    const offenders: string[] = [];
    for await (const file of new Glob("src/**/*.{ts,tsx}").scan({ cwd: process.cwd() })) {
      if (file.includes("__tests__")) continue;
      const text = await Bun.file(file).text();
      if (/analytics:\s*true/.test(text) && text.includes("Ratelimit")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

describe("shouldSkipRateLimit", () => {
  const none = new Headers();

  it("skips static assets, Next internals, images, well-known files and probes", () => {
    for (const path of [
      "/_next/static/chunks/app.js",
      "/_next/data/build/page.json",
      "/images/hero.webp",
      "/logo.svg",
      "/favicon.ico",
      "/robots.txt",
      "/sitemap.xml",
      "/api/health",
      "/api/health/estate",
      "/api/ready",
    ]) {
      expect(shouldSkipRateLimit("GET", path, none)).toBe(true);
    }
  });

  it("skips prefetches", () => {
    expect(shouldSkipRateLimit("GET", "/food", new Headers({ "next-router-prefetch": "1" }))).toBe(true);
    expect(shouldSkipRateLimit("GET", "/food", new Headers({ purpose: "prefetch" }))).toBe(true);
    expect(shouldSkipRateLimit("GET", "/food", new Headers({ "sec-purpose": "prefetch;prerender" }))).toBe(true);
  });

  it("limits pages, auth, API calls and every mutation", () => {
    expect(shouldSkipRateLimit("GET", "/", none)).toBe(false);
    expect(shouldSkipRateLimit("GET", "/auth/login", none)).toBe(false);
    expect(shouldSkipRateLimit("GET", "/api/healthz", none)).toBe(false);
    expect(shouldSkipRateLimit("POST", "/api/health", none)).toBe(false);
    expect(shouldSkipRateLimit("POST", "/auth/login", new Headers({ "next-router-prefetch": "1" }))).toBe(false);
  });
});
