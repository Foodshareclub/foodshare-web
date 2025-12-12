/**
 * AWS SES email provider implementation
 * Free tier: 62,000 emails/month when sending from EC2 (or 3,000/month otherwise)
 * Using conservative 100/day limit for safety
 */

import { SESClient, SendEmailCommand, VerifyEmailIdentityCommand } from "@aws-sdk/client-ses";
import type {
  SendEmailRequest,
  SendEmailResponse,
  AWSSESConfig,
  ProviderQuota,
  EmailAddress,
} from "../types";
import { BaseEmailProvider } from "./base";
import { supabase } from "@/lib/supabase/client";

export class AWSSESProvider extends BaseEmailProvider {
  readonly provider = "aws_ses" as const;
  private client: SESClient;
  private config: AWSSESConfig;

  constructor(config: AWSSESConfig) {
    super();
    this.config = config;

    // Initialize AWS SES client
    this.client = new SESClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      const { content, options } = request;

      // Format recipients
      const toAddresses = Array.isArray(options.to)
        ? options.to.map((addr) => addr.email)
        : [options.to.email];

      const ccAddresses = options.cc
        ? Array.isArray(options.cc)
          ? options.cc.map((addr) => addr.email)
          : [options.cc.email]
        : undefined;

      const bccAddresses = options.bcc
        ? Array.isArray(options.bcc)
          ? options.bcc.map((addr) => addr.email)
          : [options.bcc.email]
        : undefined;

      // Prepare email command
      const command = new SendEmailCommand({
        Source: this.formatAddress(options.from),
        Destination: {
          ToAddresses: toAddresses,
          CcAddresses: ccAddresses,
          BccAddresses: bccAddresses,
        },
        Message: {
          Subject: {
            Data: content.subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: content.html,
              Charset: "UTF-8",
            },
            ...(content.text && {
              Text: {
                Data: content.text,
                Charset: "UTF-8",
              },
            }),
          },
        },
        ReplyToAddresses: options.replyTo ? [options.replyTo.email] : undefined,
      });

      // Send email via AWS SES
      const response = await this.client.send(command);

      const messageId = response.MessageId || "unknown";
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
      console.error("[aws_ses] Availability check failed:", error);
      return false;
    }
  }

  async getQuota(): Promise<ProviderQuota> {
    try {
      // Don't pass p_date - let PostgreSQL use DEFAULT CURRENT_DATE
      // This avoids type mismatch issues (string vs date)
      const { data, error } = await supabase.rpc("check_provider_quota", {
        p_provider: "aws_ses",
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
      console.error("[aws_ses] Failed to get quota:", error);

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
      // Verify by checking if we can send a verification request
      // This doesn't actually send an email, just validates credentials
      const command = new VerifyEmailIdentityCommand({
        EmailAddress: this.config.fromEmail,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      console.error("[aws_ses] Config verification failed:", error);
      return false;
    }
  }

  private async incrementQuota(): Promise<void> {
    try {
      // Don't pass p_date - let PostgreSQL use DEFAULT CURRENT_DATE
      await supabase.rpc("increment_provider_quota", {
        p_provider: "aws_ses",
      });
    } catch (error) {
      console.error("[aws_ses] Failed to increment quota:", error);
    }
  }

  private formatAddress(address: EmailAddress): string {
    if (address.name) {
      return `${address.name} <${address.email}>`;
    }
    return address.email;
  }
}
