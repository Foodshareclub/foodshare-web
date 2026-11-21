/**
 * Redis operations, circuit breaker, request coalescing, compression,
 * key validation, and rate limiting utilities for api-v1-cache.
 */

import { logger } from "../../_shared/logger.ts";
import {
  AuthenticationError as AuthError,
  ServerError,
  ValidationError,
} from "../../_shared/errors.ts";
import {
  redisBreaker,
  upstashCommand,
  UpstashCommandError,
  upstashPipeline,
} from "../../_shared/upstash-redis.ts";
import { CONFIG, KeyScope, metrics, pendingRequests } from "./types.ts";

// =============================================================================
// Circuit Breaker and Redis Operations
// =============================================================================
//
// The breaker and the client are shared (`_shared/upstash-breaker.ts`,
// `_shared/upstash-redis.ts`): a quota, auth or timeout failure skips Upstash
// for a 10 minute cool-down, then lets one half-open try through.
/** Read-only: is Upstash being skipped right now? Never takes the probe slot. */
export function isCircuitBreakerOpen(): boolean {
  return redisBreaker().wouldSkip();
}
export function getBreakerState(): "closed" | "open" | "half-open" {
  return redisBreaker().snapshot().state;
}
export function breakerRetryAfterSeconds(): number {
  return redisBreaker().retryAfterSeconds();
}
export async function executeRedisCommand(
  redisUrl: string,
  redisToken: string,
  command: (string | number)[],
): Promise<unknown> {
  try {
    return await upstashCommand({ url: redisUrl, token: redisToken }, command);
  } catch (error) {
    if (error instanceof UpstashCommandError) {
      throw new ServerError(`Redis command failed: ${error.message}`);
    }
    throw error;
  }
}
export async function executeRedisPipeline(
  redisUrl: string,
  redisToken: string,
  commands: (string | number)[][],
): Promise<unknown[]> {
  try {
    return await upstashPipeline({ url: redisUrl, token: redisToken }, commands);
  } catch (error) {
    if (error instanceof UpstashCommandError) {
      throw new ServerError(`Redis pipeline failed: ${error.message}`);
    }
    throw error;
  }
}
// =============================================================================
// Request Coalescing
// =============================================================================

export async function coalesceRequest<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const existing = pendingRequests.get(key);
  if (existing) {
    metrics.coalescedRequests++;
    return existing as Promise<T>;
  }

  const promise = operation().finally(() => {
    // Clean up after a short delay to allow coalescing
    setTimeout(() => pendingRequests.delete(key), CONFIG.coalescingWindowMs);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// =============================================================================
// Compression
// =============================================================================

export async function compressValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();
  const compressed = await new Response(cs.readable).arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(compressed)));
  metrics.compressionSavings += value.length - base64.length;
  return `__gzip__:${base64}`;
}

export async function decompressValue(value: string): Promise<string> {
  if (!value.startsWith("__gzip__:")) return value;
  const base64 = value.slice(9);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return await new Response(ds.readable).text();
}

export function shouldCompress(
  value: string,
  options?: { compress?: boolean },
): boolean {
  return (options?.compress !== false) &&
    value.length > CONFIG.compressionThreshold;
}

// =============================================================================
// Key Validation
// =============================================================================

export function validateAndScopeKey(
  key: string,
  userId: string | null,
  allowWrite: boolean,
): { scope: KeyScope; scopedKey: string } {
  if (key.startsWith("user:")) {
    const userPrefix = `user:${userId}:`;
    if (!key.startsWith(userPrefix)) {
      throw new ValidationError(
        `User-scoped keys must start with: ${userPrefix}`,
      );
    }
    return { scope: KeyScope.User, scopedKey: key };
  }

  if (key.startsWith("app:")) {
    if (allowWrite) {
      throw new ValidationError("App-scoped keys are read-only for clients");
    }
    return { scope: KeyScope.App, scopedKey: key };
  }

  if (key.startsWith("global:")) {
    if (allowWrite) {
      throw new ValidationError("Global keys are read-only");
    }
    return { scope: KeyScope.Global, scopedKey: key };
  }

  if (!userId) {
    throw new AuthError("Authentication required for unscoped keys");
  }
  return { scope: KeyScope.User, scopedKey: `user:${userId}:${key}` };
}

export function isWriteOperation(operation: string): boolean {
  return [
    "set",
    "delete",
    "incr",
    "decr",
    "expire",
    "getset",
    "mset",
    "mdel",
    "hset",
    "hdel",
    "hincrby",
    "hmset",
    "lpush",
    "rpush",
    "lpop",
    "rpop",
    "ltrim",
    "zadd",
    "zrem",
    "zincrby",
    "sadd",
    "srem",
    "flush_pattern",
  ].includes(operation);
}

export function getOperationType(
  operation: string,
): "read" | "write" | "delete" {
  if (
    ["delete", "mdel", "hdel", "zrem", "lpop", "rpop", "srem", "flush_pattern"]
      .includes(operation)
  ) {
    return "delete";
  }
  if (isWriteOperation(operation)) return "write";
  return "read";
}

// =============================================================================
// Rate Limiting
// =============================================================================

export async function checkRateLimit(
  supabase: any,
  userId: string,
  operation: string,
  tier: keyof typeof CONFIG.rateLimits = "free",
): Promise<boolean> {
  const opType = getOperationType(operation);
  const limit = CONFIG.rateLimits[tier][opType];

  const { data: withinLimit, error } = await supabase.rpc("check_rate_limit", {
    user_id: userId,
    operation: `cache_${opType}`,
    max_requests: limit,
    time_window_seconds: 60,
  });

  if (error) {
    logger.error("Rate limit check failed", { error: error.message });
    return true; // Allow on error
  }

  return withinLimit !== false;
}

// =============================================================================
// Health Check Helpers (shared with health module)
// =============================================================================

export function parseRedisInfo(info: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of info.split("\n")) {
    if (line && !line.startsWith("#")) {
      const [key, value] = line.split(":");
      if (key && value) result[key.trim()] = value.trim();
    }
  }
  return result;
}
