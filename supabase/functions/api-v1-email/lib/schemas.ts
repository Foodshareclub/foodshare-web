/**
 * Zod schemas for api-v1-email request validation
 */

import { z } from "zod";

// =============================================================================
// Schemas
// =============================================================================

export const processSchema = z.object({
  batchSize: z.number().int().min(1).max(200).optional().default(50),
  dryRun: z.boolean().optional().default(false),
  // Constrained to the four real provider names. This was `z.string()`, and
  // the value was then ignored entirely — so an operator asking for a
  // provider got whichever the chain picked, and a typo was not even
  // diagnosable. Now that the queue honours it, an unvalidated string would
  // become a runtime "Provider xyz not found" from the service instead of a
  // 400 with the allowed list.
  provider: z
    .enum(["resend", "brevo", "aws_ses", "mailersend"])
    .optional(),
});

export const emailTypeEnum = z.enum([
  "auth",
  "chat",
  "food_listing",
  "feedback",
  "review_reminder",
  "newsletter",
  "announcement",
  "welcome",
  "goodbye",
  "notification",
]);

export const sendSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1).max(50)]),
  subject: z.string().min(1).max(500),
  html: z.string().min(1),
  text: z.string().optional(),
  replyTo: z.string().email().optional(),
  tags: z.array(z.string()).max(10).optional(),
  emailType: emailTypeEnum.optional().default("notification"),
});

export const sendTemplateSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1).max(50)]),
  slug: z.string().min(1),
  variables: z.record(z.unknown()),
  emailType: emailTypeEnum.optional().default("notification"),
});

export const sendInvitationSchema = z.object({
  recipientEmail: z.string().email(),
  senderName: z.string().min(1).max(100),
  senderEmail: z.string().email().optional(),
  message: z.string().max(500).optional(),
});

export const automationProcessSchema = z.object({
  batchSize: z.number().int().min(1).max(200).optional().default(20),
  concurrency: z.number().int().min(1).max(10).optional().default(3),
  dryRun: z.boolean().optional().default(false),
});

export const goTrueEmailHookSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    app_metadata: z.record(z.unknown()).optional(),
    user_metadata: z.record(z.unknown()).optional(),
  }),
  email_data: z.object({
    token: z.string().optional(),
    token_hash: z.string().optional(),
    redirect_to: z.string().optional(),
    email_action_type: z.enum([
      "signup",
      "invite",
      "magiclink",
      "recovery",
      "email_change_current",
      "email_change_new",
      "reauthentication",
    ]),
    site_url: z.string().optional(),
    // The address the change is to. GoTrue sends it for the email-change
    // actions; without it the template can only show the current address.
    email: z.string().optional(),
  }),
});
