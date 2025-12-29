/**
 * Detailed Health Check API Route
 * Comprehensive system diagnostics for monitoring dashboards
 * Returns detailed status of all subsystems with latency metrics
 *
 * @module api/health/detailed
 */

import { NextResponse } from "next/server";
import { validateEnv, isEmailConfigured, isRateLimitingConfigured } from "@/lib/env";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

interface DetailedHealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  environment: string;
  uptime: string;
  checks: {
    database: CheckResult;
    auth: CheckResult;
    storage: CheckResult;
    redis: CheckResult;
    email: CheckResult;
    config: CheckResult;
  };
  latency: {
    database_ms: number | null;
    redis_ms: number | null;
    total_ms: number;
  };
  metadata: {
    node_env: string;
    region?: string;
    correlation_id?: string;
  };
}

interface CheckResult {
  status: "pass" | "fail" | "warn" | "skip";
  message: string;
  latency_ms?: number;
}

const CHECK_TIMEOUT_MS = 5000;

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<CheckResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { status: "fail", message: "Database not configured" };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "HEAD",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    if (response.ok || response.status === 404) {
      return {
        status: latency > 1000 ? "warn" : "pass",
        message: latency > 1000 ? "Database slow" : "Database connected",
        latency_ms: latency,
      };
    }

    return {
      status: "fail",
      message: `Database error: ${response.status}`,
      latency_ms: latency,
    };
  } catch (error) {
    return {
      status: "fail",
      message: error instanceof Error ? error.message : "Database unreachable",
      latency_ms: Date.now() - start,
    };
  }
}

/**
 * Check Supabase Auth
 */
async function checkAuth(): Promise<CheckResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { status: "fail", message: "Auth not configured" };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: {
        apikey: supabaseKey,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    return {
      status: response.ok ? "pass" : "warn",
      message: response.ok ? "Auth service healthy" : "Auth service degraded",
      latency_ms: latency,
    };
  } catch {
    return {
      status: "warn",
      message: "Auth health check unavailable",
      latency_ms: Date.now() - start,
    };
  }
}

/**
 * Check Supabase Storage
 */
async function checkStorage(): Promise<CheckResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { status: "fail", message: "Storage not configured" };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    return {
      status: response.ok ? "pass" : "warn",
      message: response.ok ? "Storage service healthy" : "Storage service degraded",
      latency_ms: latency,
    };
  } catch {
    return {
      status: "warn",
      message: "Storage health check unavailable",
      latency_ms: Date.now() - start,
    };
  }
}

/**
 * Check Redis (Upstash)
 */
async function checkRedis(): Promise<CheckResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return { status: "skip", message: "Redis not configured" };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    const response = await fetch(`${redisUrl}/ping`, {
      headers: {
        Authorization: `Bearer ${redisToken}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    return {
      status: response.ok ? "pass" : "fail",
      message: response.ok ? "Redis connected" : "Redis unreachable",
      latency_ms: latency,
    };
  } catch {
    return {
      status: "fail",
      message: "Redis connection failed",
      latency_ms: Date.now() - start,
    };
  }
}

/**
 * Check email provider configuration
 */
function checkEmail(): CheckResult {
  if (!isEmailConfigured()) {
    return { status: "warn", message: "No email provider configured" };
  }

  const providers: string[] = [];
  if (process.env.RESEND_API_KEY) providers.push("Resend");
  if (process.env.AWS_SES_ACCESS_KEY_ID) providers.push("AWS SES");
  if (process.env.BREVO_API_KEY) providers.push("Brevo");

  return {
    status: "pass",
    message: `Email configured: ${providers.join(", ")}`,
  };
}

/**
 * Check environment configuration
 */
function checkConfig(): CheckResult {
  const validation = validateEnv();

  if (!validation.success) {
    return {
      status: "warn",
      message: `Config issues: ${validation.errors.length} warnings`,
    };
  }

  return { status: "pass", message: "Configuration valid" };
}

/**
 * Determine overall health status
 */
function determineOverallStatus(checks: DetailedHealthStatus["checks"]): "healthy" | "degraded" | "unhealthy" {
  const results = Object.values(checks);

  // Any critical failure = unhealthy
  if (checks.database.status === "fail" || checks.config.status === "fail") {
    return "unhealthy";
  }

  // Any failure = degraded
  if (results.some((r) => r.status === "fail")) {
    return "degraded";
  }

  // Any warning = degraded
  if (results.some((r) => r.status === "warn")) {
    return "degraded";
  }

  return "healthy";
}

export async function GET(request: Request): Promise<NextResponse<DetailedHealthStatus>> {
  const startTime = Date.now();
  const correlationId = request.headers.get("x-correlation-id") || crypto.randomUUID();

  // Run all checks in parallel
  const [database, auth, storage, redis] = await Promise.all([
    checkDatabase(),
    checkAuth(),
    checkStorage(),
    checkRedis(),
  ]);

  // Sync checks
  const email = checkEmail();
  const config = checkConfig();

  const checks = { database, auth, storage, redis, email, config };
  const status = determineOverallStatus(checks);

  const response: DetailedHealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: "N/A", // Edge functions don't have process.uptime()
    checks,
    latency: {
      database_ms: database.latency_ms || null,
      redis_ms: redis.latency_ms || null,
      total_ms: Date.now() - startTime,
    },
    metadata: {
      node_env: process.env.NODE_ENV || "development",
      region: process.env.VERCEL_REGION,
      correlation_id: correlationId,
    },
  };

  const httpStatus = status === "unhealthy" ? 503 : status === "degraded" ? 200 : 200;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "x-correlation-id": correlationId,
    },
  });
}
