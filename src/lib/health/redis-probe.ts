/**
 * The Redis line of `/api/health`, without spending a command per call.
 *
 * - Breaker open: the app is running on its local fallbacks, so Redis is
 *   reported `degraded` and Upstash is not asked.
 * - Breaker closed: one PING, and its answer is reused for a few minutes.
 * - A failed PING feeds the shared breaker (a quota, auth or timeout error
 *   opens it) and is reported `degraded`, because nothing fails without
 *   Upstash: limiters count in memory and caches read the source.
 *
 * `/api/ready` never touches Upstash.
 */

import { type UpstashBreaker, getUpstashBreaker } from "@/lib/upstash/access";

export type RedisHealthState = "up" | "degraded";

/** How long a PING answer is reused. */
export const REDIS_PROBE_CACHE_MS = 5 * 60_000;

interface CachedProbe {
  at: number;
  url: string;
  state: RedisHealthState;
  ms: number;
}

let cached: CachedProbe | null = null;

export function resetRedisProbeCache(): void {
  cached = null;
}

export interface RedisProbeDeps {
  breaker?: UpstashBreaker;
  now?: () => number;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export async function probeRedisHealth(
  url: string,
  token: string | undefined,
  deps: RedisProbeDeps = {},
): Promise<{ state: RedisHealthState; ms?: number; cached: boolean }> {
  const breaker = deps.breaker ?? getUpstashBreaker();
  const now = deps.now ?? (() => Date.now());
  const fetchImpl = deps.fetchImpl ?? fetch;

  if (breaker.state === "open") return { state: "degraded", cached: false };
  const t = now();
  if (cached && cached.url === url && t - cached.at < REDIS_PROBE_CACHE_MS) {
    return { state: cached.state, ms: cached.ms, cached: true };
  }
  if (!breaker.tryAcquire()) return { state: "degraded", cached: false };

  const started = now();
  let state: RedisHealthState = "degraded";
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify(["PING"]),
      signal: AbortSignal.timeout(deps.timeoutMs ?? 3000),
    });
    if (response.ok) {
      state = "up";
      breaker.recordSuccess();
    } else {
      let message = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as { error?: unknown };
        if (typeof body.error === "string") message = `${body.error} (${message})`;
      } catch {
        // Non-JSON body: the status is all there is.
      }
      breaker.recordFailure(new Error(message));
    }
  } catch (error) {
    breaker.recordFailure(error);
  }
  const ms = now() - started;
  cached = { at: now(), url, state, ms };
  return { state, ms, cached: false };
}
