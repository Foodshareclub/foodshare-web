/**
 * Database Health Check API Route
 * Self-hosted Supabase probes (no Supabase Cloud Management API):
 * 1. Direct DB connectivity via PostgREST
 * 2. Auth (GoTrue) health endpoint
 * 3. Storage (storage-api) status endpoint
 * 4. Redis (Upstash) when configured: "up", or "degraded" while the app runs
 *    on its local fallbacks (breaker open or PING failed). The PING answer is
 *    cached for a few minutes (`@/lib/health/redis-probe`), so the route does
 *    not spend an Upstash command per call.
 *
 * The probes themselves live in `@/lib/health/estate-probe`, because the
 * database probe should follow the product-data path rather than treating
 * the PostgREST root's OpenAPI response as proof that the listing view works.
 */

import {
  AUTH_PROBE_PATH,
  DATABASE_PROBE_PATH,
  STORAGE_PROBE_PATH,
  type ServiceState,
  isTemplateValue,
  probe,
} from "@/lib/health/estate-probe";
import { type RedisHealthState, probeRedisHealth } from "@/lib/health/redis-probe";
import { logger } from "@/lib/logger";
import { NextResponse, connection } from "next/server";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  database: boolean;
  timestamp: string;
  services: {
    database: ServiceState;
    auth: ServiceState;
    storage: ServiceState;
    redis?: RedisHealthState;
  };
  latency?: {
    database?: number;
    auth?: number;
    storage?: number;
    redis?: number;
  };
}

const PROBE_TIMEOUT_MS = 3000;

export async function GET(): Promise<NextResponse<HealthStatus>> {
  await connection();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const services: HealthStatus["services"] = {
    database: "unknown",
    auth: "unknown",
    storage: "unknown",
  };
  const latency: NonNullable<HealthStatus["latency"]> = {};

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      {
        status: "unhealthy",
        database: false,
        timestamp: new Date().toISOString(),
        services,
        message: "Supabase environment is not configured",
      },
      { status: 503 },
    );
  }

  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  const [database, auth, storage] = await Promise.all([
    probe(`${supabaseUrl}${DATABASE_PROBE_PATH}`, { headers }, PROBE_TIMEOUT_MS),
    probe(`${supabaseUrl}${AUTH_PROBE_PATH}`, { headers }, PROBE_TIMEOUT_MS),
    probe(`${supabaseUrl}${STORAGE_PROBE_PATH}`, { headers }, PROBE_TIMEOUT_MS),
  ]);

  services.database = database.state;
  services.auth = auth.state;
  services.storage = storage.state;
  latency.database = database.ms;
  latency.auth = auth.ms;
  latency.storage = storage.ms;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  if (redisUrl && !isTemplateValue(redisUrl)) {
    const redis = await probeRedisHealth(redisUrl, process.env.UPSTASH_REDIS_REST_TOKEN, {
      timeoutMs: PROBE_TIMEOUT_MS,
    });
    services.redis = redis.state;
    if (redis.ms !== undefined) latency.redis = redis.ms;
  }

  const databaseUp = services.database === "up";
  const degraded = !databaseUp || services.auth === "down" || services.storage === "down";

  return NextResponse.json(
    {
      status: databaseUp ? (degraded ? "degraded" : "healthy") : "unhealthy",
      database: databaseUp,
      timestamp: new Date().toISOString(),
      services,
      latency,
    },
    { status: databaseUp ? 200 : 503 },
  );
}

export async function HEAD(): Promise<NextResponse> {
  const response = await GET();
  logger.debug("Health HEAD probe", { status: response.status });
  return new NextResponse(null, { status: response.status });
}
