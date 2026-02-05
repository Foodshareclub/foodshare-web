/**
 * Upstash Health Check & Keep-Alive Endpoint
 *
 * Pings all Upstash services to:
 * 1. Verify connectivity
 * 2. Prevent hibernation due to inactivity
 *
 * Called by:
 * - Vercel Cron daily (hobby plan limitation)
 * - QStash schedule every 5 minutes (for keep-warm)
 */

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Client as QStashClient, Receiver } from "@upstash/qstash";
import { Search } from "@upstash/search";
import { Index as VectorIndex } from "@upstash/vector";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "down";
  latency?: number;
  error?: string;
}

const HEALTH_CHECK_TIMEOUT = 5000; // 5 second timeout per service

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), ms)
  );
  return Promise.race([promise, timeout]);
}

async function checkRedis(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    // Support both naming conventions: UPSTASH_REDIS_REST_* and KV_REST_API_*
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      return {
        name: "Upstash Redis",
        status: "degraded",
        latency: Date.now() - start,
        error: "Not configured",
      };
    }

    const redis = new Redis({ url, token });
    const pong = await withTimeout(redis.ping(), HEALTH_CHECK_TIMEOUT);
    return {
      name: "Upstash Redis",
      status: pong === "PONG" ? "healthy" : "degraded",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "Upstash Redis",
      status: "down",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkQStash(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    if (!process.env.QSTASH_TOKEN) {
      return {
        name: "Upstash QStash",
        status: "degraded",
        latency: Date.now() - start,
        error: "Not configured",
      };
    }

    const qstash = new QStashClient({
      token: process.env.QSTASH_TOKEN,
    });
    // List schedules as a health check (lightweight operation)
    await withTimeout(qstash.schedules.list(), HEALTH_CHECK_TIMEOUT);
    return {
      name: "Upstash QStash",
      status: "healthy",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "Upstash QStash",
      status: "down",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkSearch(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    if (!process.env.UPSTASH_SEARCH_REST_URL || !process.env.UPSTASH_SEARCH_REST_TOKEN) {
      return {
        name: "Upstash Search",
        status: "degraded",
        latency: Date.now() - start,
        error: "Not configured",
      };
    }

    const search = new Search({
      url: process.env.UPSTASH_SEARCH_REST_URL,
      token: process.env.UPSTASH_SEARCH_REST_TOKEN,
    });
    // List indexes as a health check
    await withTimeout(search.listIndexes(), HEALTH_CHECK_TIMEOUT);
    return {
      name: "Upstash Search",
      status: "healthy",
      latency: Date.now() - start,
    };
  } catch (error) {
    // Search might return error if no indexes exist, but connection works
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    const isConnectionError =
      errorMsg.includes("fetch") || errorMsg.includes("network") || errorMsg.includes("Timeout");
    return {
      name: "Upstash Search",
      status: isConnectionError ? "down" : "healthy",
      latency: Date.now() - start,
      error: isConnectionError ? errorMsg : undefined,
    };
  }
}

async function checkVector(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    // Check if Vector env vars are configured
    if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
      return {
        name: "Upstash Vector",
        status: "degraded",
        latency: Date.now() - start,
        error: "Not configured",
      };
    }

    const vector = new VectorIndex({
      url: process.env.UPSTASH_VECTOR_REST_URL,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN,
    });
    // Get index info as a lightweight health check
    await withTimeout(vector.info(), HEALTH_CHECK_TIMEOUT);
    return {
      name: "Upstash Vector",
      status: "healthy",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "Upstash Vector",
      status: "down",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Verify QStash signature for scheduled calls
 */
async function _verifyQStashSignature(request: Request): Promise<boolean> {
  const signature = request.headers.get("upstash-signature");
  if (!signature) return false;

  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentSigningKey || !nextSigningKey) return false;

  try {
    const receiver = new Receiver({
      currentSigningKey,
      nextSigningKey,
    });

    const body = await request.text();
    const isValid = await receiver.verify({
      signature,
      body,
      url: request.url,
    });

    return isValid;
  } catch {
    return false;
  }
}

async function cleanupOldSchedule() {
  if (!process.env.QSTASH_TOKEN) return;

  try {
    const qstash = new QStashClient({ token: process.env.QSTASH_TOKEN });
    const schedules = await qstash.schedules.list();
    const oldSchedule = schedules.find((s) => s.destination?.includes("/api/health/upstash"));

    if (oldSchedule?.scheduleId) {
      await qstash.schedules.delete(oldSchedule.scheduleId);
      console.log("[Upstash] Deleted deprecated schedule:", oldSchedule.scheduleId);
    }
  } catch (error) {
    console.error("[Upstash] Cleanup failed:", error);
  }
}

export async function GET() {
  return NextResponse.json({ error: "Deprecated" }, { status: 410 });
}

export async function POST(request: Request) {
  if (request.headers.get("upstash-signature")) {
    await cleanupOldSchedule();
    return NextResponse.json({ status: "cleaned" });
  }
  return NextResponse.json({ error: "Deprecated" }, { status: 410 });
}

async function _runHealthCheck(source: "vercel-cron" | "qstash-schedule" | "manual") {
  const startTime = Date.now();

  // Run all health checks in parallel
  const [redis, qstash, search, vector] = await Promise.all([
    checkRedis(),
    checkQStash(),
    checkSearch(),
    checkVector(),
  ]);

  const services = [redis, qstash, search, vector];
  const allHealthy = services.every((s) => s.status === "healthy");
  const anyDown = services.some((s) => s.status === "down");

  const response = {
    status: anyDown ? "degraded" : allHealthy ? "healthy" : "partial",
    timestamp: new Date().toISOString(),
    source,
    totalLatency: Date.now() - startTime,
    services,
  };

  // Log for monitoring
  console.log("[Upstash Health Check]", JSON.stringify(response, null, 2));

  return NextResponse.json(response, {
    status: anyDown ? 503 : 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
