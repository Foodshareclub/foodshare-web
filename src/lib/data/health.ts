/**
 * Database Health Check
 *
 * Centralized health check utility for verifying database availability.
 * Used by Server Components to gracefully redirect to maintenance page
 * when the database is unavailable.
 *
 * Includes a circuit breaker to avoid redundant checks when the DB
 * was recently confirmed healthy — prevents the annoying
 * maintenance-page redirect loop.
 */

/** Timestamp of last successful health check (module-level, survives across requests in Node) */
let lastHealthyTimestamp = 0;

/** Skip the health check if we were healthy within this window */
const HEALTH_CACHE_MS = 60_000; // 60 seconds

/**
 * Check if database is healthy before making any calls.
 *
 * Uses a circuit breaker: if the database was confirmed healthy within
 * the last 60 seconds, returns true immediately without making a request.
 *
 * @param timeoutMs - Timeout per attempt in milliseconds (default: 8000ms)
 * @param maxRetries - Maximum retry attempts (default: 1)
 * @returns Promise<boolean> - true if database is healthy
 */
export async function isDatabaseHealthy(timeoutMs = 8000, maxRetries = 1): Promise<boolean> {
  // Circuit breaker: skip check if recently healthy
  if (Date.now() - lastHealthyTimestamp < HEALTH_CACHE_MS) {
    return true;
  }

  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || !supabaseKey) {
    return false;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const attemptTimeout = attempt === 0 ? timeoutMs : timeoutMs * 1.5;
      const timeoutId = setTimeout(() => controller.abort(), attemptTimeout);

      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status < 500) {
        // Verify response is JSON (not HTML from a misconfigured proxy)
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("text/html")) {
          return false;
        }
        // Success — update circuit breaker
        lastHealthyTimestamp = Date.now();
        return true;
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    } catch {
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  return false;
}
