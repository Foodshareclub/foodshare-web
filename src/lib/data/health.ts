/**
 * Database Health Check
 *
 * Centralized health check utility for verifying database availability.
 * Used by Server Components to gracefully redirect to maintenance page
 * when the database is unavailable.
 */

/**
 * Check if database is healthy before making any calls
 * Uses a simple health check with configurable timeout
 *
 * @param timeoutMs - Timeout in milliseconds (default: 3000ms)
 * @returns Promise<boolean> - true if database is healthy
 */
export async function isDatabaseHealthy(timeoutMs = 3000): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}
