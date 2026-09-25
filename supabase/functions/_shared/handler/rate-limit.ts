/**
 * In-Memory Rate Limiting & Key Generators
 *
 * Process-local sliding-window limiter plus client key resolution.
 * Extracted from `_shared/api-handler.ts` — no logic changes.
 */

import type { HandlerRateLimitConfig } from "./types.ts";
import type { HandlerContext } from "./types.ts";

const MAX_RATE_LIMIT_ENTRIES = 10_000;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkInMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt < now) {
    // Evict oldest if store is full
    if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
      const firstKey = rateLimitStore.keys().next().value;
      if (firstKey) rateLimitStore.delete(firstKey);
    }
    // Window expired or first request
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export function getRateLimitKey(
  ctx: HandlerContext,
  keyBy: HandlerRateLimitConfig["keyBy"],
  service: string,
): string {
  if (typeof keyBy === "function") {
    return keyBy(ctx);
  }

  switch (keyBy) {
    case "user":
      return ctx.userId
        ? `user:${ctx.userId}:${service}`
        : `anon:${getClientIp(ctx.request)}:${service}`;
    case "device": {
      const deviceId = ctx.headers.get("x-device-id") ||
        ctx.headers.get("x-client-id");
      return deviceId
        ? `device:${deviceId}:${service}`
        : `ip:${getClientIp(ctx.request)}:${service}`;
    }
    case "ip":
    default:
      return `ip:${getClientIp(ctx.request)}:${service}`;
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
