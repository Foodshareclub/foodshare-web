/**
 * Database Health Check API Route
 * Self-hosted Supabase probes (no Supabase Cloud Management API):
 * 1. Direct DB connectivity via PostgREST
 * 2. Auth (GoTrue) health endpoint
 * 3. Storage (storage-api) status endpoint
 * 4. Redis (Upstash) connectivity when configured
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
    redis?: ServiceState;
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
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    const redis = await probe(
      redisUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["PING"]),
      },
      PROBE_TIMEOUT_MS,
    );
    services.redis = redis.state;
    latency.redis = redis.ms;
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
