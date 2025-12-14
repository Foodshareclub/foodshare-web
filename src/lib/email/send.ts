/**
 * Email Sending Utilities
 *
 * Server-side email sending with React Email templates.
 * Integrates with UnifiedEmailService for provider routing.
 */

import type { EmailType, SendEmailResponse } from "./types";
import { createUnifiedEmailService } from "./unified-service";
import { renderEmail, getEmailSubject } from "@/emails/render";
import type { EmailTemplateName, EmailTemplateProps } from "@/emails/types";

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
