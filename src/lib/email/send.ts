/**
 * Email Sending Utilities
 *
 * Server-side email sending with database-driven templates (primary)
 * and React Email templates (fallback for backward compatibility).
 *
 * Architecture:
 * 1. Try database template first (via Edge Function or direct query)
 * 2. Fall back to React Email template if not found
 * 3. Route through UnifiedEmailService for provider selection
 *
 * @example Database template
 * ```ts
 * await sendDatabaseTemplateEmail({
 *   to: 'user@example.com',
 *   slug: 'welcome',
 *   variables: { name: 'John' }
 * });
 * ```
 *
 * @example Legacy React Email template
 * ```ts
 * await sendTemplateEmail({
 *   to: 'user@example.com',
 *   template: 'welcome-confirmation',
 *   props: { confirmationUrl: 'https://...' }
 * });
 * ```
 */

import type { EmailType, SendEmailResponse } from "./types";
import { createUnifiedEmailService } from "./unified-service";
import {
  renderDatabaseTemplate,
  TEMPLATE_SLUG_MAP,
  type RenderedTemplate,
} from "./database-templates";
import { renderEmail, getEmailSubject } from "@/emails/render";
import type { EmailTemplateName, EmailTemplateProps } from "@/emails/types";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Feature flag: Use database templates when available
 * Set USE_DATABASE_TEMPLATES=false to disable and always use React Email
 */
const USE_DATABASE_TEMPLATES = process.env.USE_DATABASE_TEMPLATES !== "false";

// Map template names to email types for provider routing
const templateToEmailType: Record<EmailTemplateName, EmailType> = {
  "welcome-confirmation": "auth",
  "password-reset": "auth",
  "magic-link": "auth",
  "new-message": "chat",
  "listing-interest": "food_listing",
  "pickup-reminder": "food_listing",
  "review-request": "review_reminder",
  "listing-expired": "food_listing",
  "weekly-digest": "newsletter",
};

// Map database slugs to email types
const slugToEmailType: Record<string, EmailType> = {
  welcome: "auth",
  "email-verification": "auth",
  "password-reset": "auth",
  "volunteer-welcome": "auth",
  "complete-profile": "auth",
  "first-share-tips": "food_listing",
  "community-highlights": "newsletter",
  "monthly-impact": "newsletter",
  "milestone-celebration": "food_listing",
  "neighborhood-welcome": "food_listing",
  reengagement: "newsletter",
  "new-listing-nearby": "food_listing",
  "chat-notification": "chat",
  "feedback-alert": "feedback",
};

interface SendTemplateEmailOptions<T extends EmailTemplateName> {
  to: string | { email: string; name?: string };
  template: T;
  props: Extract<EmailTemplateProps, { template: T }>["props"];
  subject?: string;
  replyTo?: string;
}

/**
 * Send an email using a React Email template
 *
 * @example
 * await sendTemplateEmail({
 *   to: 'user@example.com',
 *   template: 'welcome-confirmation',
 *   props: { confirmationUrl: 'https://...' }
 * });
 */
export async function sendTemplateEmail<T extends EmailTemplateName>({
  to,
  template,
  props,
  subject,
  replyTo,
}: SendTemplateEmailOptions<T>): Promise<SendEmailResponse> {
  // Render template
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { html, text } = await renderEmail(template, props as any);

  // Get subject if not provided
  const emailSubject =
    subject || getEmailSubject(template, props as unknown as Record<string, string>);

  // Normalize recipient
  const recipient = typeof to === "string" ? { email: to } : to;

  // Get email type for routing
  const emailType = templateToEmailType[template];

  // Create service and send
  const emailService = await createUnifiedEmailService();

  return emailService.sendEmail({
    content: {
      subject: emailSubject,
      html,
      text,
    },
    options: {
      to: recipient,
      from: {
        email: process.env.EMAIL_FROM || "contact@foodshare.club",
        name: process.env.EMAIL_FROM_NAME || "FoodShare",
      },
      replyTo: replyTo ? { email: replyTo } : undefined,
    },
    emailType,
  });
}

/**
 * Send a batch of emails using the same template
 *
 * @example
 * await sendBatchTemplateEmail({
 *   recipients: ['user1@example.com', 'user2@example.com'],
 *   template: 'weekly-digest',
 *   getProps: (email) => ({ weekRange: 'Dec 8-14', ... })
 * });
 */
export async function sendBatchTemplateEmail<T extends EmailTemplateName>({
  recipients,
  template,
  getProps,
  subject,
  concurrency = 5,
}: {
  recipients: string[];
  template: T;
  getProps: (email: string) => Extract<EmailTemplateProps, { template: T }>["props"];
  subject?: string;
  concurrency?: number;
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] };

  // Process in batches
  for (let i = 0; i < recipients.length; i += concurrency) {
    const batch = recipients.slice(i, i + concurrency);

    const promises = batch.map(async (email) => {
      try {
        const props = getProps(email);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await sendTemplateEmail({ to: email, template, props, subject } as any);

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`${email}: ${result.error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `${email}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });

    await Promise.all(promises);
  }

  return results;
}

/**
 * Preview an email template (for development/admin)
 * Returns rendered HTML without sending
 */
export async function previewEmail<T extends EmailTemplateName>(
  template: T,
  props: Extract<EmailTemplateProps, { template: T }>["props"]
): Promise<{ html: string; text: string; subject: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { html, text } = await renderEmail(template, props as any);
  const subject = getEmailSubject(template, props as unknown as Record<string, string>);

  return { html, text, subject };
}

// ============================================================================
// Database Template Sending (New API)
// ============================================================================

interface SendDatabaseTemplateOptions {
  to: string | { email: string; name?: string };
  slug: string;
  variables: Record<string, unknown>;
  subject?: string; // Override template subject
  replyTo?: string;
  emailType?: EmailType;
}

interface DatabaseTemplateResult extends Omit<SendEmailResponse, "provider"> {
  templateVersion?: number;
  source: "database" | "fallback";
  provider?: SendEmailResponse["provider"]; // Optional - not present in error cases
}

/**
 * Send an email using a database-driven template
 *
 * Primary method for sending templated emails. Falls back to React Email
 * templates if database template is not found.
 *
 * @example
 * await sendDatabaseTemplateEmail({
 *   to: 'user@example.com',
 *   slug: 'welcome',
 *   variables: { name: 'John', email: 'john@example.com' }
 * });
 */
export async function sendDatabaseTemplateEmail({
  to,
  slug,
  variables,
  subject: subjectOverride,
  replyTo,
  emailType,
}: SendDatabaseTemplateOptions): Promise<DatabaseTemplateResult> {
  // Normalize recipient
  const recipient = typeof to === "string" ? { email: to } : to;

  // Get email type for routing
  const type = emailType || slugToEmailType[slug] || "auth";

  // Try database template first
  if (USE_DATABASE_TEMPLATES) {
    const rendered = await renderDatabaseTemplate(slug, variables);

    if (rendered) {
      const emailService = await createUnifiedEmailService();

      const result = await emailService.sendEmail({
        content: {
          subject: subjectOverride || rendered.subject,
          html: rendered.html,
          text: rendered.text,
        },
        options: {
          to: recipient,
          from: {
            email: process.env.EMAIL_FROM || "contact@foodshare.club",
            name: process.env.EMAIL_FROM_NAME || "FoodShare",
          },
          replyTo: replyTo ? { email: replyTo } : undefined,
        },
        emailType: type,
      });

      return {
        ...result,
        templateVersion: rendered.templateVersion,
        source: "database",
      };
    }
  }

  // Fall back to React Email template if available
  const reactTemplateName = Object.entries(TEMPLATE_SLUG_MAP).find(
    ([, dbSlug]) => dbSlug === slug
  )?.[0] as EmailTemplateName | undefined;

  if (reactTemplateName) {
    console.warn(
      `[Email] Database template '${slug}' not found, falling back to React Email '${reactTemplateName}'`
    );

    // Convert variables to React Email props format

    const result = await sendTemplateEmail({
      to,
      template: reactTemplateName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      props: variables as any,
      subject: subjectOverride,
      replyTo,
    });

    return {
      ...result,
      source: "fallback",
    };
  }

  // No template found
  return {
    success: false,
    error: `Template '${slug}' not found in database or React Email templates`,
    source: "fallback",
  };
}

/**
 * Send a batch of emails using a database template
 *
 * @example
 * await sendBatchDatabaseTemplateEmail({
 *   recipients: ['user1@example.com', 'user2@example.com'],
 *   slug: 'community-highlights',
 *   getVariables: (email) => ({ name: getUserName(email), ... })
 * });
 */
export async function sendBatchDatabaseTemplateEmail({
  recipients,
  slug,
  getVariables,
  subject,
  concurrency = 5,
}: {
  recipients: string[];
  slug: string;
  getVariables: (email: string) => Record<string, unknown>;
  subject?: string;
  concurrency?: number;
}): Promise<{
  sent: number;
  failed: number;
  errors: string[];
  source: "database" | "fallback" | "mixed";
}> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
    sources: new Set<"database" | "fallback">(),
  };

  // Process in batches
  for (let i = 0; i < recipients.length; i += concurrency) {
    const batch = recipients.slice(i, i + concurrency);

    const promises = batch.map(async (email) => {
      try {
        const variables = getVariables(email);
        const result = await sendDatabaseTemplateEmail({
          to: email,
          slug,
          variables,
          subject,
        });

        results.sources.add(result.source);

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`${email}: ${result.error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `${email}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });

    await Promise.all(promises);
  }

  return {
    sent: results.sent,
    failed: results.failed,
    errors: results.errors,
    source:
      results.sources.size > 1
        ? "mixed"
        : results.sources.has("database")
          ? "database"
          : "fallback",
  };
}

/**
 * Preview a database template (for development/admin)
 * Returns rendered content without sending
 */
export async function previewDatabaseTemplate(
  slug: string,
  variables: Record<string, unknown>
): Promise<RenderedTemplate | null> {
  return renderDatabaseTemplate(slug, variables);
}
