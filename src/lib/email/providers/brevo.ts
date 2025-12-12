/**
 * Brevo (formerly Sendinblue) email provider implementation
 * Free tier: 300 emails/day
 */

import * as brevo from "@getbrevo/brevo";
import type {
  SendEmailRequest,
  SendEmailResponse,
  BrevoConfig,
  ProviderQuota,
  EmailAddress,
} from "../types";
import { BaseEmailProvider } from "./base";
import { supabase } from "@/lib/supabase/client";

export class BrevoProvider extends BaseEmailProvider {
  readonly provider = "brevo" as const;
  private client: brevo.TransactionalEmailsApi;
  private accountApi: brevo.AccountApi;
  private config: BrevoConfig;

  constructor(config: BrevoConfig) {
    super();
    this.config = config;

    // Initialize Brevo API client with new SDK
    this.client = new brevo.TransactionalEmailsApi();
    this.client.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, config.apiKey);

    this.accountApi = new brevo.AccountApi();
    this.accountApi.setApiKey(brevo.AccountApiApiKeys.apiKey, config.apiKey);
  }

  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      const { content, options } = request;

      // Prepare email data using new SDK
      const sendSmtpEmail = new brevo.SendSmtpEmail();

      sendSmtpEmail.sender = this.formatBrevoAddress(options.from);
      sendSmtpEmail.to = Array.isArray(options.to)
        ? options.to.map((addr) => this.formatBrevoAddress(addr))
        : [this.formatBrevoAddress(options.to)];

      sendSmtpEmail.subject = content.subject;
      sendSmtpEmail.htmlContent = content.html;
      if (content.text) {
        sendSmtpEmail.textContent = content.text;
      }

      if (options.replyTo) {
        sendSmtpEmail.replyTo = this.formatBrevoAddress(options.replyTo);
      }

      if (options.cc) {
        sendSmtpEmail.cc = Array.isArray(options.cc)
          ? options.cc.map((addr) => this.formatBrevoAddress(addr))
          : [this.formatBrevoAddress(options.cc)];
      }

      if (options.bcc) {
        sendSmtpEmail.bcc = Array.isArray(options.bcc)
          ? options.bcc.map((addr) => this.formatBrevoAddress(addr))
          : [this.formatBrevoAddress(options.bcc)];
      }

      if (options.attachments && options.attachments.length > 0) {
        sendSmtpEmail.attachment = options.attachments.map((att) => ({
          name: att.filename,
          content:
            att.content instanceof Buffer
              ? att.content.toString("base64")
              : Buffer.from(att.content).toString("base64"),
        }));
      }

      if (options.headers) {
        sendSmtpEmail.headers = options.headers;
      }

      // Send email via Brevo
      const response = await this.client.sendTransacEmail(sendSmtpEmail);

      const messageId = response.body.messageId || "unknown";
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
    } catch {
      return false;
    }
  }

  async getQuota(): Promise<ProviderQuota> {
    try {
      // Don't pass p_date - let PostgreSQL use DEFAULT CURRENT_DATE
      // This avoids type mismatch issues (string vs date)
      const { data, error } = await supabase.rpc("check_provider_quota", {
        p_provider: "brevo",
      });

      if (error) throw error;

      const dailyLimit = 300;
      const sent = data?.emails_sent || 0;

      return {
        provider: this.provider,
        dailyLimit,
        sent,
        remaining: Math.max(0, dailyLimit - sent),
        resetDate: new Date(new Date().setHours(24, 0, 0, 0)),
      };
    } catch {
      // Return default quota on error
      return {
        provider: this.provider,
        dailyLimit: 300,
        sent: 0,
        remaining: 300,
        resetDate: new Date(new Date().setHours(24, 0, 0, 0)),
      };
    }
  }

  override async verifyConfig(): Promise<boolean> {
    try {
      // Verify API key by attempting to get account info
      await this.accountApi.getAccount();
      return true;
    } catch {
      return false;
    }
  }

  private async incrementQuota(): Promise<void> {
    try {
      // Don't pass p_date - let PostgreSQL use DEFAULT CURRENT_DATE
      await supabase.rpc("increment_provider_quota", {
        p_provider: "brevo",
      });
    } catch {
      // Silently fail - quota tracking is non-critical
    }
  }

  private formatBrevoAddress(address: EmailAddress): { email: string; name?: string } {
    return {
      email: address.email,
      ...(address.name && { name: address.name }),
    };
  }
}
