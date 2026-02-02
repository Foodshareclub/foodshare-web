/**
 * Setup QStash Schedule for Upstash Keep-Warm
 *
 * Creates a QStash schedule to ping all Upstash services every 5 minutes.
 * This bypasses Vercel Hobby plan's daily cron limitation.
 *
 * Run once to set up, then the schedule runs automatically.
 *
 * Usage:
 *   curl -X POST https://your-app.vercel.app/api/health/upstash/setup-schedule \
 *     -H "Authorization: Bearer YOUR_CRON_SECRET"
 */

import { NextResponse } from "next/server";
import { Client as QStashClient } from "@upstash/qstash";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const SCHEDULE_ID = "upstash-keep-warm";

function verifyAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

export async function POST(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const qstash = new QStashClient({
    token: process.env.QSTASH_TOKEN!,
  });

  // Get the base URL for the health endpoint
  const url = new URL(request.url);
  const healthEndpoint = `${url.origin}/api/health/upstash`;

  try {
    // Check if schedule already exists
    const existingSchedules = await qstash.schedules.list();
    const existingSchedule = existingSchedules.find((s) =>
      s.scheduleId?.includes(SCHEDULE_ID)
    );

    if (existingSchedule) {
      return NextResponse.json({
        success: true,
        message: "Schedule already exists",
        scheduleId: existingSchedule.scheduleId,
        cron: existingSchedule.cron,
        destination: existingSchedule.destination,
      });
    }

    // Create new schedule - every 5 minutes
    const schedule = await qstash.schedules.create({
      destination: healthEndpoint,
      cron: "*/5 * * * *", // Every 5 minutes
      scheduleId: SCHEDULE_ID,
      retries: 3,
    });

    console.log("[QStash Schedule Created]", {
      scheduleId: schedule.scheduleId,
      destination: healthEndpoint,
      cron: "*/5 * * * *",
    });

    return NextResponse.json({
      success: true,
      message: "Schedule created successfully",
      scheduleId: schedule.scheduleId,
      cron: "*/5 * * * *",
      destination: healthEndpoint,
    });
  } catch (error) {
    console.error("[QStash Schedule Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const qstash = new QStashClient({
    token: process.env.QSTASH_TOKEN!,
  });

  try {
    const schedules = await qstash.schedules.list();
    const keepWarmSchedule = schedules.find(
      (s) =>
        s.scheduleId?.includes(SCHEDULE_ID) ||
        s.destination?.includes("/api/health/upstash")
    );

    if (keepWarmSchedule) {
      return NextResponse.json({
        exists: true,
        scheduleId: keepWarmSchedule.scheduleId,
        cron: keepWarmSchedule.cron,
        destination: keepWarmSchedule.destination,
        isPaused: keepWarmSchedule.isPaused,
      });
    }

    return NextResponse.json({
      exists: false,
      message: "No keep-warm schedule found. POST to this endpoint to create one.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const qstash = new QStashClient({
    token: process.env.QSTASH_TOKEN!,
  });

  try {
    const schedules = await qstash.schedules.list();
    const keepWarmSchedule = schedules.find(
      (s) =>
        s.scheduleId?.includes(SCHEDULE_ID) ||
        s.destination?.includes("/api/health/upstash")
    );

    if (keepWarmSchedule && keepWarmSchedule.scheduleId) {
      await qstash.schedules.delete(keepWarmSchedule.scheduleId);
      return NextResponse.json({
        success: true,
        message: "Schedule deleted",
        scheduleId: keepWarmSchedule.scheduleId,
      });
    }

    return NextResponse.json({
      success: false,
      message: "No schedule found to delete",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
