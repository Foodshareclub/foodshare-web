/**
 * Supabase Edge Function: Process Email Queue
 *
 * This function processes queued emails with retry logic and exponential backoff.
 * It should be triggered via cron job every 5-15 minutes.
 *
 * Cron schedule suggestion: every 15 minutes
 *
 * ENHANCEMENTS:
 * - Supports all 3 email providers (Resend, Brevo, AWS SES)
 * - Intelligent provider selection based on health scores
 * - Rate limiting to prevent API violations
 * - Dead letter queue for permanent failures
 * - Comprehensive metrics tracking
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createAWSSESProvider, type AWSSESProvider } from "../_shared/aws-ses.ts";

// Types
interface QueuedEmail {
  id: string;
  recipient_id: string | null;
  recipient_email: string;
  email_type: string;
  template_name: string;
  template_data: Record<string, any>;
  attempts: number;
  max_attempts: number;
  status: string;
  last_error: string | null;
  next_retry_at: string;
  created_at: string;
}

interface ProcessResult {
  processed: number;
  successful: number;
  failed: number;
  rate_limited: number;
  moved_to_dlq: number;
  errors: Array<{ id: string; error: string }>;
}

interface ProviderConfig {
  resend?: any;
  brevoApiKey?: string;
  awsSes?: AWSSESProvider;
}

// Initialize clients
function initializeClients() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Initialize email providers
  const providers: ProviderConfig = {};

  // Resend
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (resendApiKey) {
    providers.resend = new Resend(resendApiKey);
  }

  // Brevo
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  if (brevoApiKey) {
    providers.brevoApiKey = brevoApiKey;
  }

  // AWS SES - Properly implemented with SigV4 authentication
  const awsSes = createAWSSESProvider();
  if (awsSes && awsSes.isConfigured()) {
    providers.awsSes = awsSes;
    console.log("[AWS SES] Provider initialized successfully");
  } else {
    console.log("[AWS SES] Not configured - skipping");
  }

  return { supabase, providers };
}

// Get provider based on health score and availability
async function selectProviderWithHealth(
  supabase: any,
  emailType: string
): Promise<{ provider: string; health_score: number } | null> {
  try {
    // Use the new health-based selection function
    const { data, error } = await supabase.rpc("get_healthiest_provider", {
      p_email_type: emailType,
    });

    if (error || !data || data.length === 0) {
      console.warn("Health-based selection failed, falling back to quota-based");
      return await selectProviderByQuota(supabase, emailType);
    }

    return {
      provider: data[0].provider,
      health_score: data[0].health_score,
    };
  } catch (error) {
    console.error("Error in health-based selection:", error);
    return await selectProviderByQuota(supabase, emailType);
  }
}

// Fallback: Get provider based on quota availability
async function selectProviderByQuota(
  supabase: any,
  emailType: string
): Promise<{ provider: string; health_score: number } | null> {
  const today = new Date().toISOString().split("T")[0];

  const { data: quotas } = await supabase
    .from("email_provider_quota")
    .select("*")
    .eq("date", today);

  // Provider priority based on email type
  const priority =
    emailType === "auth" ? ["resend", "brevo", "aws_ses"] : ["brevo", "aws_ses", "resend"];

  // Find first available provider
  for (const provider of priority) {
    const quota = quotas?.find((q: any) => q.provider === provider);
    if (!quota || quota.emails_sent < quota.daily_limit) {
      return { provider, health_score: 50 }; // Default health score
    }
  }

  return null; // All providers exhausted
}

// Check rate limit before sending
async function checkRateLimit(supabase: any, provider: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_provider_rate_limit", {
      p_provider: provider,
      p_max_per_minute: 10,
    });

    if (error) {
      console.warn("Rate limit check failed:", error);
      return true; // Allow on error
    }

    return data === true;
  } catch (error) {
    console.warn("Rate limit check error:", error);
    return true; // Allow on error
  }
}

// Send email using Resend
async function sendWithResend(
  resend: any,
  email: QueuedEmail
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { template_data } = email;

  try {
    const result = await resend.emails.send({
      from: template_data.from || "noreply@foodshare.app",
      to: email.recipient_email,
      subject: template_data.subject || "FoodShare Notification",
      html: template_data.html || template_data.message || "Notification from FoodShare",
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Send email using Brevo
async function sendWithBrevo(
  apiKey: string,
  email: QueuedEmail
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { template_data } = email;

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
          email: template_data.from || "noreply@foodshare.app",
          name: template_data.fromName || "FoodShare",
        },
        to: [{ email: email.recipient_email }],
        subject: template_data.subject || "FoodShare Notification",
        htmlContent: template_data.html || template_data.message || "Notification from FoodShare",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || `Brevo API error: ${response.status}`,
      };
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Send email using AWS SES
async function sendWithAWSSES(
  awsSes: AWSSESProvider,
  email: QueuedEmail
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { template_data } = email;

  try {
    const result = await awsSes.sendEmail({
      to: email.recipient_email,
      subject: template_data.subject || "FoodShare Notification",
      html: template_data.html || template_data.message || "Notification from FoodShare",
      text: template_data.text,
      replyTo: template_data.replyTo,
    });

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Send email using selected provider
async function sendEmail(
  provider: string,
  email: QueuedEmail,
  providers: ProviderConfig
): Promise<{ success: boolean; messageId?: string; error?: string; latency: number }> {
  const startTime = Date.now();

  try {
    let result;

    switch (provider) {
      case "resend":
        if (!providers.resend) {
          return {
            success: false,
            error: "Resend not configured",
            latency: Date.now() - startTime,
          };
        }
        result = await sendWithResend(providers.resend, email);
        break;

      case "brevo":
        if (!providers.brevoApiKey) {
          return {
            success: false,
            error: "Brevo not configured",
            latency: Date.now() - startTime,
          };
        }
        result = await sendWithBrevo(providers.brevoApiKey, email);
        break;

      case "aws_ses":
        if (!providers.awsSes) {
          return {
            success: false,
            error: "AWS SES not configured",
            latency: Date.now() - startTime,
          };
        }
        result = await sendWithAWSSES(providers.awsSes, email);
        break;

      default:
        return {
          success: false,
          error: "Unknown provider",
          latency: Date.now() - startTime,
        };
    }

    return {
      ...result,
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latency: Date.now() - startTime,
    };
  }
}

// Process a single queued email
async function processQueuedEmail(
  email: QueuedEmail,
  clients: { supabase: any; providers: ProviderConfig }
): Promise<{ success: boolean; error?: string; rateLimited?: boolean; movedToDLQ?: boolean }> {
  const { supabase, providers } = clients;

  try {
    // Select provider using health scores
    const providerSelection = await selectProviderWithHealth(supabase, email.email_type);

    if (!providerSelection) {
      // All providers exhausted - check if should move to DLQ
      if (email.attempts >= email.max_attempts) {
        await supabase.rpc("move_to_dead_letter_queue", {
          p_queue_id: email.id,
          p_failure_reason: "All providers exhausted after max attempts",
        });
        return { success: false, error: "Moved to DLQ", movedToDLQ: true };
      }

      return {
        success: false,
        error: "All email providers have reached their daily quota",
      };
    }

    const { provider } = providerSelection;

    // Check rate limit
    const rateLimitOk = await checkRateLimit(supabase, provider);
    if (!rateLimitOk) {
      console.log(`Rate limit exceeded for ${provider}, skipping email ${email.id}`);
      return {
        success: false,
        error: "Rate limit exceeded",
        rateLimited: true,
      };
    }

    // Send email
    const result = await sendEmail(provider, email, providers);

    if (result.success) {
      // Mark as completed
      await supabase
        .from("email_queue")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", email.id);

      // Increment provider quota
      await supabase.rpc("increment_provider_quota", {
        p_provider: provider,
        p_date: new Date().toISOString().split("T")[0],
      });

      // Record success metrics
      await supabase.rpc("record_provider_metrics", {
        p_provider: provider,
        p_success: true,
        p_latency_ms: result.latency,
        p_error: null,
      });

      // Log successful send
      await supabase.from("email_logs").insert({
        recipient_id: email.recipient_id,
        recipient_email: email.recipient_email,
        email_type: email.email_type,
        subject: email.template_data.subject || "FoodShare Notification",
        provider: provider,
        provider_message_id: result.messageId,
        status: "sent",
        template_data: email.template_data,
      });

      return { success: true };
    } else {
      // Record failure metrics
      await supabase.rpc("record_provider_metrics", {
        p_provider: provider,
        p_success: false,
        p_latency_ms: result.latency,
        p_error: result.error || "Unknown error",
      });

      // Check if should move to DLQ
      if (email.attempts + 1 >= email.max_attempts) {
        await supabase.rpc("move_to_dead_letter_queue", {
          p_queue_id: email.id,
          p_failure_reason: `Failed after ${email.max_attempts} attempts: ${result.error}`,
        });
        return { success: false, error: "Moved to DLQ", movedToDLQ: true };
      }

      // Handle failure - retry
      await supabase.rpc("retry_queued_email", {
        p_queue_id: email.id,
        p_error_message: result.error || "Unknown error",
      });

      return { success: false, error: result.error };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if should move to DLQ
    if (email.attempts + 1 >= email.max_attempts) {
      await supabase.rpc("move_to_dead_letter_queue", {
        p_queue_id: email.id,
        p_failure_reason: `Failed after ${email.max_attempts} attempts: ${errorMessage}`,
      });
      return { success: false, error: "Moved to DLQ", movedToDLQ: true };
    }

    // Update with error
    await supabase.rpc("retry_queued_email", {
      p_queue_id: email.id,
      p_error_message: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

// Main handler
serve(async (req) => {
  // Verify authorization - accept CRON_SECRET or service role key
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Check if authorization is valid
  const validCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const validServiceAuth = serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;

  if (cronSecret && !validCronAuth && !validServiceAuth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const clients = initializeClients();
    const { supabase } = clients;

    // Get emails ready for processing
    const { data: queuedEmails, error: fetchError } = await supabase.rpc("get_ready_emails", {
      p_limit: 50,
    });

    if (fetchError) {
      throw fetchError;
    }

    if (!queuedEmails || queuedEmails.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No emails to process",
          processed: 0,
          successful: 0,
          failed: 0,
          rate_limited: 0,
          moved_to_dlq: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Process each email
    const result: ProcessResult = {
      processed: queuedEmails.length,
      successful: 0,
      failed: 0,
      rate_limited: 0,
      moved_to_dlq: 0,
      errors: [],
    };

    for (const email of queuedEmails) {
      const processResult = await processQueuedEmail(email, clients);

      if (processResult.success) {
        result.successful++;
      } else if (processResult.rateLimited) {
        result.rate_limited++;
      } else if (processResult.movedToDLQ) {
        result.moved_to_dlq++;
      } else {
        result.failed++;
        result.errors.push({
          id: email.id,
          error: processResult.error || "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Email queue processed",
        ...result,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Queue processing error:", error);

    return new Response(
      JSON.stringify({
        error: "Queue processing failed",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
