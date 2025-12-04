/**
 * Resend email provider implementation
 * Free tier: 100 emails/day, 3,000/month
 */

import { Resend } from "resend";
import { BaseEmailProvider } from "./base";
import type {
  SendEmailRequest,
  SendEmailResponse,
  ResendConfig,
  ProviderQuota,
  EmailAddress,
} from "../types";
import { supabase } from "@/lib/supabase/client";

export class ResendProvider extends BaseEmailProvider {
  readonly provider = "resend" as const;
  private client: Resend;
  private config: ResendConfig;

  constructor(config: ResendConfig) {
    super();
    this.config = config;
    this.client = new Resend(config.apiKey);
  }

  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      const { content, options } = request;

      // Format recipients
      const to = Array.isArray(options.to)
        ? options.to.map((addr) => this.formatAddress(addr))
        : this.formatAddress(options.to);

      // Send email via Resend
      const response = await this.client.emails.send({
        from: this.formatAddress(options.from),
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
        replyTo: options.replyTo ? this.formatAddress(options.replyTo) : undefined,
        cc: options.cc
          ? Array.isArray(options.cc)
            ? options.cc.map((addr) => this.formatAddress(addr))
            : this.formatAddress(options.cc)
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc.map((addr) => this.formatAddress(addr))
            : this.formatAddress(options.bcc)
          : undefined,
        headers: options.headers,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content instanceof Buffer ? att.content : Buffer.from(att.content),
        })),
      });

      if (response.error) {
        return this.handleError(response.error, "sendEmail");
      }

      const messageId = response.data?.id || "unknown";
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
      console.error("[resend] Availability check failed:", error);
      return false;
    }
  }

  async getQuota(): Promise<ProviderQuota> {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase.rpc("check_provider_quota", {
        p_provider: "resend",
        p_date: today,
      });

      if (error) throw error;

      const dailyLimit = 100;
      const sent = data?.emails_sent || 0;

      return {
        provider: this.provider,
        dailyLimit,
        sent,
        remaining: Math.max(0, dailyLimit - sent),
        resetDate: new Date(new Date().setHours(24, 0, 0, 0)),
      };
    } catch (error) {
      console.error("[resend] Failed to get quota:", error);

      // Return default quota on error
      return {
        provider: this.provider,
        dailyLimit: 100,
        sent: 0,
        remaining: 100,
        resetDate: new Date(new Date().setHours(24, 0, 0, 0)),
      };
    }
  }

  override async verifyConfig(): Promise<boolean> {
    try {
      // Try to fetch API keys to verify the API key is valid
      // Resend doesn't have a dedicated verify endpoint, so we check quota
      const quota = await this.getQuota();
      return quota.dailyLimit > 0;
    } catch (error) {
      console.error("[resend] Config verification failed:", error);
      return false;
    }
  }

  private async incrementQuota(): Promise<void> {
    try {
      const today = new Date().toISOString().split("T")[0];

      await supabase.rpc("increment_provider_quota", {
        p_provider: "resend",
        p_date: today,
      });
    } catch (error) {
      console.error("[resend] Failed to increment quota:", error);
    }
  }

  private formatAddress(address: EmailAddress): string {
    if (address.name) {
      return `${address.name} <${address.email}>`;
    }
    return address.email;
  }
}
