"use client";

/**
 * EmailSendingHistory - Display recent email logs and queue status
 * Shows delivery history, failed emails, and queued items
 * Optimized with custom hooks and constants
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { type EmailLogEntry, type QueuedEmailEntry } from "@/api/admin/emailManagement";
import { useEmailLogs, useQueuedEmails } from "@/hooks/useEmailManagement";
import { PROVIDER_NAMES } from "@/lib/email/constants";
import type { EmailProvider } from "@/lib/email/types";

interface EmailLogRowProps {
  log: EmailLogEntry;
}

function EmailLogRow({ log }: EmailLogRowProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return "bg-green-100 text-green-800";
      case "failed":
      case "bounced":
        return "bg-red-100 text-red-800";
      case "queued":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProviderColor = (provider: EmailProvider) => {
    const colors: Record<EmailProvider, string> = {
      brevo: "text-purple-600",
      resend: "text-blue-600",
      aws_ses: "text-orange-600",
    };
    return colors[provider] || "text-gray-600";
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-600">{new Date(log.sent_at).toLocaleString()}</td>
      <td className="px-4 py-3 text-sm text-gray-800">{log.recipient_email}</td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{log.subject}</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium uppercase ${getProviderColor(log.provider)}`}>
          {log.provider}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(log.status)}`}
        >
          {log.status}
        </span>
      </td>
    </tr>
  );
}

interface QueuedEmailRowProps {
  email: QueuedEmailEntry;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
}

function QueuedEmailRow({ email, onRetry, onDelete }: QueuedEmailRowProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "queued":
        return "bg-blue-100 text-blue-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-600">
        {new Date(email.created_at).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-sm text-gray-800">{email.recipient_email}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{email.email_type}</td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(email.status)}`}
        >
          {email.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {email.attempts}/{email.max_attempts}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          {email.status === "failed" && (
            <>
              <button
                onClick={() => onRetry(email.id)}
                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => onDelete(email.id)}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export function EmailSendingHistory() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<"logs" | "queue">("logs");

  // Filters
  const [providerFilter, setProviderFilter] = useState<EmailProvider | "">("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Use optimized hooks with request cancellation
  const {
    logs,
    loading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useEmailLogs({
    provider: providerFilter || undefined,
    emailType: undefined,
    status: statusFilter || undefined,
    hours: 24,
  });

  const {
    emails: queuedEmails,
    loading: queueLoading,
    error: queueError,
    refetch: refetchQueue,
    retry: handleRetryEmail,
    deleteEmail: handleDeleteEmail,
  } = useQueuedEmails(undefined);

  // Determine current loading and error state based on active tab
  const loading = activeTab === "logs" ? logsLoading : queueLoading;
  const error = activeTab === "logs" ? logsError : queueError;

  // Handlers
  const handleRetry = async (id: string) => {
    const result = await handleRetryEmail(id);
    if (!result.success) {
      alert(`Failed to retry email: ${result.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this queued email?")) {
      return;
    }

    const result = await handleDeleteEmail(id);
    if (!result.success) {
      alert(`Failed to delete email: ${result.error}`);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header with Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex justify-between items-center p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("logs")}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === "logs"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Delivery Logs
            </button>
            <button
              onClick={() => setActiveTab("queue")}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === "queue"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Queue ({queuedEmails.length})
            </button>
          </div>
          <button
            onClick={() => (activeTab === "logs" ? refetchLogs() : refetchQueue())}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Filters */}
        {activeTab === "logs" && (
          <div className="flex gap-4 px-4 pb-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Provider</label>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value as EmailProvider | "")}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">{t("all_providers")}</option>
                <option value="brevo">{PROVIDER_NAMES.brevo}</option>
                <option value="resend">{PROVIDER_NAMES.resend}</option>
                <option value="aws_ses">{PROVIDER_NAMES.aws_ses}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">{t("all_status")}</option>
                <option value="sent">{t("sent")}</option>
                <option value="delivered">{t("delivered")}</option>
                <option value="failed">{t("failed")}</option>
                <option value="bounced">{t("bounced")}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="overflow-x-auto">
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        )}

        {error && (
          <div className="p-6 text-center text-red-600">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && activeTab === "logs" && (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Sent At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Recipient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Provider
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    No email logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => <EmailLogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        )}

        {!loading && !error && activeTab === "queue" && (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Recipient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Attempts
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {queuedEmails.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No queued emails
                  </td>
                </tr>
              ) : (
                queuedEmails.map((email) => (
                  <QueuedEmailRow
                    key={email.id}
                    email={email}
                    onRetry={handleRetry}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
