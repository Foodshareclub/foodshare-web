/**
 * Database Health Check API Route
 * Self-hosted Supabase probes (no Supabase Cloud Management API):
 * 1. Direct DB connectivity via PostgREST
 * 2. Auth (GoTrue) health endpoint
 * 3. Storage (storage-api) status endpoint
 * 4. Redis (Upstash) connectivity when configured
 */

import { NextResponse } from "next/server";

interface HealthStatus {
  status: "healthy" | "degraded" | "maintenance";
  database: boolean;
  timestamp: string;
  message?: string;
  retryAfter?: number;
  services: {
    database: "up" | "down" | "degraded";
    auth: "up" | "down" | "unknown";
    storage: "up" | "down" | "unknown";
    redis?: "up" | "down" | "unknown";
  };
  latency?: {
    database?: number;
    auth?: number;
    storage?: number;
    redis?: number;
  };
}

const MAINTENANCE_MESSAGE = "We're sprucing things up! Back shortly — thanks for your patience! 💚";

/**
 * Check Redis (Upstash) connectivity for rate limiting
 */
async function checkRedisHealth(): Promise<{ ok: boolean; latency: number }> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return { ok: true, latency: 0 }; // Redis not configured, skip check
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${redisUrl}/ping`, {
      headers: {
        Authorization: `Bearer ${redisToken}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    return { ok: response.ok, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}

/**
 * Probe a self-hosted Supabase service endpoint.
 * Returns service availability and response latency.
 */
async function probeService(
  endpoint: string,
  supabaseKey: string,
  timeoutMs = 5000
): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    return { ok: response.ok, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}

/**
 * Check direct database connectivity via PostgREST with retry logic
 */
async function checkDatabaseConnectivity(
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ ok: boolean; status: number | null }> {
  const maxRetries = 1;
  let lastStatus: number | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutMs = attempt === 0 ? 5000 : 8000; // 5s first, 8s retry
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
        method: "GET",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);
      lastStatus = response.status;

      // Only 2xx counts as up - a 401 here means the anon key was rejected
      // (e.g. after a key rotation) and must NOT be reported as healthy
      if (response.ok) {
        return { ok: true, status: response.status };
      }

      // Server error - retry if we have attempts left
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    } catch (error) {
      console.error(`Database connectivity attempt ${attempt + 1} failed:`, error);
      // Timeout or network error - retry if we have attempts left
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  return { ok: false, status: lastStatus };
}

function createResponse(
  status: HealthStatus["status"],
  database: boolean,
  services: HealthStatus["services"],
  message?: string,
  latency?: HealthStatus["latency"]
): NextResponse<HealthStatus> {
  const response: HealthStatus = {
    status,
    database,
    timestamp: new Date().toISOString(),
    services,
    ...(message && { message }),
    ...(status !== "healthy" && { retryAfter: 30 }),
    ...(latency && { latency }),
  };

  const httpStatus = status === "maintenance" ? 503 : 200;
  const headers: Record<string, string> = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  };

  if (status === "maintenance") {
    headers["Retry-After"] = "30";
  }

  return NextResponse.json(response, { status: httpStatus, headers });
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return createResponse(
        "maintenance",
        false,
        { database: "down", auth: "unknown", storage: "unknown" },
        "Service configuration error"
      );
    }

    // Check all sources in parallel
    const [dbResult, authResult, storageResult, redisResult] = await Promise.all([
      checkDatabaseConnectivity(supabaseUrl, supabaseKey),
      probeService(`${supabaseUrl}/auth/v1/health`, supabaseKey),
      probeService(`${supabaseUrl}/storage/v1/status`, supabaseKey),
      checkRedisHealth(),
    ]);

    // Determine Redis status
    const redisConfigured = !!(
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    );
    const redisStatus: "up" | "down" | "unknown" = redisConfigured
      ? redisResult.ok
        ? "up"
        : "down"
      : "unknown";

    // Database is critical -> maintenance mode
    if (!dbResult.ok) {
      return createResponse(
        "maintenance",
        false,
        {
          database: "down",
          auth: authResult.ok ? "up" : "down",
          storage: storageResult.ok ? "up" : "down",
          ...(redisConfigured && { redis: redisStatus }),
        },
        MAINTENANCE_MESSAGE,
        {
          auth: authResult.latency,
          storage: storageResult.latency,
          ...(redisConfigured && { redis: redisResult.latency }),
        }
      );
    }

    // Auth or Storage down -> degraded but serving
    if (!authResult.ok || !storageResult.ok) {
      return createResponse(
        "degraded",
        true,
        {
          database: "up",
          auth: authResult.ok ? "up" : "down",
          storage: storageResult.ok ? "up" : "down",
          ...(redisConfigured && { redis: redisStatus }),
        },
        `Degraded services: ${[!authResult.ok && "auth", !storageResult.ok && "storage"].filter(Boolean).join(", ")}`,
        {
          auth: authResult.latency,
          storage: storageResult.latency,
          ...(redisConfigured && { redis: redisResult.latency }),
        }
      );
    }

    // All good (or degraded if Redis is down but core services are up)
    const overallStatus = !redisConfigured || redisResult.ok ? "healthy" : "degraded";
    return createResponse(
      overallStatus,
      true,
      {
        database: "up",
        auth: "up",
        storage: "up",
        ...(redisConfigured && { redis: redisStatus }),
      },
      undefined,
      {
        auth: authResult.latency,
        storage: storageResult.latency,
        ...(redisConfigured && { redis: redisResult.latency }),
      }
    );
  } catch {
    return createResponse(
      "maintenance",
      false,
      { database: "down", auth: "unknown", storage: "unknown" },
      MAINTENANCE_MESSAGE
    );
  }
}
