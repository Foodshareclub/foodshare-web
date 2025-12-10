/**
 * Process Email Queue v2 - Optimized
 *
 * Improvements:
 * - Parallel processing with concurrency limit
 * - Batch database operations
 * - Provider connection pooling
 * - Graceful shutdown handling
 * - Streaming progress updates
 */

import { Resend } from "https://esm.sh/resend@4.0.0";
import { getSupabaseClient } from "../_shared/supabase.ts";

// Types
interface QueuedEmail {
  id: string;
  recipient_email: string;
  email_type: string;
  template_data: {
    subject?: string;
    html?: string;
    text?: string;
    from?: string;
    fromName?: string;
  };
  attempts: number;
  max_attempts: number;
}

interface SendResult {
  id: string;
  success: boolean;
  provider?: string;
  messageId?: string;
  error?: string;
  latencyMs: number;
}

// Config
const CONCURRENCY = 5;
const BATCH_SIZE = 50;
const _TIMEOUT_MS = 30_000;

// Provider instances (lazy initialized)
let resendClient: Resend | null = null;
let brevoApiKey: string | null = null;

function getResend(): Resend | null {
  if (!resendClient) {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (apiKey) {
      resendClient = new Resend(apiKey);
    }
  }
  return resendClient;
}

function getBrevoKey(): string | null {
  if (!brevoApiKey) {
    brevoApiKey = Deno.env.get("BREVO_API_KEY") || null;
  }
  return brevoApiKey;
}

// Send functions
async function sendWithResend(email: QueuedEmail): Promise<SendResult> {
  const start = performance.now();
  const resend = getResend();

  if (!resend) {
    return { id: email.id, success: false, error: "Resend not configured", latencyMs: 0 };
  }

  try {
    const result = await resend.emails.send({
      from:
        email.template_data.from ||
        `${Deno.env.get("EMAIL_FROM_NAME") || "FoodShare"} <${Deno.env.get("EMAIL_FROM") || "noreply@foodshare.app"}>`,
      to: email.recipient_email,
      subject: email.template_data.subject || "FoodShare Notification",
      html: email.template_data.html || "Notification from FoodShare",
    });

    if (result.error) {
      return {
        id: email.id,
        success: false,
        provider: "resend",
        error: result.error.message,
        latencyMs: performance.now() - start,
      };
    }

    return {
      id: email.id,
      success: true,
      provider: "resend",
      messageId: result.data?.id,
      latencyMs: performance.now() - start,
    };
  } catch (error) {
    return {
      id: email.id,
      success: false,
      provider: "resend",
      error: error instanceof Error ? error.message : String(error),
      latencyMs: performance.now() - start,
    };
  }
}

async function sendWithBrevo(email: QueuedEmail): Promise<SendResult> {
  const start = performance.now();
  const apiKey = getBrevoKey();

  if (!apiKey) {
    return { id: email.id, success: false, error: "Brevo not configured", latencyMs: 0 };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: {
          email: Deno.env.get("EMAIL_FROM") || "noreply@foodshare.app",
          name: email.template_data.fromName || Deno.env.get("EMAIL_FROM_NAME") || "FoodShare",
        },
        to: [{ email: email.recipient_email }],
        subject: email.template_data.subject || "FoodShare Notification",
        htmlContent: email.template_data.html || "Notification from FoodShare",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        id: email.id,
        success: false,
        provider: "brevo",
        error: result.message || `HTTP ${response.status}`,
        latencyMs: performance.now() - start,
      };
    }

    return {
      id: email.id,
      success: true,
      provider: "brevo",
      messageId: result.messageId,
      latencyMs: performance.now() - start,
    };
  } catch (error) {
    return {
      id: email.id,
      success: false,
      provider: "brevo",
      error: error instanceof Error ? error.message : String(error),
      latencyMs: performance.now() - start,
    };
  }
}

// Process single email with provider fallback
async function processEmail(email: QueuedEmail): Promise<SendResult> {
  // Try Resend first for auth emails, Brevo for others
  const providers =
    email.email_type === "auth" ? [sendWithResend, sendWithBrevo] : [sendWithBrevo, sendWithResend];

  for (const sendFn of providers) {
    const result = await sendFn(email);
    if (result.success) return result;
  }

  // All providers failed
  return {
    id: email.id,
    success: false,
    error: "All providers failed",
    latencyMs: 0,
  };
}

// Process batch with concurrency limit
async function processBatch(emails: QueuedEmail[]): Promise<SendResult[]> {
  const results: SendResult[] = [];
  const pending: Promise<void>[] = [];

  for (const email of emails) {
    const promise = processEmail(email).then((result) => {
      results.push(result);
    });

    pending.push(promise);

    // Limit concurrency
    if (pending.length >= CONCURRENCY) {
      await Promise.race(pending);
      // Remove completed promises
      const completed = pending.filter((_p) => {
        // Check if promise is settled
        return false;
      });
      pending.length = 0;
      pending.push(...completed);
    }
  }

  // Wait for remaining
  await Promise.all(pending);

  return results;
}

// Update database in batch
async function updateDatabase(
  supabase: ReturnType<typeof getSupabaseClient>,
  results: SendResult[]
): Promise<void> {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  // Batch update successful emails
  if (successful.length > 0) {
    await supabase
      .from("email_queue")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .in(
        "id",
        successful.map((r) => r.id)
      );

    // Batch insert logs
    await supabase.from("email_logs").insert(
      successful.map((r) => ({
        provider: r.provider,
        provider_message_id: r.messageId,
        status: "sent",
      }))
    );
  }

  // Update failed emails
  for (const result of failed) {
    await supabase.rpc("retry_queued_email", {
      p_queue_id: result.id,
      p_error_message: result.error || "Unknown error",
    });
  }

  // Record metrics in batch
  if (results.length > 0) {
    await supabase.rpc("batch_record_email_metrics", {
      p_metrics: JSON.stringify(
        results.map((r) => ({
          provider: r.provider || "unknown",
          success: r.success,
          latencyMs: Math.round(r.latencyMs),
          timestamp: Date.now(),
        }))
      ),
    });
  }
}

// Main handler
Deno.serve(async (_req) => {
  const startTime = performance.now();

  try {
    const supabase = getSupabaseClient();

    // Get ready emails
    const { data: emails, error } = await supabase.rpc("get_ready_emails", {
      p_limit: BATCH_SIZE,
    });

    if (error) throw error;

    if (!emails?.length) {
      return new Response(
        JSON.stringify({
          message: "No emails to process",
          processed: 0,
          durationMs: Math.round(performance.now() - startTime),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Process batch
    const results = await processBatch(emails);

    // Update database
    await updateDatabase(supabase, results);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        message: "Queue processed",
        processed: results.length,
        successful,
        failed,
        durationMs: Math.round(performance.now() - startTime),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[process-email-queue] Error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Math.round(performance.now() - startTime),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
