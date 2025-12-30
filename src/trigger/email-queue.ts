/**
 * Email Queue Task
 *
 * Handles async email sending via Trigger.dev
 * Replaces synchronous email sending in Server Actions
 */

import { task } from "@trigger.dev/sdk/v3";
import type { EmailType } from "@/lib/email/types";

// ============================================================================
// Types
// ============================================================================

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  emailType?: EmailType;
  // For backward compatibility with template-based calls
  template?: string;
  data?: Record<string, unknown>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
}

// ============================================================================
// Send Email Task
// ============================================================================

/**
 * Async email sending task
 *
 * @example
 * // In a Server Action:
 * import { sendEmailTask } from "@/trigger/email-queue";
 *
 * await sendEmailTask.trigger({
 *   to: "user@example.com",
 *   subject: "Welcome to FoodShare!",
 *   template: "welcome",
 *   data: { name: "John" },
 * });
 */
export const sendEmailTask = task({
  id: "send-email",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  run: async (payload: SendEmailPayload): Promise<SendEmailResult> => {
    // Dynamic import to avoid bundling issues
    const { createUnifiedEmailService } = await import("@/lib/email/unified-service");

    try {
      const emailService = await createUnifiedEmailService();

      const result = await emailService.sendEmail({
        content: {
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        },
        options: {
          to: { email: payload.to },
          from: {
            email: process.env.EMAIL_FROM || "contact@foodshare.club",
            name: process.env.EMAIL_FROM_NAME || "FoodShare",
          },
        },
        emailType: payload.emailType || "newsletter",
      });

      return {
        success: result.success,
        messageId: result.messageId,
        provider: result.provider,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[sendEmailTask] Failed:", message);

      return {
        success: false,
        error: message,
      };
    }
  },
});

// ============================================================================
// Batch Email Task
// ============================================================================

export interface BatchEmailPayload {
  emails: SendEmailPayload[];
  // Max concurrent sends
  concurrency?: number;
}

export interface BatchEmailResult {
  total: number;
  successful: number;
  failed: number;
  results: SendEmailResult[];
}

/**
 * Batch email sending task for campaigns
 * Processes emails in batches with concurrency control
 */
export const batchEmailTask = task({
  id: "batch-email",
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: BatchEmailPayload): Promise<BatchEmailResult> => {
    const { emails, concurrency = 5 } = payload;
    const results: SendEmailResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < emails.length; i += concurrency) {
      const batch = emails.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(async (email) => {
          const result = await sendEmailTask.triggerAndWait(email);
          if (result.ok) {
            return result.output;
          }
          throw new Error(String(result.error));
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled" && result.value.success) {
          successful++;
          results.push(result.value);
        } else {
          failed++;
          const errorMsg =
            result.status === "rejected"
              ? String(result.reason)
              : result.value?.error || "Unknown error";
          results.push({
            success: false,
            error: errorMsg,
          });
        }
      }
    }

    return {
      total: emails.length,
      successful,
      failed,
      results,
    };
  },
});
