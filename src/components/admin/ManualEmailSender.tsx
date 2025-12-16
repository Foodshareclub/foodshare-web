"use client";

/**
 * ManualEmailSender - Admin interface for sending manual emails
 * Allows admins to send emails with custom provider selection
 * Optimized with custom hooks and constants
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useManualEmailSender } from "@/hooks/useEmailManagement";
import { PROVIDER_NAMES, PROVIDER_LIMITS, EMAIL_TYPE_NAMES } from "@/lib/email/constants";
import type { EmailProvider, EmailType } from "@/lib/email/types";

// Local type definitions (previously in @/api/admin/emailManagement)
export interface ManualEmailRequest {
  to: string;
  subject: string;
  html: string;
  emailType: EmailType;
  provider?: EmailProvider;
}

interface FormData {
  to: string;
  subject: string;
  message: string;
  emailType: EmailType;
  provider?: EmailProvider;
  useHtml: boolean;
}

export function ManualEmailSender() {
  const t = useTranslations();
  const [formData, setFormData] = useState<FormData>({
    to: "",
    subject: "",
    message: "",
    emailType: "chat",
    provider: undefined,
    useHtml: false,
  });

  // Use optimized hook for sending emails
  const { sendEmail, sending, result, clearResult } = useManualEmailSender();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.to || !formData.subject || !formData.message) {
      return;
    }

    // Convert plain text to HTML if needed
    const html = formData.useHtml
      ? formData.message
      : `<p>${formData.message.replace(/\n/g, "<br>")}</p>`;

    const request: ManualEmailRequest = {
      to: formData.to,
      subject: formData.subject,
      html,
      emailType: formData.emailType,
      provider: formData.provider,
    };

    const response = await sendEmail(request);

    // Reset form on success
    if (response.success) {
      setFormData({
        to: "",
        subject: "",
        message: "",
        emailType: "chat",
        provider: undefined,
        useHtml: false,
      });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Send Manual Email</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Recipient Email */}
        <div>
          <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-1">
            Recipient Email *
          </label>
          <input
            id="to"
            type="email"
            value={formData.to}
            onChange={(e) => setFormData({ ...formData, to: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="user@example.com"
            required
          />
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            Subject *
          </label>
          <input
            id="subject"
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Email subject..."
            required
          />
        </div>

        {/* Message */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">
              Message *
            </label>
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={formData.useHtml}
                onChange={(e) => setFormData({ ...formData, useHtml: e.target.checked })}
                className="mr-2 rounded"
              />
              HTML Mode
            </label>
          </div>
          <textarea
            id="message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
            rows={10}
            placeholder={formData.useHtml ? "<p>HTML content...</p>" : "Plain text message..."}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.useHtml
              ? "Enter HTML content for the email body"
              : "Enter plain text (will be converted to HTML automatically)"}
          </p>
        </div>

        {/* Email Type */}
        <div>
          <label htmlFor="emailType" className="block text-sm font-medium text-gray-700 mb-1">
            Email Type
          </label>
          <select
            id="emailType"
            value={formData.emailType}
            onChange={(e) => setFormData({ ...formData, emailType: e.target.value as EmailType })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="chat">{EMAIL_TYPE_NAMES.chat}</option>
            <option value="food_listing">{EMAIL_TYPE_NAMES.food_listing}</option>
            <option value="feedback">{EMAIL_TYPE_NAMES.feedback}</option>
            <option value="review_reminder">{EMAIL_TYPE_NAMES.review_reminder}</option>
            <option value="auth">{EMAIL_TYPE_NAMES.auth}</option>
          </select>
        </div>

        {/* Provider Selection */}
        <div>
          <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">
            Provider (Route/Channel)
          </label>
          <select
            id="provider"
            value={formData.provider || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                provider: e.target.value ? (e.target.value as EmailProvider) : undefined,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">{t("auto_select_smart_routing")}</option>
            <option value="brevo">
              {PROVIDER_NAMES.brevo} (Primary - {PROVIDER_LIMITS.brevo}/day)
            </option>
            <option value="resend">
              {PROVIDER_NAMES.resend} (Auth - {PROVIDER_LIMITS.resend}/day)
            </option>
            <option value="aws_ses">
              {PROVIDER_NAMES.aws_ses} (Failover - {PROVIDER_LIMITS.aws_ses}/day)
            </option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Leave as &quot;Auto-select&quot; to use smart routing based on quota availability
          </p>
        </div>

        {/* Result Message */}
        {result && (
          <div
            className={`p-4 rounded-md ${
              result.success
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            <p className="text-sm font-medium">{result.message}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={sending}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {sending ? "Sending..." : "Send Email"}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                to: "",
                subject: "",
                message: "",
                emailType: "chat",
                provider: undefined,
                useHtml: false,
              });
              clearResult();
            }}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-sm font-medium text-blue-800 mb-2">About Smart Routing</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Auto-select uses smart routing to choose the best available provider</li>
          <li>• Brevo is prioritized for app notifications (300/day limit)</li>
          <li>• Resend is prioritized for authentication emails (100/day limit)</li>
          <li>• AWS SES is used as failover when others are exhausted (100/day limit)</li>
          <li>• Emails are queued and processed by the Edge Function</li>
        </ul>
      </div>
    </div>
  );
}
