/**
 * Database Health Check API Route
 * Self-hosted Supabase probes (no Supabase Cloud Management API):
 * 1. Direct DB connectivity via PostgREST
 * 2. Auth (GoTrue) health endpoint
 * 3. Storage (storage-api) status endpoint
 * 4. Redis (Upstash) connectivity when configured
 */

import { NextResponse, connection } from "next/server";
import { logger } from "@/lib/logger";

type ServiceState = "up" | "down" | "unknown";

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

async function probe(
  url: string,
  init: RequestInit = {}
): Promise<{ state: ServiceState; ms: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
    const ms = Date.now() - startedAt;
    return { state: response.ok ? "up" : "down", ms };
  } catch {
    return { state: "down", ms: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}

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
      { status: 503 }
    );
  }

  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  const [database, auth, storage] = await Promise.all([
    probe(`${supabaseUrl}/rest/v1/?select=1`, { headers }),
    probe(`${supabaseUrl}/auth/v1/health`, { headers }),
    probe(`${supabaseUrl}/storage/v1/status`, { headers }),
  ]);

  services.database = database.state;
  services.auth = auth.state;
  services.storage = storage.state;
  latency.database = database.ms;
  latency.auth = auth.ms;
  latency.storage = storage.ms;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  if (redisUrl) {
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    const redis = await probe(redisUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["PING"]),
    });
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
    { status: databaseUp ? 200 : 503 }
  );
}

export async function HEAD(): Promise<NextResponse> {
  const response = await GET();
  logger.debug("Health HEAD probe", { status: response.status });
  return new NextResponse(null, { status: response.status });
}
