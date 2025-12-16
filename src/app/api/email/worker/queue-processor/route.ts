/**
 * Email Queue Processor Worker
 * Invoked by QStash cron or manual trigger
 * Processes batches of queued emails with distributed locking
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { Redis } from "@upstash/redis";
import { createClient } from "@/lib/supabase/server";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const BATCH_SIZE = 100;
const CONCURRENCY = 10;
const LOCK_TTL = 300; // 5 minutes
const PROCESSING_TIMEOUT = 240000; // 4 minutes

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

async function processEmailBatch(
  emails: QueuedEmail[],
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const results = [];

  // Process in chunks for better concurrency
  for (let i = 0; i < emails.length; i += CONCURRENCY) {
    const chunk = emails.slice(i, i + CONCURRENCY);

    const chunkResults = await Promise.allSettled(
      chunk.map(async (email) => {
        try {
          // Call the email Edge Function
          const response = await fetch(
            `${process.env.SUPABASE_URL}/functions/v1/email`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                action: "send",
                to: email.recipient_email,
                subject: email.template_data.subject,
                html: email.template_data.html,
                text: email.template_data.text,
                from: email.template_data.from,
                fromName: email.template_data.fromName,
                provider: "resend", // Let the edge function decide the best provider
              }),
            }
          );

          const result = await response.json();

          if (result.success) {
            // Mark as completed
            await supabase
              .from("email_queue")
              .update({ status: "completed", updated_at: new Date().toISOString() })
              .eq("id", email.id);

            // Log success
            await supabase.from("email_logs").insert({
              recipient_email: email.recipient_email,
              email_type: email.email_type,
              subject: email.template_data.subject,
              provider: result.provider,
              provider_message_id: result.messageId,
              status: "sent",
              latency_ms: result.responseTime || 0,
            });

            return { id: email.id, success: true, provider: result.provider };
          } else {
            throw new Error(result.error || "Unknown error");
          }
        } catch (error) {
          // Retry logic
          const errorMessage = error instanceof Error ? error.message : "Unknown error";

          await supabase.rpc("retry_queued_email", {
            p_queue_id: email.id,
            p_error_message: errorMessage,
          });

          return { id: email.id, success: false, error: errorMessage };
        }
      })
    );

    results.push(...chunkResults);
  }

  return results;
}

async function handler(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Distributed locking to prevent concurrent processing
    const lockKey = "email:queue:lock";
    const lockValue = crypto.randomUUID();

    const acquired = await redis.set(lockKey, lockValue, {
      ex: LOCK_TTL,
      nx: true,
    });

    if (!acquired) {
      return NextResponse.json(
        {
          success: false,
          message: "Another worker is already processing the queue",
          skipped: true,
        },
        { status: 409 }
      );
    }

    try {
      const supabase = await createClient();

      // Get ready emails from queue
      const { data: emails, error } = await supabase.rpc("get_ready_emails", {
        p_limit: BATCH_SIZE,
      });

      if (error) {
        throw new Error(`Failed to fetch queue: ${error.message}`);
      }

      if (!emails || emails.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No emails to process",
          processed: 0,
          duration: Date.now() - startTime,
        });
      }

      // Process emails with timeout
      const processPromise = processEmailBatch(emails, supabase);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Processing timeout")), PROCESSING_TIMEOUT)
      );

      const results = await Promise.race([processPromise, timeoutPromise]);

      const successful = results.filter(
        (r: any) => r.status === "fulfilled" && r.value?.success
      ).length;
      const failed = results.length - successful;

      // Update cache stats
      await redis.hincrby("email:stats:daily", "processed", results.length);
      await redis.hincrby("email:stats:daily", "successful", successful);
      await redis.hincrby("email:stats:daily", "failed", failed);

      return NextResponse.json({
        success: true,
        message: "Queue processed",
        processed: results.length,
        successful,
        failed,
        duration: Date.now() - startTime,
      });
    } finally {
      // Release lock
      const current = await redis.get(lockKey);
      if (current === lockValue) {
        await redis.del(lockKey);
      }
    }
  } catch (error) {
    console.error("[email-worker] Error:", error);

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

// Verify QStash signature for security
export const POST = verifySignatureAppRouter(handler);

// Allow manual triggering for testing
export async function GET(req: NextRequest) {
  // Only allow in development or with admin auth
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  return handler(req);
}
