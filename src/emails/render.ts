/**
 * Email Rendering Utilities
 *
 * Server-side rendering for React Email templates.
 * Uses @react-email/components render function for optimal output.
 */

import { render } from "@react-email/components";
import type { ReactElement } from "react";
import type { EmailTemplateName, EmailTemplateProps } from "./types";

// Lazy import templates to enable tree-shaking
const templates = {
  "welcome-confirmation": () =>
    import("./welcome-confirmation").then((m) => m.WelcomeConfirmationEmail),
  "password-reset": () => import("./password-reset").then((m) => m.PasswordResetEmail),
  "magic-link": () => import("./magic-link").then((m) => m.MagicLinkEmail),
  "new-message": () => import("./new-message").then((m) => m.NewMessageEmail),
  "listing-interest": () => import("./listing-interest").then((m) => m.ListingInterestEmail),
  "pickup-reminder": () => import("./pickup-reminder").then((m) => m.PickupReminderEmail),
  "review-request": () => import("./review-request").then((m) => m.ReviewRequestEmail),
  "listing-expired": () => import("./listing-expired").then((m) => m.ListingExpiredEmail),
  "weekly-digest": () => import("./weekly-digest").then((m) => m.WeeklyDigestEmail),
} as const;

/**
 * Render an email template to HTML string
 *
 * @example
 * const html = await renderEmailToHtml('welcome-confirmation', {
 *   confirmationUrl: 'https://foodshare.club/confirm?token=abc'
 * });
 */
export async function renderEmailToHtml<T extends EmailTemplateName>(
  templateName: T,
  props: Extract<EmailTemplateProps, { template: T }>["props"]
): Promise<string> {
  const getTemplate = templates[templateName];
  if (!getTemplate) {
    throw new Error(`Unknown email template: ${templateName}`);
  }

  const Template = await getTemplate();
  const element = Template(props as Parameters<typeof Template>[0]) as ReactElement;

  return render(element);
}

/**
 * Render an email template to plain text
 *
 * @example
 * const text = await renderEmailToText('welcome-confirmation', {
 *   confirmationUrl: 'https://foodshare.club/confirm?token=abc'
 * });
 */
export async function renderEmailToText<T extends EmailTemplateName>(
  templateName: T,
  props: Extract<EmailTemplateProps, { template: T }>["props"]
): Promise<string> {
  const getTemplate = templates[templateName];
  if (!getTemplate) {
    throw new Error(`Unknown email template: ${templateName}`);
  }

  const Template = await getTemplate();
  const element = Template(props as Parameters<typeof Template>[0]) as ReactElement;

  return render(element, { plainText: true });
}

/**
 * Render an email template to both HTML and plain text
 *
 * @example
 * const { html, text } = await renderEmail('new-message', {
 *   senderName: 'John',
 *   messagePreview: 'Hey, is this still available?',
 *   ...
 * });
 */
export async function renderEmail<T extends EmailTemplateName>(
  templateName: T,
  props: Extract<EmailTemplateProps, { template: T }>["props"]
): Promise<{ html: string; text: string }> {
  const [html, text] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderEmailToHtml(templateName, props as any),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderEmailToText(templateName, props as any),
  ]);

  return { html, text };
}

/**
 * Get subject line for a template
 * Useful for programmatic email sending
 */
export function getEmailSubject(
  templateName: EmailTemplateName,
  props?: Record<string, string>
): string {
  const subjects: Record<EmailTemplateName, string | ((p: Record<string, string>) => string)> = {
    "welcome-confirmation": "Welcome to Foodshare! Please confirm your email",
    "password-reset": "Reset your Foodshare password",
    "magic-link": "Sign in to Foodshare",
    "new-message": (p) => `${p.senderName || "Someone"} sent you a message on Foodshare`,
    "listing-interest": (p) => `${p.interestedUserName || "Someone"} is interested in your listing`,
    "pickup-reminder": (p) => `Reminder: Pickup scheduled for ${p.pickupTime || "today"}`,
    "review-request": (p) =>
      `How was your experience with ${p.sharerName || "your recent pickup"}?`,
    "listing-expired": (p) => `Your listing "${p.listingTitle || ""}" has expired`,
    "weekly-digest": (p) => `Your Foodshare weekly digest - ${p.weekRange || "This Week"}`,
  };

  const subject = subjects[templateName];
  if (typeof subject === "function") {
    return subject(props || {});
  }
  return subject;
}

/**
 * Validate template props
 * Returns true if props are valid for the template
 */
export function validateTemplateProps(
  templateName: EmailTemplateName,
  props: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const requiredFields: Record<EmailTemplateName, string[]> = {
    "welcome-confirmation": ["confirmationUrl"],
    "password-reset": ["confirmationUrl"],
    "magic-link": ["confirmationUrl"],
    "new-message": ["senderName", "messagePreview", "conversationUrl"],
    "listing-interest": ["interestedUserName", "listingTitle", "messageUrl"],
    "pickup-reminder": ["pickupTime", "pickupDate", "listingTitle", "pickupAddress"],
    "review-request": ["recipientName", "sharerName", "listingTitle", "reviewUrl"],
    "listing-expired": ["userName", "listingTitle", "renewUrl"],
    "weekly-digest": ["weekRange", "exploreUrl"],
  };

  const required = requiredFields[templateName] || [];
  for (const field of required) {
    if (!props[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
