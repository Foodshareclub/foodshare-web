/**
 * Enterprise Health Management Dashboard
 * - View adaptive schedules
 * - Monitor cost savings
 * - Circuit breaker status
 * - Force health checks
 */

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    // Get all service health data
    const healthData = await redis.hgetall("health:services");
    const metrics = await redis.get("health:metrics");

    const services = Object.entries(healthData || {}).map(([_name, data]) => {
      const service = JSON.parse(data as string);
      const nextCheckIn = Math.max(
        0,
        Math.round((new Date(service.nextCheck).getTime() - Date.now()) / 60000)
      );

      return {
        ...service,
        nextCheckInMinutes: nextCheckIn,
        circuitBreakerActive: service.consecutiveFailures >= 3,
      };
    });

    const parsedMetrics = metrics
      ? JSON.parse(metrics as string)
      : {
          totalChecks: 0,
          successRate: 100,
          avgLatency: 0,
          costSavings: 0,
        };

    return NextResponse.json({
      services,
      metrics: {
        ...parsedMetrics,
        costSavingsFormatted: `$${parsedMetrics.costSavings.toFixed(4)}`,
        estimatedMonthlySavings: `$${(parsedMetrics.costSavings * 30).toFixed(2)}`,
      },
      summary: {
        totalServices: services.length,
        healthyServices: services.filter((s) => s.status === "healthy").length,
        circuitBreakersActive: services.filter((s) => s.circuitBreakerActive).length,
        adaptiveSchedulingEnabled: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action, service } = await request.json();

    switch (action) {
      case "force_check":
        // Reset next check time to force immediate check
        const healthData = await redis.hget("health:services", service);
        if (healthData) {
          const serviceData = JSON.parse(healthData as string);
          serviceData.nextCheck = new Date().toISOString();
          await redis.hset("health:services", service, JSON.stringify(serviceData));
        }
        return NextResponse.json({ success: true, message: `Forced check for ${service}` });

      case "reset_circuit_breaker":
        // Reset consecutive failures to reopen circuit breaker
        const circuitData = await redis.hget("health:services", service);
        if (circuitData) {
          const serviceData = JSON.parse(circuitData as string);
          serviceData.consecutiveFailures = 0;
          serviceData.nextCheck = new Date().toISOString();
          await redis.hset("health:services", service, JSON.stringify(serviceData));
        }
        return NextResponse.json({
          success: true,
          message: `Reset circuit breaker for ${service}`,
        });

      case "reset_metrics":
        await redis.del("health:metrics");
        return NextResponse.json({ success: true, message: "Metrics reset" });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
