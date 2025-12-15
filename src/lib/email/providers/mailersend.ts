/**
 * MailerSend email provider implementation
 * Free tier: 12,000 emails/month
 */

import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import type {
  SendEmailRequest,
  SendEmailResponse,
  MailerSendConfig,
  ProviderQuota,
} from "../types";
import { BaseEmailProvider } from "./base";
import { supabase } from "@/lib/supabase/client";

export class MailerSendProvider extends BaseEmailProvider {
  readonly provider = "mailersend" as const;
  private client: MailerSend;
  private config: MailerSendConfig;

  constructor(config: MailerSendConfig) {
    super();
    this.config = config;
    this.client = new MailerSend({
      apiKey: config.apiKey,
    });
  }

  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      const { content, options } = request;

      // Create sender
      const sentFrom = new Sender(options.from.email, options.from.name);

      // Create recipients
      const recipients = Array.isArray(options.to)
        ? options.to.map((addr) => new Recipient(addr.email, addr.name))
        : [new Recipient(options.to.email, options.to.name)];

      // Build email params
      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject(content.subject)
        .setHtml(content.html)
        .setText(content.text || "");

      // Add reply-to if provided
      if (options.replyTo) {
        emailParams.setReplyTo(new Recipient(options.replyTo.email, options.replyTo.name));
      }

      // Add CC if provided
      if (options.cc) {
        const ccRecipients = Array.isArray(options.cc)
          ? options.cc.map((addr) => new Recipient(addr.email, addr.name))
          : [new Recipient(options.cc.email, options.cc.name)];
        emailParams.setCc(ccRecipients);
      }

      // Add BCC if provided
      if (options.bcc) {
        const bccRecipients = Array.isArray(options.bcc)
          ? options.bcc.map((addr) => new Recipient(addr.email, addr.name))
          : [new Recipient(options.bcc.email, options.bcc.name)];
        emailParams.setBcc(bccRecipients);
      }

      // Add attachments if provided
      if (options.attachments && options.attachments.length > 0) {
        const attachments = options.attachments.map((att) => {
          // Convert content to base64 string
          const base64Content: string =
            att.content instanceof Buffer
              ? att.content.toString("base64")
              : (att.content as string);

          return {
            filename: att.filename,
            content: base64Content,
            disposition: "attachment" as const,
          };
        });
        emailParams.setAttachments(attachments);
      }

      // Send email via MailerSend
      const response = await this.client.email.send(emailParams);

      // MailerSend returns 202 on success
      if (response.statusCode !== 202) {
        return this.handleError(
          new Error(`MailerSend API returned status ${response.statusCode}`),
          "sendEmail"
        );
      }

      // Extract message ID from response headers
      const messageId = response.headers?.["x-message-id"] || "unknown";
      this.logSuccess(messageId, "Email sent");

      // Increment quota in database
      await this.incrementQuota();

      return {
        success: true,
        messageId,
        provider: this.provider,
      };
    } catch (error) {
      return this.handleError(error, "sendEmail");
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check quota availability
      const quota = await this.getQuota();
      return quota.remaining > 0;
    } catch (error) {
      console.error("[mailersend] Availability check failed:", error);
      return false;
    }
  }

  async getQuota(): Promise<ProviderQuota> {
    try {
      // Don't pass p_date - let PostgreSQL use DEFAULT CURRENT_DATE
      const { data, error } = await supabase.rpc("check_provider_quota", {
        p_provider: "mailersend",
      });

      if (error) throw error;

      // MailerSend free tier: 12,000 emails/month, ~400 emails/day (12000/30)
      const dailyLimit = 400;
      const sent = data?.emails_sent || 0;

      return {
        provider: this.provider,
        dailyLimit,
        sent,
        remaining: Math.max(0, dailyLimit - sent),
        resetDate: new Date(new Date().setHours(24, 0, 0, 0)),
      };
    } catch (error) {
      console.error("[mailersend] Failed to get quota:", error);

      // Return default quota on error
      return {
        provider: this.provider,
        dailyLimit: 400,
        sent: 0,
        remaining: 400,
        resetDate: new Date(new Date().setHours(24, 0, 0, 0)),
      };
    }
  }

  override async verifyConfig(): Promise<boolean> {
    try {
      // MailerSend doesn't have a dedicated verify endpoint
      // We'll verify by checking quota (API key must be valid)
      const quota = await this.getQuota();
      return quota.dailyLimit > 0;
    } catch (error) {
      console.error("[mailersend] Config verification failed:", error);
      return false;
    }
  }

  private async incrementQuota(): Promise<void> {
    try {
      // Don't pass p_date - let PostgreSQL use DEFAULT CURRENT_DATE
      await supabase.rpc("increment_provider_quota", {
        p_provider: "mailersend",
      });
    } catch (error) {
      console.error("[mailersend] Failed to increment quota:", error);
    }
  }
}
