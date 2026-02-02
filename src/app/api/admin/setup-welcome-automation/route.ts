/**
 * Setup Welcome Automation API Route
 * POST /api/admin/setup-welcome-automation
 *
 * Runs quickSetupWelcomeAutomation to seed templates and create/activate the flow.
 * Requires admin authentication.
 */

import { NextResponse } from "next/server";
import {
  quickSetupWelcomeAutomation,
  checkWelcomeAutomationStatus,
} from "@/app/actions/automations/setup-welcome-flow";

export async function POST() {
  try {
    const result = await quickSetupWelcomeAutomation();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Welcome automation setup complete",
        data: result.data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in setup-welcome-automation:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await checkWelcomeAutomationStatus();

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error checking status:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
