/**
 * Attempts before a queued email is abandoned.
 *
 * Matches `mark_email_as_failed`, which gives up once `retry_count >= 2`.
 * The old claim filtered `retry_count < 3`, but a row at 2 is already
 * `failed` and was never claimable, so 3 was unreachable — one predicate for
 * both ends of the lifecycle is the fix.
 */
const MAX_ATTEMPTS = 2;

/**
 * A claimed email left in `processing` longer than this is assumed to belong
 * to a trigger that died mid-send.
 *
 * 15 minutes, comfortably longer than a provider round trip for a batch of
 * 50, so a slow send is never mistaken for a dead one — recovering early is a
 * duplicate send.
 */
const STALE_CLAIM_SECONDS = 900;

/**
 * Email queue processing handlers
 *
 * - GET  / — Queue stats (service/cron auth)
 * - POST /process — Process batch from queue (service/cron auth)
 * - POST /process/automation — Process automation drip queue (service/cron auth)
 */

import { z } from "zod";
import { type HandlerContext, ok } from "../../_shared/api-handler.ts";
import { AppError, ServerError } from "../../_shared/errors.ts";
import { logger } from "../../_shared/logger.ts";
import {
  type EmailProviderName,
  type EmailType,
  getEmailService,
} from "../../_shared/email/index.ts";
import {
  type AutomationQueueItem,
  escapeHtml,
  getServiceRoleClient,
  type ProcessResult,
  type QueuedEmail,
  requireServiceAuth,
  VERSION,
} from "./utils.ts";
import type { automationProcessSchema, processSchema } from "./schemas.ts";

// =============================================================================
// Queue Processing (preserved from api-v1-email-queue)
// =============================================================================

async function processEmailQueue(
  _requestId: string,
  batchSize: number,
  dryRun: boolean,
  provider?: string,
): Promise<ProcessResult> {
  const supabase = getServiceRoleClient();

  // `claim_email_queue` claims atomically: it marks each row `processing` in
  // the same transaction that selects it.
  //
  // The function this replaces, `get_pending_emails_for_processing`, was
  // `LANGUAGE sql`, so its `FOR UPDATE SKIP LOCKED` locks were released when
  // the statement returned — before the provider call below, which is two
  // more transactions later. Two triggers could therefore read the same
  // `queued` rows and both send them. See
  // supabase/migrations/20260929000000_atomic_email_claim_for_deno.sql.
  //
  // A `dryRun` still claims, deliberately. It has to: a preview that leaves
  // the rows claimable would be reading the queue as it will be after the next
  // real trigger has taken it, and the report would describe work this run
  // then competes with rather than observes. The rows are released at the
  // end of the loop, which puts them back in `queued` and restores the
  // attempt count — so a dry run is invisible to the queue afterwards.
  const { data: pendingEmails, error: fetchError } = await supabase.rpc(
    "claim_email_queue",
    {
      p_batch_size: batchSize,
      p_max_attempts: MAX_ATTEMPTS,
      p_stale_after_seconds: STALE_CLAIM_SECONDS,
    },
  );

  if (fetchError) {
    throw new AppError(
      `Failed to claim pending emails: ${fetchError.message}`,
      "QUEUE_FETCH_FAILED",
      500,
    );
  }

  if (!pendingEmails || pendingEmails.length === 0) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0, durationMs: 0 };
  }

  const emails = pendingEmails as QueuedEmail[];
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];
  const toRelease: string[] = [];

  const emailService = getEmailService();

  // Every claimed row is now `processing`, so every path through this loop
  // owes the queue an outcome: a send, a recorded failure, or a release. The
  // three `continue` paths below each used to leave the row `queued`, which
  // was harmless while the claim did not mark anything and is a permanent
  // strand now. `toRelease` collects them and is flushed after the loop, so
  // one call handles a dry run of a hundred rows.
  for (const email of emails) {
    if (dryRun) {
      logger.info("Dry run: would send email", {
        deliveryId: email.id,
        userId: email.user_id,
        emailType: email.email_type,
        recipient: email.user_email,
      });
      skipped++;
      toRelease.push(email.id);
      continue;
    }

    if (!email.user_email) {
      // Permanent, not a release. The claim now resolves the recipient with a
      // LEFT join, so this row reached the loop at all; a profile with no
      // address will not acquire one, and leaving it queued retried it on
      // every pass forever. Recorded so the backlog is visible.
      logger.warn("Email permanently undeliverable: no recipient address", {
        deliveryId: email.id,
        userId: email.user_id,
      });
      await supabase.rpc("mark_email_as_failed", {
        p_delivery_id: email.id,
        p_error_code: "NO_RECIPIENT",
        p_error_message: "profile has no email address",
        p_should_retry: false,
      });
      failed++;
      errors.push(`${email.id}: no recipient address`);
      continue;
    }

    try {
      const emailContent = await buildEmailContent(supabase, email);

      if (!emailContent) {
        // Released rather than failed. `buildEmailContent` returns null both
        // when a template is genuinely absent and when the read errored, and
        // treating a transient read error as permanent would destroy a real
        // email. The log is the signal for a genuinely missing template;
        // `buildEmailContent` logs the slug itself.
        logger.warn("Could not build content; releasing for retry", {
          deliveryId: email.id,
          emailType: email.email_type,
          templateSlug: email.template_slug,
        });
        skipped++;
        toRelease.push(email.id);
        continue;
      }

      const params = {
        to: email.user_email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        replyTo: emailContent.replyTo,
        tags: [email.email_type, email.template_slug || "default"].filter(
          Boolean,
        ) as string[],
      };

      // `provider` was accepted by the schema and applied to the claim, which
      // ignored it, so an operator asking for one provider silently got
      // whichever the chain picked. It is honoured here.
      const result = provider
        ? await emailService.sendEmailWithProvider(
          params,
          provider as EmailProviderName,
        )
        : await emailService.sendEmail(params, email.email_type as EmailType);

      if (result.success && result.messageId) {
        await supabase.rpc("mark_email_as_sent", {
          p_delivery_id: email.id,
          p_provider: result.provider || "unknown",
          p_message_id: result.messageId,
        });
        sent++;
      } else {
        throw new ServerError(result.error || "Unknown send error");
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      const shouldRetry = !isHardBounce(errorMessage);

      await supabase.rpc("mark_email_as_failed", {
        p_delivery_id: email.id,
        p_error_code: getErrorCode(errorMessage),
        p_error_message: errorMessage.slice(0, 500),
        p_should_retry: shouldRetry,
      });

      failed++;
      errors.push(`${email.id}: ${errorMessage}`);

      logger.warn("Email send failed", {
        deliveryId: email.id,
        error: errorMessage,
        retryCount: email.retry_count,
        willRetry: shouldRetry && email.retry_count < MAX_ATTEMPTS,
      });
    }
  }

  if (toRelease.length > 0) {
    const { error: releaseError } = await supabase.rpc("release_email_claims", {
      p_ids: toRelease,
    });
    if (releaseError) {
      // Not fatal: the stale window returns them, so the cost is a delay
      // rather than a lost email. Logged loudly because a persistent failure
      // here means every dry run strands its batch for 15 minutes.
      logger.error("Failed to release email claims; they return after the stale window", {
        count: toRelease.length,
        error: releaseError.message,
      });
    }
  }

  return {
    processed: emails.length,
    sent,
    failed,
    skipped,
    durationMs: 0,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
  };
}

// =============================================================================
// Email Content Building (preserved from api-v1-email-queue)
// =============================================================================

async function buildEmailContent(
  supabase: ReturnType<typeof getServiceRoleClient>,
  email: QueuedEmail,
): Promise<
  {
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
  } | null
> {
  // Newsletter emails with a campaign.
  //
  // `plain_text_content`, not `text_content`: that is the column this table
  // has. Selecting `text_content` raised a column error for every newsletter
  // campaign, and the caller treated the failed read as "content could not be
  // built" — released for retry, forever, with a log line rather than a
  // failure. The Rust port in `fs-db` selects the right column; this Deno
  // copy never got the fix.
  if (email.email_type === "newsletter" && email.campaign_id) {
    const { data: campaign, error } = await supabase
      .from("newsletter_campaigns")
      .select("subject,html_content,plain_text_content")
      .eq("id", email.campaign_id)
      .single();

    if (error || !campaign) {
      logger.error(
        "Failed to fetch campaign",
        new Error(error?.message || "Campaign not found"),
        {
          campaignId: email.campaign_id,
        },
      );
      return null;
    }

    const personalizedHtml = personalizeContent(
      campaign.html_content,
      email.user_first_name,
      email.user_email,
    );
    const personalizedText = campaign.plain_text_content
      ? personalizeContent(
        campaign.plain_text_content,
        email.user_first_name,
        email.user_email,
      )
      : undefined;

    return {
      subject: campaign.subject,
      html: personalizedHtml,
      text: personalizedText,
    };
  }

  // Template-based emails
  if (email.template_slug) {
    const { data: template, error } = await supabase
      .from("email_templates")
      .select("subject,html_content,text_content")
      .eq("slug", email.template_slug)
      .single();

    if (error || !template) {
      logger.warn("Template not found, using fallback", {
        templateSlug: email.template_slug,
      });
    } else {
      const personalizedHtml = personalizeContent(
        template.html_content,
        email.user_first_name,
        email.user_email,
      );

      return {
        subject: template.subject,
        html: personalizedHtml,
        text: template.text_content,
      };
    }
  }

  // Digest emails
  if (email.email_type === "digest") {
    const metadata = email.metadata || {};
    const frequency = (metadata.frequency as string) || "daily";
    const itemCount = (metadata.itemCount as string) || "0";

    return {
      subject: `Your ${frequency} digest - ${itemCount} new notifications`,
      html: buildDigestHtml(email.user_first_name, metadata),
      text: buildDigestText(email.user_first_name, metadata),
    };
  }

  // Generic notification email
  const title = (email.metadata?.title as string) || "New notification";
  const body = (email.metadata?.body as string) || "";

  return {
    subject: title,
    html: buildGenericHtml(email.user_first_name, title, body),
    text: body,
  };
}

// =============================================================================
// Content Helpers
// =============================================================================

function personalizeContent(
  content: string,
  firstName: string | null,
  email: string,
): string {
  return content
    .replace(/\{\{first_name\}\}/gi, firstName || "there")
    .replace(/\{\{name\}\}/gi, firstName || "there")
    .replace(/\{\{email\}\}/gi, email);
}

function buildGenericHtml(
  firstName: string | null,
  title: string,
  body: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px;">${escapeHtml(title)}</h1>
    <p style="margin: 0 0 15px;">Hi ${escapeHtml(firstName || "there")},</p>
    <p style="margin: 0;">${escapeHtml(body)}</p>
  </div>
  <p style="color: #666; font-size: 14px; text-align: center;">
    <a href="https://foodshare.app" style="color: #10b981;">FoodShare</a>
  </p>
</body>
</html>`;
}

function buildDigestHtml(
  firstName: string | null,
  metadata: Record<string, unknown>,
): string {
  const items = (metadata.items as Array<{ title?: string; body?: string }>) ||
    [];
  const frequency = (metadata.frequency as string) || "daily";

  const itemsHtml = items
    .slice(0, 10)
    .map(
      (item) => `
    <li style="margin-bottom: 10px;">
      <strong>${escapeHtml(item.title || "Notification")}</strong>
      ${item.body ? `<br><span style="color: #666;">${escapeHtml(item.body)}</span>` : ""}
    </li>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your ${frequency} digest</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
    <h1 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px;">Your ${
    escapeHtml(frequency)
  } digest</h1>
    <p style="margin: 0 0 20px;">Hi ${escapeHtml(firstName || "there")}, here's what you missed:</p>
    <ul style="padding-left: 20px; margin: 0;">
      ${itemsHtml}
    </ul>
    ${
    items.length > 10
      ? `<p style="margin: 15px 0 0; color: #666;">...and ${items.length - 10} more</p>`
      : ""
  }
  </div>
  <p style="color: #666; font-size: 14px; text-align: center; margin-top: 20px;">
    <a href="https://foodshare.app" style="color: #10b981;">Open FoodShare</a>
  </p>
</body>
</html>`;
}

function buildDigestText(
  firstName: string | null,
  metadata: Record<string, unknown>,
): string {
  const items = (metadata.items as Array<{ title?: string; body?: string }>) ||
    [];
  const frequency = (metadata.frequency as string) || "daily";

  const itemsText = items
    .slice(0, 10)
    .map((item) => `- ${item.title || "Notification"}${item.body ? `: ${item.body}` : ""}`)
    .join("\n");

  return `Your ${frequency} digest

Hi ${firstName || "there"}, here's what you missed:

${itemsText}
${items.length > 10 ? `\n...and ${items.length - 10} more` : ""}

Open FoodShare: https://foodshare.app`;
}

// =============================================================================
// Error Classification
// =============================================================================

/**
 * Whether a send error is permanent, so the queue should give up rather than
 * retry.
 *
 * Exported for tests because it is the highest-consequence untestable
 * decision in this file: getting it wrong in one direction gives up on a
 * deliverable email, and in the other retries an address that will never
 * accept mail until the budget is gone. It decides, per email, whether a real
 * person ever receives the message.
 */
export function isHardBounce(error: string): boolean {
  // Order-independent wherever the two halves of a phrase can legitimately
  // appear either way round.
  //
  // `invalid.*email` and `not.*exist` were both written in one order only,
  // which meant a real provider message worded the other way round —
  // "The email address is invalid", "the user no longer exists" — did not
  // match, and was therefore treated as *retryable*. A permanently invalid
  // address was retried until the attempt budget ran out, three provider
  // calls per address per cycle, and only then given up. Getting this
  // backwards in the other direction is worse: it discards deliverable mail
  // on a transient blip. Both directions are pinned in
  // `__tests__/email-queue.test.ts`.
  const hardBouncePatterns = [
    // Both halves anywhere: covers "invalid email", "email is invalid" and
    // "invalid recipient address".
    /(?=.*invalid)(?=.*(?:email|address|recipient))/i,
    // "does not exist", "user not exist", "no longer exists", "doesn't exist".
    /\b(?:does|do|did|doesn't|don't)\s+not\s+exist\b/i,
    /\bnot\s+exist\b/i,
    /\bno\s+longer\s+exist/i,
    /\bmailbox\s+not\s+found\b/i,
    // "user unknown", "unknown user", "unknown recipient".
    /\bunknown\s+(?:user|recipient|address|mailbox)\b/i,
    /\buser\s+unknown\b/i,
    // Enhanced status codes, which are the unambiguous form when present.
    /550[^\d]*5\.1\.1/i,
    /550[^\d]*5\.1\.2/i,
    /\bunsubscrib/i,
    /\bcomplain/i,
    /\bblock(?:ed|ing|list)\b|\bblack\s*list/i,
  ];

  return hardBouncePatterns.some((pattern) => pattern.test(error));
}

/**
 * A short, stable classification for `error_code`, so a dashboard can group
 * on it without depending on any provider's wording. Exported for the same
 * reason as `isHardBounce`.
 */
export function getErrorCode(error: string): string {
  const smtpMatch = error.match(/\b(4\d{2}|5\d{2})\b/);
  if (smtpMatch) return smtpMatch[1];

  if (/timeout/i.test(error)) return "TIMEOUT";
  if (/rate.*limit/i.test(error)) return "RATE_LIMIT";
  if (/auth/i.test(error)) return "AUTH_ERROR";
  if (/bounce/i.test(error)) return "BOUNCED";
  if (/invalid.*email/i.test(error)) return "INVALID_EMAIL";

  return "UNKNOWN";
}

// =============================================================================
// Automation Queue Processing (merged from process-automation-queue)
// =============================================================================

/**
 * The outcome of resolving an automation step's content.
 *
 * The two failure reasons are not interchangeable: a profile with no address
 * will not acquire one, so retrying spends the budget on an email that will
 * never be delivered, while a template that is missing today may exist by
 * the next tick. The distinction is what lets the processor choose between
 * a permanent failure and a release.
 */
type AutomationContent =
  | { ok: true; content: { subject: string; html: string; to: string } }
  | { ok: false; reason: "no_recipient" | "no_content" };

/**
 * Resolve an automation step's content.
 *
 * Exported for tests because the two failure reasons decide, per row,
 * whether the queue gives up or retries: a profile with no address will
 * not acquire one, so retrying spends the budget on an email that will
 * never be delivered, while a template missing today may exist by the
 * next tick. Getting that distinction wrong in either direction either
 * abandons a deliverable email or burns the whole retry budget — the same
 * reasoning as `isHardBounce`.
 */
export async function resolveAutomationEmailContent(
  supabase: ReturnType<typeof getServiceRoleClient>,
  emailData: AutomationQueueItem["email_data"],
  profileId: string,
): Promise<AutomationContent> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("email,first_name,nickname")
    .eq("id", profileId)
    .single();

  if (!profile?.email) {
    return { ok: false, reason: "no_recipient" };
  }

  const name = profile.first_name || profile.nickname || "there";

  if (emailData.template_slug) {
    const { data: template } = await supabase
      .from("email_templates")
      .select("subject,html_content")
      .eq("slug", emailData.template_slug)
      .eq("is_active", true)
      .single();

    if (template) {
      return {
        ok: true,
        content: {
          subject: template.subject.replace(/\{\{name\}\}/g, name),
          html: template.html_content
            .replace(/\{\{name\}\}/g, name)
            .replace(/\{\{email\}\}/g, profile.email),
          to: profile.email,
        },
      };
    }
  }

  if (emailData.subject && emailData.html) {
    return {
      ok: true,
      content: {
        subject: emailData.subject.replace(/\{\{name\}\}/g, name),
        html: emailData.html
          .replace(/\{\{name\}\}/g, name)
          .replace(/\{\{email\}\}/g, profile.email),
        to: profile.email,
      },
    };
  }

  return { ok: false, reason: "no_content" };
}

/**
 * Process one claimed automation row.
 *
 * The caller has already claimed the batch through `claim_automation_queue`,
 * so every row arrives `processing` and every path through this function
 * owes the queue an outcome: a send, a recorded failure, or a release. The
 * three write-backs are scoped to `processing` in the database, so a late
 * or duplicate call cannot overwrite a delivery.
 */
async function processAutomationQueueItem(
  supabase: ReturnType<typeof getServiceRoleClient>,
  item: AutomationQueueItem,
  dryRun: boolean,
): Promise<
  {
    id: string;
    success: boolean;
    provider?: string;
    error?: string;
    latencyMs: number;
  }
> {
  const startTime = performance.now();

  try {
    const resolved = await resolveAutomationEmailContent(
      supabase,
      item.email_data,
      item.profile_id,
    );

    if (!resolved.ok) {
      if (!dryRun) {
        if (resolved.reason === "no_recipient") {
          // Permanent: a profile with no address will not acquire one.
          await supabase.rpc("fail_automation_attempts", {
            p_ids: [item.id],
            p_error_message: "profile has no email address",
            p_should_retry: false,
          });
        } else {
          // Released rather than failed: the template may be created after
          // this flow was enrolled, and a permanent failure here would
          // destroy a real email. The log is the signal for a genuinely
          // missing template.
          logger.warn("Could not resolve automation content; releasing for retry", {
            queueId: item.id,
            templateSlug: item.email_data.template_slug,
          });
          await supabase.rpc("release_automation_claims", {
            p_ids: [item.id],
            p_error_message: "could not resolve email content",
          });
        }
      }
      return {
        id: item.id,
        success: false,
        error: resolved.reason === "no_recipient"
          ? "profile has no email address"
          : "could not resolve email content",
        latencyMs: Math.round(performance.now() - startTime),
      };
    }

    if (dryRun) {
      return {
        id: item.id,
        success: true,
        provider: "dry_run",
        latencyMs: Math.round(performance.now() - startTime),
      };
    }

    const emailService = getEmailService();
    const result = await emailService.sendEmail(
      {
        to: resolved.content.to,
        subject: resolved.content.subject,
        html: resolved.content.html,
      },
      "notification" as EmailType,
    );

    if (result.success && result.messageId) {
      const { error: markError } = await supabase.rpc(
        "mark_automation_email_sent",
        {
          p_queue_id: item.id,
          p_provider: result.provider || "unknown",
          p_message_id: result.messageId,
        },
      );

      if (markError) {
        // The email was delivered but the queue was not told. Releasing the
        // row would resend it on the next tick; leaving it `processing`
        // means the stale window recovers it — the same duplicate either
        // way, but the failure is visible rather than silent, and the row
        // is not lost. Logged loudly because a persistent failure here
        // means every send strands its row.
        logger.error(
          "Failed to record automation send; the row returns after the stale window",
          {
            queueId: item.id,
            error: markError.message,
          },
        );
      }

      return {
        id: item.id,
        success: true,
        provider: result.provider,
        latencyMs: Math.round(performance.now() - startTime),
      };
    }

    const errorMessage = result.error || "Unknown error";

    if (isHardBounce(errorMessage)) {
      // Permanent: retrying spends the budget on an address that will
      // never accept mail.
      await supabase.rpc("fail_automation_attempts", {
        p_ids: [item.id],
        p_error_message: errorMessage.slice(0, 500),
        p_should_retry: false,
      });
    } else {
      // Retryable until the row's own max_attempts, which the database
      // decides — the old code hardcoded 3 and ignored the column.
      await supabase.rpc("release_automation_claims", {
        p_ids: [item.id],
        p_error_message: errorMessage.slice(0, 500),
      });
    }

    return {
      id: item.id,
      success: false,
      error: errorMessage,
      latencyMs: Math.round(performance.now() - startTime),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (!dryRun) {
      await supabase.rpc("release_automation_claims", {
        p_ids: [item.id],
        p_error_message: errorMessage.slice(0, 500),
      });
    }
    return {
      id: item.id,
      success: false,
      error: errorMessage,
      latencyMs: Math.round(performance.now() - startTime),
    };
  }
}

// =============================================================================
// Exported Route Handlers
// =============================================================================

/** GET / — Queue stats (service/cron auth) */
export async function handleGetStats(ctx: HandlerContext): Promise<Response> {
  requireServiceAuth(ctx.request);

  const supabase = getServiceRoleClient();

  const [pending, failed, sent] = await Promise.all([
    supabase
      .from("email_delivery_log")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("email_delivery_log")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("email_delivery_log")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent"),
  ]);

  return ok(
    {
      queue: {
        pending: pending.count ?? 0,
        failed: failed.count ?? 0,
        sent: sent.count ?? 0,
      },
      version: VERSION,
      timestamp: new Date().toISOString(),
    },
    ctx,
  );
}

/** POST /process — Process batch from queue (service/cron auth) */
export async function handleProcess(
  ctx: HandlerContext<z.infer<typeof processSchema>>,
): Promise<Response> {
  requireServiceAuth(ctx.request);

  const { batchSize, dryRun, provider } = ctx.body;
  const requestId = ctx.ctx.requestId;
  const startTime = performance.now();

  logger.info("Processing email queue", {
    requestId,
    batchSize,
    dryRun,
    provider,
  });

  const result = await processEmailQueue(
    requestId,
    batchSize,
    dryRun,
    provider,
  );
  result.durationMs = Math.round(performance.now() - startTime);

  logger.info("Email queue processing complete", {
    requestId,
    ...result,
  });

  return ok({ ...result, requestId }, ctx);
}

/** POST /process/automation — Process automation drip queue (service/cron auth) */
export async function handleProcessAutomation(
  ctx: HandlerContext<z.infer<typeof automationProcessSchema>>,
): Promise<Response> {
  requireServiceAuth(ctx.request);

  const { batchSize, concurrency, dryRun } = ctx.body;
  const startTime = performance.now();

  logger.info("Processing automation queue", {
    batchSize,
    concurrency,
    dryRun,
  });

  const supabase = getServiceRoleClient();

  // `claim_automation_queue` claims atomically: it marks each row
  // `processing` in the same transaction that selects it, and returns rows
  // stranded by a crashed run to the queue first. The select it replaces
  // was a plain `.eq("status", "pending")` with no lock and no claim, so
  // two overlapping cron ticks read the same rows and both sent. See
  // supabase/migrations/20261001000000_automation_queue_claims.sql.
  const { data: claimed, error: fetchError } = await supabase.rpc(
    "claim_automation_queue",
    {
      p_batch_size: batchSize,
      p_stale_after_seconds: STALE_CLAIM_SECONDS,
    },
  );

  if (fetchError) {
    throw new AppError(
      `Failed to claim automation queue: ${fetchError.message}`,
      "QUEUE_FETCH_FAILED",
      500,
    );
  }

  const queueItems = (claimed ?? []) as AutomationQueueItem[];

  if (!queueItems.length) {
    return ok({
      success: true,
      message: "No pending automation emails to process",
      dryRun,
      processed: 0,
      successful: 0,
      failed: 0,
      durationMs: Math.round(performance.now() - startTime),
    }, ctx);
  }

  const results: Awaited<ReturnType<typeof processAutomationQueueItem>>[] = [];
  for (let i = 0; i < queueItems.length; i += concurrency) {
    const chunk = queueItems.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((item) =>
        processAutomationQueueItem(
          supabase,
          item,
          dryRun,
        )
      ),
    );
    results.push(...chunkResults);
  }

  // Every claimed row owes the queue an outcome. A dry run has sent nothing,
  // so its rows are released in one call — the same obligation the email
  // queue's dry run meets with `release_email_claims`.
  if (dryRun) {
    const { error: releaseError } = await supabase.rpc(
      "release_automation_claims",
      {
        p_ids: queueItems.map((item) => item.id),
      },
    );
    if (releaseError) {
      // Not fatal: the stale window returns them, so the cost is a delay
      // rather than a lost email. Logged loudly because a persistent
      // failure here means every dry run strands its batch for 15 minutes.
      logger.error(
        "Failed to release automation claims; they return after the stale window",
        {
          count: queueItems.length,
          error: releaseError.message,
        },
      );
    }
  }

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  logger.info("Automation queue processing complete", {
    processed: results.length,
    successful: successful.length,
    failed: failed.length,
    dryRun,
    durationMs: Math.round(performance.now() - startTime),
  });

  return ok({
    success: true,
    message: dryRun ? "Dry run completed" : "Automation queue processed",
    dryRun,
    processed: results.length,
    successful: successful.length,
    failed: failed.length,
    avgLatencyMs: results.length > 0
      ? Math.round(
        results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length,
      )
      : 0,
    errors: failed.map((f) => ({ id: f.id, error: f.error })),
    durationMs: Math.round(performance.now() - startTime),
  }, ctx);
}
