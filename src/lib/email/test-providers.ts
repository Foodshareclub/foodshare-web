/**
 * Email Provider Test Utility
 * Tests all 3 providers end-to-end with the new Brevo SDK
 */

import { ResendProvider } from "./providers/resend";
import { BrevoProvider } from "./providers/brevo";
import { AWSSESProvider } from "./providers/aws-ses";
import type { SendEmailRequest } from "./types";
import { createLogger } from "@/lib/logger";

const logger = createLogger("EmailProviderTest");

// Load from environment
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "us-west-2";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";

export interface ProviderTestResult {
  provider: string;
  success: boolean;
  messageId?: string;
  latency: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface TestSuiteResults {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  results: ProviderTestResult[];
  summary: string;
}

/**
 * Test Resend provider
 */
export async function testResend(
  recipientEmail: string,
  fromEmail: string = "noreply@foodshare.app"
): Promise<ProviderTestResult> {
  const startTime = Date.now();

  try {
    if (!RESEND_API_KEY) {
      throw new Error("VITE_RESEND_API_KEY not configured");
    }

    const provider = new ResendProvider({
      apiKey: RESEND_API_KEY,
      fromEmail: fromEmail,
      fromName: "FoodShare Test",
    });

    const request: SendEmailRequest = {
      emailType: "auth",
      content: {
        subject: "[TEST] Resend Provider Verification",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">✅ Resend Provider Test</h2>
            <p>This is a test email sent via the <strong>Resend</strong> provider to verify integration.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Provider:</strong> Resend</p>
              <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
              <p><strong>SDK:</strong> resend@latest</p>
            </div>
            <p style="color: #666; font-size: 12px;">
              This is an automated test email. No action required.
            </p>
          </div>
        `,
        text: "Resend Provider Test - Email system verification successful",
      },
      options: {
        from: { email: fromEmail, name: "FoodShare Test" },
        to: { email: recipientEmail },
        replyTo: { email: fromEmail },
      },
    };

    const response = await provider.sendEmail(request);
    const latency = Date.now() - startTime;

    return {
      provider: "resend",
      success: response.success,
      messageId: response.messageId,
      latency,
      error: response.error,
      details: response,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      provider: "resend",
      success: false,
      latency,
      error: error instanceof Error ? error.message : "Unknown error",
      details: { error },
    };
  }
}

/**
 * Test Brevo provider (NEW SDK - CRITICAL TEST)
 */
export async function testBrevo(
  recipientEmail: string,
  fromEmail: string = "noreply@foodshare.club"
): Promise<ProviderTestResult> {
  const startTime = Date.now();

  try {
    if (!BREVO_API_KEY) {
      throw new Error("VITE_BREVO_API_KEY not configured");
    }

    const provider = new BrevoProvider({
      apiKey: BREVO_API_KEY,
      fromEmail: fromEmail,
      fromName: "FoodShare Test",
    });

    const request: SendEmailRequest = {
      emailType: "chat",
      content: {
        subject: "[TEST] Brevo Provider Verification (NEW SDK)",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066FF;">✅ Brevo Provider Test (NEW SDK)</h2>
            <p>This is a <strong>critical test</strong> of the newly migrated <code>@getbrevo/brevo@3.0.1</code> SDK.</p>
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p><strong>⚠️ Migration Alert</strong></p>
              <p>Migrated from deprecated <code>@sendinblue/client</code> (2 critical vulnerabilities)</p>
              <p>New SDK: <code>@getbrevo/brevo@3.0.1</code></p>
            </div>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Provider:</strong> Brevo (formerly Sendinblue)</p>
              <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
              <p><strong>SDK Version:</strong> 3.0.1</p>
              <p><strong>Capacity:</strong> 300 emails/day</p>
            </div>
            <p style="color: #666; font-size: 12px;">
              This is an automated test email to verify the new SDK integration.
            </p>
          </div>
        `,
        text: "Brevo Provider Test (NEW SDK) - Email system verification successful",
      },
      options: {
        from: { email: fromEmail, name: "FoodShare Test" },
        to: { email: recipientEmail },
        replyTo: { email: fromEmail },
      },
    };

    const response = await provider.sendEmail(request);
    const latency = Date.now() - startTime;

    return {
      provider: "brevo",
      success: response.success,
      messageId: response.messageId,
      latency,
      error: response.error,
      details: response,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      provider: "brevo",
      success: false,
      latency,
      error: error instanceof Error ? error.message : "Unknown error",
      details: { error },
    };
  }
}

/**
 * Test AWS SES provider
 */
export async function testAWSSES(
  recipientEmail: string,
  fromEmail: string = "noreply@foodshare.app"
): Promise<ProviderTestResult> {
  const startTime = Date.now();

  try {
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        "AWS credentials not configured (VITE_AWS_ACCESS_KEY_ID, VITE_AWS_SECRET_ACCESS_KEY)"
      );
    }

    const provider = new AWSSESProvider({
      apiKey: "", // Not used for AWS SES
      fromEmail: fromEmail,
      fromName: "FoodShare Test",
      region: AWS_REGION,
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    });

    const request: SendEmailRequest = {
      emailType: "feedback",
      content: {
        subject: "[TEST] AWS SES Provider Verification",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF9900;">✅ AWS SES Provider Test</h2>
            <p>This is a test email sent via <strong>Amazon SES</strong> provider.</p>
            <div style="background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Provider:</strong> AWS SES</p>
              <p><strong>Region:</strong> ${AWS_REGION}</p>
              <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
              <p><strong>Tier:</strong> Sandbox (100 emails/day)</p>
            </div>
            <div style="background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0;">
              <p><strong>ℹ️ Note:</strong> AWS SES Edge Function support incomplete</p>
              <p>This test uses client-side SDK only.</p>
            </div>
            <p style="color: #666; font-size: 12px;">
              This is an automated test email. No action required.
            </p>
          </div>
        `,
        text: "AWS SES Provider Test - Email system verification successful",
      },
      options: {
        from: { email: fromEmail, name: "FoodShare Test" },
        to: { email: recipientEmail },
        replyTo: { email: fromEmail },
      },
    };

    const response = await provider.sendEmail(request);
    const latency = Date.now() - startTime;

    return {
      provider: "aws_ses",
      success: response.success,
      messageId: response.messageId,
      latency,
      error: response.error,
      details: response,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      provider: "aws_ses",
      success: false,
      latency,
      error: error instanceof Error ? error.message : "Unknown error",
      details: { error },
    };
  }
}

/**
 * Run comprehensive test suite for all providers
 */
export async function runEmailProviderTests(recipientEmail: string): Promise<TestSuiteResults> {
  logger.info("🧪 Starting Email Provider Test Suite...");
  logger.info(`📧 Recipient: ${recipientEmail}`);
  logger.info(`⏰ Start Time: ${new Date().toISOString()}\n`);

  const results: ProviderTestResult[] = [];

  // Test Resend
  logger.info("Testing Resend...");
  const resendResult = await testResend(recipientEmail);
  results.push(resendResult);
  logger.info(
    resendResult.success
      ? `✅ Resend: SUCCESS (${resendResult.latency}ms) - Message ID: ${resendResult.messageId}`
      : `❌ Resend: FAILED - ${resendResult.error}`
  );

  // Test Brevo (CRITICAL - new SDK)
  logger.info("\nTesting Brevo (NEW SDK - CRITICAL)...");
  const brevoResult = await testBrevo(recipientEmail);
  results.push(brevoResult);
  logger.info(
    brevoResult.success
      ? `✅ Brevo: SUCCESS (${brevoResult.latency}ms) - Message ID: ${brevoResult.messageId}`
      : `❌ Brevo: FAILED - ${brevoResult.error}`
  );

  // Test AWS SES
  logger.info("\nTesting AWS SES...");
  const awsResult = await testAWSSES(recipientEmail);
  results.push(awsResult);
  logger.info(
    awsResult.success
      ? `✅ AWS SES: SUCCESS (${awsResult.latency}ms) - Message ID: ${awsResult.messageId}`
      : `❌ AWS SES: FAILED - ${awsResult.error}`
  );

  // Calculate summary
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => r.success).length;

  const summary = `
╔═══════════════════════════════════════════════════════════════╗
║           EMAIL PROVIDER TEST SUITE RESULTS                   ║
╠═══════════════════════════════════════════════════════════════╣
║ Total Tests:  ${results.length}                                              ║
║ Passed:       ${passed} ✅                                              ║
║ Failed:       ${failed} ${failed > 0 ? "❌" : "  "}                                              ║
║                                                               ║
║ Provider Results:                                             ║
║ • Resend:     ${resendResult.success ? "✅ PASS" : "❌ FAIL"} (${resendResult.latency}ms)                      ║
║ • Brevo:      ${brevoResult.success ? "✅ PASS" : "❌ FAIL"} (${brevoResult.latency}ms) [NEW SDK]           ║
║ • AWS SES:    ${awsResult.success ? "✅ PASS" : "❌ FAIL"} (${awsResult.latency}ms)                      ║
╚═══════════════════════════════════════════════════════════════╝
  `.trim();

  logger.info(`\n${summary}\n`);

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed,
    failed,
    results,
    summary,
  };
}

/**
 * Quick health check for all providers (no emails sent)
 */
export async function checkProviderHealth() {
  const checks = {
    resend: {
      configured: !!RESEND_API_KEY,
      apiKey: RESEND_API_KEY ? "✅ Set" : "❌ Missing",
    },
    brevo: {
      configured: !!BREVO_API_KEY,
      apiKey: BREVO_API_KEY ? "✅ Set" : "❌ Missing",
    },
    aws_ses: {
      configured: !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY),
      accessKeyId: AWS_ACCESS_KEY_ID ? "✅ Set" : "❌ Missing",
      secretAccessKey: AWS_SECRET_ACCESS_KEY ? "✅ Set" : "❌ Missing",
      region: AWS_REGION || "❌ Not set",
    },
  };

  logger.info("🔍 Email Provider Configuration Check:\n");
  logger.info("Resend:", checks.resend);
  logger.info("Brevo:", checks.brevo);
  logger.info("AWS SES:", checks.aws_ses);

  return checks;
}
