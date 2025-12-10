/**
 * Email notification triggers
 * Functions to send email notifications for various events
 */

import { createEmailService } from "@/lib/email";
import type { EmailAddress } from "@/lib/email";
import { createLogger } from "@/lib/logger";

// Types for email template data (previously from @/emails)
interface ChatNotificationData {
  senderName: string;
  messagePreview: string;
  roomId: string;
}

interface FoodListingNotificationData {
  foodName: string;
  foodItemId: string;
  distanceKm: number;
}

interface FeedbackNotificationData {
  feedbackId: string;
  feedbackType: string;
  subject: string;
  submitterName: string;
  submitterEmail: string;
  messagePreview: string;
}

interface ReviewReminderData {
  transactionId: string;
  otherUserName: string;
}

// Simple HTML template renderer
function renderEmailTemplate(
  templateName: string,
  data:
    | ChatNotificationData
    | FoodListingNotificationData
    | FeedbackNotificationData
    | ReviewReminderData
): { html: string; subject: string } {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://foodshare.app";

  switch (templateName) {
    case "chat-notification": {
      const d = data as ChatNotificationData;
      return {
        subject: `New message from ${d.senderName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Message</h2>
            <p><strong>${d.senderName}</strong> sent you a message:</p>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="color: #666; font-style: italic;">${d.messagePreview}</p>
            </div>
            <a href="${baseUrl}/chat/${d.roomId}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Reply to Message</a>
          </div>
        `,
      };
    }
    case "food-listing": {
      const d = data as FoodListingNotificationData;
      return {
        subject: `New food available: ${d.foodName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Food Listing Near You</h2>
            <p><strong>${d.foodName}</strong> is available ${d.distanceKm.toFixed(1)}km from you!</p>
            <a href="${baseUrl}/food/${d.foodItemId}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">View Listing</a>
          </div>
        `,
      };
    }
    case "feedback-alert": {
      const d = data as FeedbackNotificationData;
      return {
        subject: `New ${d.feedbackType} feedback: ${d.subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Feedback Received</h2>
            <p><strong>From:</strong> ${d.submitterName} (${d.submitterEmail})</p>
            <p><strong>Type:</strong> ${d.feedbackType}</p>
            <p><strong>Subject:</strong> ${d.subject}</p>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p>${d.messagePreview}</p>
            </div>
            <a href="${baseUrl}/admin/feedback/${d.feedbackId}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">View Feedback</a>
          </div>
        `,
      };
    }
    case "review-reminder": {
      const d = data as ReviewReminderData;
      return {
        subject: `Leave a review for ${d.otherUserName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>How was your experience?</h2>
            <p>You recently shared food with <strong>${d.otherUserName}</strong>. Take a moment to leave them a review!</p>
            <a href="${baseUrl}/review/${d.transactionId}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Leave Review</a>
          </div>
        `,
      };
    }
    default:
      return { subject: "FoodShare Notification", html: "<p>You have a new notification.</p>" };
  }
}

const logger = createLogger("EmailNotifications");

/**
 * Send a chat notification email
 */
export async function sendChatNotification(params: {
  recipientEmail: string;
  recipientName?: string;
  senderName: string;
  messagePreview: string;
  roomId: string;
}) {
  try {
    const emailService = await createEmailService();

    // Prepare template data
    const templateData: ChatNotificationData = {
      senderName: params.senderName,
      messagePreview: params.messagePreview,
      roomId: params.roomId,
    };

    // Render email template
    const { html, subject } = await renderEmailTemplate("chat-notification", templateData);

    // Prepare recipient
    const recipient: EmailAddress = {
      email: params.recipientEmail,
      ...(params.recipientName && { name: params.recipientName }),
    };

    // Send email
    const result = await emailService.sendEmail({
      content: {
        subject,
        html,
      },
      options: {
        to: recipient,
        from: {
          email: process.env.NEXT_PUBLIC_EMAIL_FROM || "noreply@foodshare.app",
          name: process.env.NEXT_PUBLIC_EMAIL_FROM_NAME || "FoodShare",
        },
      },
      emailType: "chat",
    });

    return result;
  } catch (error) {
    logger.error("Failed to send chat notification", error as Error, {
      recipientEmail: params.recipientEmail,
      roomId: params.roomId,
    });
    throw error;
  }
}

/**
 * Send a food listing notification email
 */
export async function sendFoodListingNotification(params: {
  recipientEmail: string;
  recipientName?: string;
  foodName: string;
  foodItemId: string;
  distanceKm: number;
}) {
  try {
    const emailService = await createEmailService();

    // Prepare template data
    const templateData: FoodListingNotificationData = {
      foodName: params.foodName,
      foodItemId: params.foodItemId,
      distanceKm: params.distanceKm,
    };

    // Render email template
    const { html, subject } = await renderEmailTemplate("food-listing", templateData);

    // Prepare recipient
    const recipient: EmailAddress = {
      email: params.recipientEmail,
      ...(params.recipientName && { name: params.recipientName }),
    };

    // Send email
    const result = await emailService.sendEmail({
      content: {
        subject,
        html,
      },
      options: {
        to: recipient,
        from: {
          email: process.env.NEXT_PUBLIC_EMAIL_FROM || "noreply@foodshare.app",
          name: process.env.NEXT_PUBLIC_EMAIL_FROM_NAME || "FoodShare",
        },
      },
      emailType: "food_listing",
    });

    return result;
  } catch (error) {
    logger.error("Failed to send food listing notification", error as Error, {
      recipientEmail: params.recipientEmail,
      foodItemId: params.foodItemId,
    });
    throw error;
  }
}

/**
 * Send a feedback notification email to admins
 */
export async function sendFeedbackNotification(params: {
  adminEmail: string;
  adminName?: string;
  feedbackId: string;
  feedbackType: string;
  subject: string;
  submitterName: string;
  submitterEmail: string;
  messagePreview: string;
}) {
  try {
    const emailService = await createEmailService();

    // Prepare template data
    const templateData: FeedbackNotificationData = {
      feedbackId: params.feedbackId,
      feedbackType: params.feedbackType,
      subject: params.subject,
      submitterName: params.submitterName,
      submitterEmail: params.submitterEmail,
      messagePreview: params.messagePreview,
    };

    // Render email template
    const { html, subject } = await renderEmailTemplate("feedback-alert", templateData);

    // Prepare recipient
    const recipient: EmailAddress = {
      email: params.adminEmail,
      ...(params.adminName && { name: params.adminName }),
    };

    // Send email
    const result = await emailService.sendEmail({
      content: {
        subject,
        html,
      },
      options: {
        to: recipient,
        from: {
          email: process.env.NEXT_PUBLIC_EMAIL_FROM || "noreply@foodshare.app",
          name: process.env.NEXT_PUBLIC_EMAIL_FROM_NAME || "FoodShare",
        },
      },
      emailType: "feedback",
    });

    return result;
  } catch (error) {
    logger.error("Failed to send feedback notification", error as Error, {
      adminEmail: params.adminEmail,
      feedbackId: params.feedbackId,
    });
    throw error;
  }
}

/**
 * Send a review reminder email
 */
export async function sendReviewReminder(params: {
  recipientEmail: string;
  recipientName?: string;
  transactionId: string;
  otherUserName: string;
}) {
  try {
    const emailService = await createEmailService();

    // Prepare template data
    const templateData: ReviewReminderData = {
      transactionId: params.transactionId,
      otherUserName: params.otherUserName,
    };

    // Render email template
    const { html, subject } = await renderEmailTemplate("review-reminder", templateData);

    // Prepare recipient
    const recipient: EmailAddress = {
      email: params.recipientEmail,
      ...(params.recipientName && { name: params.recipientName }),
    };

    // Send email
    const result = await emailService.sendEmail({
      content: {
        subject,
        html,
      },
      options: {
        to: recipient,
        from: {
          email: process.env.NEXT_PUBLIC_EMAIL_FROM || "noreply@foodshare.app",
          name: process.env.NEXT_PUBLIC_EMAIL_FROM_NAME || "FoodShare",
        },
      },
      emailType: "review_reminder",
    });

    return result;
  } catch (error) {
    logger.error("Failed to send review reminder", error as Error, {
      recipientEmail: params.recipientEmail,
      transactionId: params.transactionId,
    });
    throw error;
  }
}

/**
 * Notify all admins about new feedback
 */
export async function notifyAdminsOfFeedback(params: {
  feedbackId: string;
  feedbackType: string;
  subject: string;
  submitterName: string;
  submitterEmail: string;
  messagePreview: string;
}) {
  try {
    // This function would typically fetch all admin users from the database
    // For now, we'll use a placeholder implementation
    // You should replace this with actual admin fetching logic

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Fetch all admin users using user_roles table (source of truth for admin status)
    const { data: admins, error } = await supabase
      .from("user_roles")
      .select("profiles!inner(id, email, first_name, second_name), roles!inner(name)")
      .in("roles.name", ["admin", "superadmin"]);

    if (error) {
      logger.error("Failed to fetch admins", error as Error);
      return;
    }

    if (!admins || admins.length === 0) {
      logger.debug("No admins found to notify");
      return;
    }

    // Send notification to each admin
    interface AdminUserRole {
      profiles: {
        id: string;
        email: string;
        first_name: string | null;
        second_name: string | null;
      };
      roles: {
        name: string;
      };
    }

    const results = await Promise.allSettled(
      (admins as unknown as AdminUserRole[]).map((adminRole) =>
        sendFeedbackNotification({
          adminEmail: adminRole.profiles.email,
          adminName:
            [adminRole.profiles.first_name, adminRole.profiles.second_name]
              .filter(Boolean)
              .join(" ") || undefined,
          ...params,
        })
      )
    );

    // Log results
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    logger.info("Feedback notifications sent", { successful, failed });

    return { successful, failed };
  } catch (error) {
    logger.error("Failed to notify admins", error as Error);
    throw error;
  }
}
