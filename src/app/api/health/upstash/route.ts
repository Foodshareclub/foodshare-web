/**
 * Upstash Health Check & Keep-Alive Endpoint
 *
 * Pings all Upstash services to:
 * 1. Verify connectivity
 * 2. Prevent hibernation due to inactivity
 *
 * Called by Vercel Cron every 12 hours
 */

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Client as QStashClient } from "@upstash/qstash";
import { Search } from "@upstash/search";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "down";
  latency?: number;
  error?: string;
}

async function checkRedis(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const redis = Redis.fromEnv();
    const pong = await redis.ping();
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
    const qstash = new QStashClient({
      token: process.env.QSTASH_TOKEN!,
    });
    // List schedules as a health check (lightweight operation)
    await qstash.schedules.list();
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
    const search = new Search({
      url: process.env.UPSTASH_SEARCH_REST_URL!,
      token: process.env.UPSTASH_SEARCH_REST_TOKEN!,
    });
    // List indexes as a health check
    const indexes = await search.listIndexes();
    return {
      name: "Upstash Search",
      status: "healthy",
      latency: Date.now() - start,
    };
  } catch (error) {
    // Search might return error if no indexes exist, but connection works
    const isConnectionError = error instanceof Error &&
      (error.message.includes("fetch") || error.message.includes("network"));
    return {
      name: "Upstash Search",
      status: isConnectionError ? "down" : "healthy",
      latency: Date.now() - start,
      error: isConnectionError ? error.message : undefined,
    };
  }
}

export async function GET(request: Request) {
  // Verify cron secret for security (optional but recommended)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow access if no secret is set, or if secret matches, or if from Vercel cron
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const isAuthorized = !cronSecret ||
    authHeader === `Bearer ${cronSecret}` ||
    isVercelCron;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  // Run all health checks in parallel
  const [redis, qstash, search] = await Promise.all([
    checkRedis(),
    checkQStash(),
    checkSearch(),
  ]);

  const services = [redis, qstash, search];
  const allHealthy = services.every((s) => s.status === "healthy");
  const anyDown = services.some((s) => s.status === "down");

  const response = {
    status: anyDown ? "degraded" : allHealthy ? "healthy" : "partial",
    timestamp: new Date().toISOString(),
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
