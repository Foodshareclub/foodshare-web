/**
 * Sentry Test API Route
 * Endpoint for testing Sentry error reporting in development
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import type { ApiResponse } from "@/lib/api-types";

export async function GET(): Promise<NextResponse<ApiResponse<{ sent: boolean }>>> {
  try {
    Sentry.captureMessage("Sentry test message from foodshare-web!");
    return NextResponse.json({ success: true, data: { sent: true } }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
