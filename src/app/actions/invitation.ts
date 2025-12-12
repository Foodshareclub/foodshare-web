"use server";

import { createClient } from "@/lib/supabase/server";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import { createUnifiedEmailService } from "@/lib/email/unified-service";
import { trackEvent } from "@/app/actions/analytics";

/**
 * Send invitations to collaborators
 */
export async function sendInvitations(emails: string[]): Promise<ServerActionResult<void>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return serverActionError("You must be logged in to send invitations", "UNAUTHORIZED");
    }

    // Validate emails
    const validEmails = emails.filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (validEmails.length === 0) {
      return serverActionError("No valid emails provided", "VALIDATION_ERROR");
    }

    const emailService = await createUnifiedEmailService();
    const fromName = user.user_metadata?.first_name || "A FoodShare User";

    const promises = validEmails.map((email) =>
      emailService.sendEmail({
        content: {
          subject: `${fromName} invited you to join FoodShare`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You've been invited!</h2>
              <p>Your colleague ${fromName} (${user.email}) has invited you to join FoodShare.</p>
              <p>FoodShare helps teams share food and reduce waste.</p>
              <div style="margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://foodshare.club"}" 
                   style="background-color: #2F855A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Join FoodShare
                </a>
              </div>
              <p style="color: #718096; font-size: 14px;">
                You received this email because ${user.email} invited you.
              </p>
            </div>
          `,
        },
        options: {
          to: { email },
          // UnifiedEmailService will use default FROM if not specified, but we can override if needed
          // We rely on the service to handle the 'from' address correctly
          from: { email: "contact@foodshare.club", name: "FoodShare" },
        },
        emailType: "announcement",
      })
    );

    await Promise.allSettled(promises);

    // Track analytics event
    await trackEvent("Invitation Sent", {
      count: validEmails.length,
      recipients: validEmails,
    });

    return successVoid();
  } catch (error) {
    console.error("Failed to send invitations:", error);
    return serverActionError("Failed to send invitations", "UNKNOWN_ERROR");
  }
}
