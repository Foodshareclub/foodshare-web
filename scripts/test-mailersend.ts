/**
 * Test script for MailerSend email provider
 * Tests sending a simple email through MailerSend
 *
 * Usage: bun scripts/test-mailersend.ts
 */

// Load environment variables
import { resolve } from "bun:path";
import { config } from "dotenv";

// Load .env.local first (higher priority), then .env
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { createUnifiedEmailService } from "@/lib/email/unified-service";

async function testMailerSend() {
  console.log("🧪 Testing MailerSend Integration\n");

  try {
    // Create unified email service
    console.log("📧 Creating email service...");
    const emailService = await createUnifiedEmailService();

    // Check which providers are configured
    console.log("🔍 Checking configured providers...");
    const { getConfiguredProviders } = await import("@/lib/email/vault");
    const providers = await getConfiguredProviders();
    console.log("Configured providers:", {
      resend: providers.resend ? "✅" : "❌",
      brevo: providers.brevo ? "✅" : "❌",
      mailersend: providers.mailersend ? "✅" : "❌",
      awsSes: providers.awsSes ? "✅" : "❌",
    });
    console.log("");

    if (!providers.mailersend) {
      console.error("❌ MailerSend is not configured!");
      console.error("   Set MAILERSEND_API_KEY in Supabase Vault or .env.local");
      process.exit(1);
    }

    // Verify TEST_EMAIL is set
    if (!process.env.TEST_EMAIL) {
      console.error("❌ TEST_EMAIL environment variable is not set!");
      console.error("   Set TEST_EMAIL in .env.local");
      process.exit(1);
    }

    // Test email request
    // Note: The unified service will select the best provider based on emailType and health
    // For "newsletter" type, MailerSend is prioritized in the routing
    const testEmail = {
      content: {
        subject: "MailerSend Test Email - FoodShare",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981;">MailerSend Integration Test</h1>
            <p>This is a test email sent from the FoodShare application.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Test Details</h2>
              <ul style="list-style: none; padding: 0;">
                <li>✅ Email Type: Newsletter (MailerSend prioritized)</li>
                <li>✅ Timestamp: ${new Date().toISOString()}</li>
              </ul>
            </div>
            <p style="color: #6b7280;">
              If you're seeing this email, the email system is working correctly!
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #9ca3af;">
              Sent from FoodShare Email Testing System
            </p>
          </div>
        `,
        text: `MailerSend Integration Test\n\nThis is a test email sent from the FoodShare application.\n\nTest Details:\n- Email Type: Newsletter (MailerSend prioritized)\n- Timestamp: ${new Date().toISOString()}\n\nIf you're seeing this email, the email system is working correctly!`,
      },
      options: {
        to: {
          email: process.env.TEST_EMAIL!,
          name: "Test User",
        },
      },
      emailType: "newsletter" as const, // Newsletter type prioritizes MailerSend
    };

    console.log("📤 Sending test email to:", testEmail.options.to.email);
    console.log("📝 Subject:", testEmail.content.subject);
    console.log("");

    // Send the email
    const result = await emailService.sendEmail(testEmail);

    if (result.success) {
      console.log("✅ SUCCESS! Email sent via MailerSend");
      console.log("📬 Message ID:", result.messageId);
      console.log("🔧 Provider used:", result.provider);
      console.log("");
      console.log("🎉 MailerSend integration is working correctly!");
    } else {
      console.error("❌ FAILED to send email");
      console.error("Error:", result.error);
      if (result.suppressed) {
        console.error("⚠️  Email address is on suppression list");
      }
    }
  } catch (error) {
    console.error("❌ TEST FAILED with exception:");
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testMailerSend()
  .then(() => {
    console.log("\n✨ Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Test failed:", error);
    process.exit(1);
  });
