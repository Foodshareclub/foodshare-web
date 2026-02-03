"use server";

/**
 * Database Template Email Server Actions
 *
 * Server actions for sending emails using the database-driven template system.
 * These provide a type-safe API for sending templated emails from anywhere in the app.
 *
 * @example
 * ```tsx
 * // In a Server Component or Server Action
 * await sendWelcomeEmail({ to: 'user@example.com', name: 'John' });
 *
 * // In a Client Component (via form action or startTransition)
 * const result = await sendPasswordResetEmail({
 *   to: user.email,
 *   name: user.name,
 *   resetUrl: generateResetUrl()
 * });
 * ```
 */

import { z } from "zod";
import { sendDatabaseTemplateEmail, previewDatabaseTemplate } from "@/lib/email/send";
import { clearTemplateCacheEntry, clearTemplateCache } from "@/lib/email/database-templates";

// ============================================================================
// Schemas
// ============================================================================

const baseEmailSchema = z.object({
  to: z.string().email(),
});

// ============================================================================
// Welcome Email
// ============================================================================

const welcomeEmailSchema = baseEmailSchema.extend({
  name: z.string().min(1),
});

export async function sendWelcomeEmail(input: z.infer<typeof welcomeEmailSchema>) {
  const validated = welcomeEmailSchema.parse(input);

  return sendDatabaseTemplateEmail({
    to: validated.to,
    slug: "welcome",
    variables: {
      name: validated.name,
    },
  });
}

// ============================================================================
// Email Verification
// ============================================================================

const verificationEmailSchema = baseEmailSchema.extend({
  verifyUrl: z.string().url(),
});

export async function sendEmailVerification(input: z.infer<typeof verificationEmailSchema>) {
  const validated = verificationEmailSchema.parse(input);

  return sendDatabaseTemplateEmail({
    to: validated.to,
    slug: "email-verification",
    variables: {
      verifyUrl: validated.verifyUrl,
    },
  });
}

// ============================================================================
// Password Reset
// ============================================================================

const passwordResetSchema = baseEmailSchema.extend({
  name: z.string().min(1),
  resetUrl: z.string().url(),
  expiresIn: z.string().optional().default("1 hour"),
});

export async function sendPasswordResetEmail(input: z.infer<typeof passwordResetSchema>) {
  const validated = passwordResetSchema.parse(input);

  return sendDatabaseTemplateEmail({
    to: validated.to,
    slug: "password-reset",
    variables: {
      name: validated.name,
      resetUrl: validated.resetUrl,
      expiresIn: validated.expiresIn,
    },
  });
}

// ============================================================================
// Chat Notification
// ============================================================================

const chatNotificationSchema = baseEmailSchema.extend({
  recipientName: z.string().min(1),
  senderName: z.string().min(1),
  messagePreview: z.string().max(200),
  chatUrl: z.string().url(),
});

export async function sendChatNotificationEmail(input: z.infer<typeof chatNotificationSchema>) {
  const validated = chatNotificationSchema.parse(input);

  return sendDatabaseTemplateEmail({
    to: validated.to,
    slug: "chat-notification",
    variables: {
      recipientName: validated.recipientName,
      senderName: validated.senderName,
      messagePreview: validated.messagePreview,
      chatUrl: validated.chatUrl,
    },
    emailType: "chat",
  });
}

// ============================================================================
// New Listing Nearby
// ============================================================================

const newListingSchema = baseEmailSchema.extend({
  recipientName: z.string().min(1),
  listingTitle: z.string().min(1),
  listingDescription: z.string().optional(),
  listingAddress: z.string().optional().default("Near you"),
  posterName: z.string().min(1),
  listingUrl: z.string().url(),
  listingType: z.string().optional().default("food"),
  listingEmoji: z.string().optional().default("🍎"),
});

export async function sendNewListingEmail(input: z.infer<typeof newListingSchema>) {
  const validated = newListingSchema.parse(input);

  return sendDatabaseTemplateEmail({
    to: validated.to,
    slug: "new-listing-nearby",
    variables: {
      recipientName: validated.recipientName,
      listingTitle: validated.listingTitle,
      listingDescription: validated.listingDescription || "",
      listingAddress: validated.listingAddress,
      posterName: validated.posterName,
      listingUrl: validated.listingUrl,
      listingType: validated.listingType,
      listingEmoji: validated.listingEmoji,
    },
    emailType: "food_listing",
  });
}

// ============================================================================
// Volunteer Welcome
// ============================================================================

const volunteerWelcomeSchema = baseEmailSchema.extend({
  name: z.string().min(1),
});

export async function sendVolunteerWelcomeEmail(input: z.infer<typeof volunteerWelcomeSchema>) {
  const validated = volunteerWelcomeSchema.parse(input);

  return sendDatabaseTemplateEmail({
    to: validated.to,
    slug: "volunteer-welcome",
    variables: {
      name: validated.name,
    },
  });
}

// ============================================================================
// Complete Profile Reminder
// ============================================================================

const completeProfileSchema = baseEmailSchema.extend({
  name: z.string().min(1),
  completionPercent: z.number().min(0).max(100).optional().default(50),
});

export async function sendCompleteProfileEmail(input: z.infer<typeof completeProfileSchema>) {
  const validated = completeProfileSchema.parse(input);

  return sendDatabaseTemplateEmail({
    to: validated.to,
    slug: "complete-profile",
    variables: {
      name: validated.name,
      completionPercent: validated.completionPercent,
    },
  });
}

// ============================================================================
// First Share Tips
// ============================================================================

const firstShareTipsSchema = baseEmailSchema.extend({
  name: z.string().min(1),
});

export async function sendFirstShareTipsEmail(input: z.infer<typeof firstShareTipsSchema>) {
  const validated = firstShareTipsSchema.parse(input);

  return sendDatabaseTemplateEmail({
    to: validated.to,
    slug: "first-share-tips",
    variables: {
      name: validated.name,
    },
  });
}

// ============================================================================
// Milestone Celebration
// ============================================================================

const milestoneSchema = baseEmailSchema.extend({
  name: z.string().min(1),
  milestoneName: z.string().min(1),
  milestoneDescription: z.string().min(1),
  milestoneEmoji: z.string().optional().default("🏆"),
  percentile: z.number().min(0).max(100).optional().default(10),
  nextMilestone: z.string().optional().default("Keep sharing to unlock your next achievement!"),
});

export async function sendMilestoneEmail(input: z.infer<typeof milestoneSchema>) {
  const validated = milestoneSchema.parse(input);

  return sendDatabaseTemplateEmail({
    to: validated.to,
    slug: "milestone-celebration",
    variables: {
      name: validated.name,
      milestoneName: validated.milestoneName,
      milestoneDescription: validated.milestoneDescription,
      milestoneEmoji: validated.milestoneEmoji,
      percentile: validated.percentile,
      nextMilestone: validated.nextMilestone,
    },
  });
}

// ============================================================================
// Reengagement
// ============================================================================

const reengagementSchema = baseEmailSchema.extend({
  name: z.string().min(1),
  daysSinceLastVisit: z.number().min(1),
  newListingsNearby: z.number().optional().default(0),
  mealsSavedCommunity: z.number().optional().default(0),
  newMembersNearby: z.number().optional().default(0),
  unsubscribeUrl: z.string().url(),
});

export async function sendReengagementEmail(input: z.infer<typeof reengagementSchema>) {
  const validated = reengagementSchema.parse(input);

  return sendDatabaseTemplateEmail({
    to: validated.to,
    slug: "reengagement",
    variables: {
      name: validated.name,
      daysSinceLastVisit: validated.daysSinceLastVisit,
      newListingsNearby: validated.newListingsNearby,
      mealsSavedCommunity: validated.mealsSavedCommunity,
      newMembersNearby: validated.newMembersNearby,
      unsubscribeUrl: validated.unsubscribeUrl,
    },
    emailType: "newsletter",
  });
}

// ============================================================================
// Admin: Feedback Alert
// ============================================================================

const feedbackAlertSchema = z.object({
  feedbackId: z.string(),
  feedbackType: z.string(),
  feedbackEmoji: z.string().optional().default("📩"),
  subject: z.string(),
  submitterName: z.string(),
  submitterEmail: z.string().email(),
  message: z.string(),
  timestamp: z.string().optional(),
});

export async function sendFeedbackAlertEmail(input: z.infer<typeof feedbackAlertSchema>) {
  const validated = feedbackAlertSchema.parse(input);

  // Send to admin email
  const adminEmail = process.env.ADMIN_EMAIL || "support@foodshare.club";

  return sendDatabaseTemplateEmail({
    to: adminEmail,
    slug: "feedback-alert",
    variables: {
      feedbackId: validated.feedbackId,
      feedbackType: validated.feedbackType,
      feedbackEmoji: validated.feedbackEmoji,
      subject: validated.subject,
      submitterName: validated.submitterName,
      submitterEmail: validated.submitterEmail,
      message: validated.message,
      timestamp: validated.timestamp || new Date().toISOString(),
    },
    emailType: "feedback",
  });
}

// ============================================================================
// Generic Template Email (for custom templates)
// ============================================================================

const genericTemplateSchema = z.object({
  to: z.string().email(),
  slug: z.string().min(1),
  variables: z.record(z.string(), z.unknown()),
  subject: z.string().optional(),
  replyTo: z.string().email().optional(),
});

export async function sendGenericTemplateEmail(input: z.infer<typeof genericTemplateSchema>) {
  const validated = genericTemplateSchema.parse(input);

  return sendDatabaseTemplateEmail({
    to: validated.to,
    slug: validated.slug,
    variables: validated.variables,
    subject: validated.subject,
    replyTo: validated.replyTo,
  });
}

// ============================================================================
// Preview Template (for admin UI)
// ============================================================================

const previewSchema = z.object({
  slug: z.string().min(1),
  variables: z.record(z.string(), z.unknown()),
});

export async function previewTemplateEmail(input: z.infer<typeof previewSchema>) {
  const validated = previewSchema.parse(input);

  return previewDatabaseTemplate(validated.slug, validated.variables);
}

// ============================================================================
// Cache Management (Admin)
// ============================================================================

export async function invalidateTemplateCache(slug?: string) {
  if (slug) {
    clearTemplateCacheEntry(slug);
  } else {
    clearTemplateCache();
  }
  return { success: true };
}
