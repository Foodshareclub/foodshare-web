/**
 * Database Health Check
 *
 * Centralized health check utility for verifying database availability.
 * Used by Server Components to gracefully redirect to maintenance page
 * when the database is unavailable.
 */

/**
 * Check if database is healthy before making any calls
 * Uses retry logic with exponential backoff for production reliability
 *
 * @param timeoutMs - Timeout per attempt in milliseconds (default: 30000ms)
 * @param maxRetries - Maximum retry attempts (default: 2)
 * @returns Promise<boolean> - true if database is healthy
 */
export async function isDatabaseHealthy(timeoutMs = 30000, maxRetries = 2): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
