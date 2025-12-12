/**
 * Base email provider interface
 * All email providers must implement this interface
 */

import type { SendEmailRequest, SendEmailResponse, EmailProvider, ProviderQuota } from "../types";

export interface IEmailProvider {
  /**
   * The provider identifier
   */
  readonly provider: EmailProvider;

  /**
   * Send an email using this provider
   */
  sendEmail(request: SendEmailRequest): Promise<SendEmailResponse>;

  /**
   * Check if the provider is available and configured correctly
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the current quota status for this provider
   */
  getQuota(): Promise<ProviderQuota>;

  /**
   * Verify the provider configuration is valid
   */
  verifyConfig(): Promise<boolean>;
}

export abstract class BaseEmailProvider implements IEmailProvider {
  abstract readonly provider: EmailProvider;

  abstract sendEmail(request: SendEmailRequest): Promise<SendEmailResponse>;

  abstract isAvailable(): Promise<boolean>;

  abstract getQuota(): Promise<ProviderQuota>;

  async verifyConfig(): Promise<boolean> {
    try {
      return await this.isAvailable();
    } catch (error) {
      console.error(`[${this.provider}] Configuration verification failed:`, error);
      return false;
    }
  }

  protected handleError(error: unknown, operation: string): SendEmailResponse {
    let errorMessage: string;

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null) {
      // Handle Resend/Brevo error objects like { name: string, message: string }
      const errObj = error as Record<string, unknown>;
      errorMessage = (errObj.message as string) || (errObj.name as string) || JSON.stringify(error);
    } else {
      errorMessage = String(error);
    }

    console.error(`[${this.provider}] ${operation} failed:`, errorMessage);

    return {
      success: false,
      provider: this.provider,
      error: errorMessage,
    };
  }

  protected logSuccess(messageId: string, operation: string): void {
    console.log(`[${this.provider}] ${operation} successful. Message ID: ${messageId}`);
  }
}
