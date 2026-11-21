/**
 * In-process rate limiting, and the hybrid that prefers Upstash.
 *
 * Production runs one web instance, so an in-memory limiter counts exactly
 * what a shared one would. The proxy's global limiter (100 requests per 10 s
 * per IP) runs here only and spends no Upstash commands. The auth and
 * mutation limiters use Upstash while the breaker is closed and fall back to
 * the same in-memory limiter while it is open, so they never fail open.
 *
 * The window is the sliding-window approximation `@upstash/ratelimit` uses:
 * the previous fixed window's count, weighted by how much of it still
 * overlaps the sliding window, plus the current window's count.
 */

import type { UpstashBreaker } from "@/lib/upstash/access";

export interface LocalLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms when budget frees up. */
  reset: number;
}

export interface MemorySlidingWindowOptions {
  limit: number;
  windowMs: number;
  /** Bound on tracked identifiers; least recently used are evicted. */
  maxKeys?: number;
  now?: () => number;
}

interface WindowEntry {
  window: number;
  current: number;
  previous: number;
}

export class MemorySlidingWindowLimiter {
  readonly limit: number;
  readonly windowMs: number;
  private readonly maxKeys: number;
  private readonly now: () => number;
  private readonly entries = new Map<string, WindowEntry>();

  constructor(options: MemorySlidingWindowOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.maxKeys = options.maxKeys ?? 10_000;
    this.now = options.now ?? (() => Date.now());
  }

  get size(): number {
    return this.entries.size;
  }

  check(identifier: string): LocalLimitResult {
    const now = this.now();
    const window = Math.floor(now / this.windowMs);
    let entry = this.entries.get(identifier);
    if (entry) {
      // Move to the most-recently-used end.
      this.entries.delete(identifier);
      if (entry.window !== window) {
        entry =
          entry.window === window - 1
            ? { window, current: 0, previous: entry.current }
            : { window, current: 0, previous: 0 };
      }
    } else {
      entry = { window, current: 0, previous: 0 };
      while (this.entries.size >= this.maxKeys) {
        const oldest = this.entries.keys().next();
        if (oldest.done) break;
        this.entries.delete(oldest.value);
      }
    }
    this.entries.set(identifier, entry);

    const elapsed = (now - window * this.windowMs) / this.windowMs;
    const estimate = entry.previous * (1 - elapsed) + entry.current;
    const reset = (window + 1) * this.windowMs;
    if (estimate >= this.limit) {
      return { success: false, limit: this.limit, remaining: 0, reset };
    }
    entry.current++;
    return {
      success: true,
      limit: this.limit,
      remaining: Math.max(0, Math.floor(this.limit - estimate - 1)),
      reset,
    };
  }
}

/** What the hybrid needs from `@upstash/ratelimit`'s `Ratelimit`. */
export interface UpstashLimiterLike {
  limit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
    reason?: string;
    pending?: Promise<unknown>;
  }>;
}

export interface HybridLimitResult extends LocalLimitResult {
  source: "upstash" | "memory";
  /** Set when Upstash is configured but the in-memory limiter answered. */
  degraded?: "circuit-open" | "redis-error";
}

/** Timeout reported by `Ratelimit` (`reason: "timeout"`) for the breaker. */
class RatelimitTimeoutError extends Error {
  override name = "TimeoutError";
}

export class HybridRateLimiter {
  constructor(
    private readonly options: {
      upstash: UpstashLimiterLike | null;
      memory: MemorySlidingWindowLimiter;
      breaker: UpstashBreaker;
    },
  ) {}

  async check(identifier: string): Promise<HybridLimitResult> {
    const { upstash, memory, breaker } = this.options;
    if (!upstash) return { ...memory.check(identifier), source: "memory" };
    if (!breaker.tryAcquire()) {
      return { ...memory.check(identifier), source: "memory", degraded: "circuit-open" };
    }
    try {
      const result = await upstash.limit(identifier);
      result.pending?.catch(() => {});
      if (result.reason === "timeout") {
        // Ratelimit lets a timed-out call through; count it locally instead.
        breaker.recordFailure(new RatelimitTimeoutError("ratelimit timeout"));
        return { ...memory.check(identifier), source: "memory", degraded: "redis-error" };
      }
      breaker.recordSuccess();
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        source: "upstash",
      };
    } catch (error) {
      breaker.recordFailure(error);
      return { ...memory.check(identifier), source: "memory", degraded: "redis-error" };
    }
  }
}

/**
 * Options every remaining `Ratelimit` is built with: no analytics (each
 * analytics record is an extra command), an explicit ephemeral cache so a
 * blocked identifier is rejected without a command, and the client timeout.
 */
export function upstashRatelimitOptions(timeoutMs: number): {
  analytics: false;
  ephemeralCache: Map<string, number>;
  timeout: number;
} {
  return { analytics: false, ephemeralCache: new Map(), timeout: timeoutMs };
}

/**
 * Requests the proxy does not rate limit: static assets, Next internals,
 * images, favicon/robots/sitemap, the health and readiness probes, and
 * prefetches. Only GET/HEAD qualify, so a mutation cannot opt out by path or
 * header.
 */
const STATIC_EXTENSION =
  /\.(?:avif|bmp|css|gif|ico|jpe?g|js|map|mjs|mp3|mp4|otf|pdf|png|svg|ttf|txt|wasm|webm|webmanifest|webp|woff2?|xml)$/i;

export function shouldSkipRateLimit(method: string, pathname: string, headers: Headers): boolean {
  const verb = method.toUpperCase();
  if (verb !== "GET" && verb !== "HEAD") return false;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/images/") || pathname.startsWith("/icons/")) return true;
  if (/^\/(?:favicon|robots|sitemap|apple-touch-icon|manifest)\b/.test(pathname)) return true;
  if (/^\/api\/(?:health|ready)(?:\/|$)/.test(pathname)) return true;
  if (STATIC_EXTENSION.test(pathname)) return true;
  if (headers.get("next-router-prefetch") || headers.get("x-middleware-prefetch")) return true;
  const purpose = `${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""}`;
  return /\bprefetch\b/i.test(purpose);
}
