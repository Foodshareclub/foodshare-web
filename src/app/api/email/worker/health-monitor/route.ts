/**
 * Email Health Monitor Worker
 * Runs every 5 minutes via QStash cron
 * Monitors provider health and updates metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { Redis } from "@upstash/redis";
import { createClient } from "@/lib/supabase/server";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

async function handler(req: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();

    // Call the email Edge Function health check
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        action: "health",
        mode: "full",
      }),
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    const healthData = await response.json();

    // Cache health data in Redis for fast API access
    await redis.setex("email:health:latest", 300, JSON.stringify(healthData));

    // Check for critical alerts
    const criticalAlerts = healthData.alerts?.filter((a: string) =>
      a.startsWith("ERROR:") || a.startsWith("CRITICAL:")
    );

    if (criticalAlerts && criticalAlerts.length > 0) {
      // Store alerts in Redis for dashboard
      await redis.lpush("email:alerts:critical", ...criticalAlerts);
      await redis.ltrim("email:alerts:critical", 0, 99); // Keep last 100

      // Could trigger admin notification here
      console.error("[health-monitor] Critical alerts:", criticalAlerts);
    }

    // Update metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      healthy_providers: healthData.summary?.healthyProviders || 0,
      total_providers: healthData.summary?.totalProviders || 0,
      daily_quota_used: healthData.summary?.daily?.percentUsed || 0,
      monthly_quota_used: healthData.summary?.monthly?.percentUsed || 0,
      best_provider: healthData.summary?.bestProvider || null,
    };

    await redis.zadd("email:metrics:timeseries", {
      score: Date.now(),
      member: JSON.stringify(metrics),
    });

    // Keep only last 24 hours of metrics
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    await redis.zremrangebyscore("email:metrics:timeseries", 0, oneDayAgo);

    return NextResponse.json({
      success: true,
      message: "Health monitor completed",
      metrics,
      alerts: criticalAlerts?.length || 0,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[health-monitor] Error:", error);

    // Cache the error state
    await redis.setex(
      "email:health:error",
      60,
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export const POST = verifySignatureAppRouter(handler);

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  return handler(req);
}
