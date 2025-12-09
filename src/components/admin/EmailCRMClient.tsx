"use client";

/**
 * EmailCRMClient - Comprehensive email CRM management interface
 * Combines email stats, manual sending, and email logs
 */

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EmailStatsDashboard } from "./EmailStatsDashboard";

// Icons
import { Send, Mail, Users, AlertCircle, CheckCircle, Clock } from "lucide-react";

// Icon aliases for minimal code changes
const FiSend = Send;
const FiMail = Mail;
const FiUsers = Users;
const FiAlertCircle = AlertCircle;
const FiCheckCircle = CheckCircle;
const FiClock = Clock;

// Types
interface EmailFormData {
  to: string;
  subject: string;
  message: string;
  emailType: string;
  provider: string;
  useHtml: boolean;
}

interface SendResult {
  success: boolean;
  message: string;
}

const EMAIL_TYPES = [
  { value: "chat", label: "Chat Notification" },
  { value: "food_listing", label: "Food Listing" },
  { value: "feedback", label: "Feedback Request" },
  { value: "review_reminder", label: "Review Reminder" },
  { value: "auth", label: "Authentication" },
  { value: "newsletter", label: "Newsletter" },
  { value: "announcement", label: "Announcement" },
];

const PROVIDERS = [
  { value: "auto", label: "Auto-select (Smart Routing)", limit: null },
  { value: "brevo", label: "Brevo (Primary)", limit: 300 },
  { value: "resend", label: "Resend (Auth)", limit: 100 },
  { value: "aws_ses", label: "AWS SES (Failover)", limit: 100 },
];

export function EmailCRMClient() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<"compose" | "stats" | "templates">("stats");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  const [formData, setFormData] = useState<EmailFormData>({
    to: "",
    subject: "",
    message: "",
    emailType: "chat",
    provider: "auto",
    useHtml: false,
  });

  const handleChange = (field: keyof EmailFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      // Simulate API call - replace with actual email sending
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setResult({
        success: true,
        message: `Email sent successfully to ${formData.to}`,
      });

      // Reset form on success
      setFormData({
        to: "",
        subject: "",
        message: "",
        emailType: "chat",
        provider: "auto",
        useHtml: false,
      });
    } catch {
      setResult({
        success: false,
        message: "Failed to send email. Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const clearForm = () => {
    setFormData({
      to: "",
      subject: "",
      message: "",
      emailType: "chat",
      provider: "auto",
      useHtml: false,
    });
    setResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <TabButton
          active={activeTab === "stats"}
          onClick={() => setActiveTab("stats")}
          icon={<FiMail className="h-4 w-4" />}
          label="Statistics"
        />
        <TabButton
          active={activeTab === "compose"}
          onClick={() => setActiveTab("compose")}
          icon={<FiSend className="h-4 w-4" />}
          label="Compose"
        />
        <TabButton
          active={activeTab === "templates"}
          onClick={() => setActiveTab("templates")}
          icon={<FiUsers className="h-4 w-4" />}
          label="Templates"
        />
      </div>

      {/* Stats Tab */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          <EmailStatsDashboard />

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickActionCard
                icon={<FiSend className="h-5 w-5" />}
                label="Send Test Email"
                onClick={() => setActiveTab("compose")}
              />
              <QuickActionCard
                icon={<FiUsers className="h-5 w-5" />}
                label="Bulk Email"
                onClick={() => setActiveTab("compose")}
              />
              <QuickActionCard
                icon={<FiClock className="h-5 w-5" />}
                label="View Queue"
                onClick={() => {}}
              />
              <QuickActionCard
                icon={<FiAlertCircle className="h-5 w-5" />}
                label="Failed Emails"
                onClick={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* Compose Tab */}
      {activeTab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Form */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6">
              Compose Email
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Recipient */}
              <div>
                <Label htmlFor="to">Recipient Email *</Label>
                <Input
                  id="to"
                  type="email"
                  value={formData.to}
                  onChange={(e) => handleChange("to", e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>

              {/* Subject */}
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleChange("subject", e.target.value)}
                  placeholder="Email subject..."
                  required
                />
              </div>

              {/* Email Type & Provider */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emailType">Email Type</Label>
                  <Select
                    value={formData.emailType}
                    onValueChange={(value) => handleChange("emailType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value) => handleChange("provider", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                          {provider.limit && (
                            <span className="text-gray-400 ml-1">({provider.limit}/day)</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="message">Message *</Label>
                  <label className="flex items-center text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.useHtml}
                      onChange={(e) => handleChange("useHtml", e.target.checked)}
                      className="mr-2 rounded"
                    />
                    HTML Mode
                  </label>
                </div>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                  rows={10}
                  placeholder={
                    formData.useHtml ? "<p>HTML content...</p>" : "Plain text message..."
                  }
                  className="font-mono text-sm"
                  required
                />
              </div>

              {/* Result Message */}
              {result && (
                <div
                  className={cn(
                    "p-4 rounded-lg flex items-center gap-3",
                    result.success
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                  )}
                >
                  {result.success ? (
                    <FiCheckCircle className="h-5 w-5 flex-shrink-0" />
                  ) : (
                    <FiAlertCircle className="h-5 w-5 flex-shrink-0" />
                  )}
                  <p className="text-sm font-medium">{result.message}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={sending} className="flex-1">
                  <FiSend className="h-4 w-4 mr-2" />
                  {sending ? "Sending..." : "Send Email"}
                </Button>
                <Button type="button" variant="outline" onClick={clearForm}>
                  Clear
                </Button>
              </div>
            </form>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Provider Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
                Smart Routing Info
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <li>• Auto-select uses smart routing based on quota</li>
                <li>• Brevo: Primary for app notifications</li>
                <li>• Resend: Prioritized for auth emails</li>
                <li>• AWS SES: Failover when others exhausted</li>
              </ul>
            </div>

            {/* Recent Emails */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="font-medium text-gray-800 dark:text-gray-100 mb-3">Recent Emails</h4>
              <div className="space-y-3">
                <RecentEmailItem
                  to="user@example.com"
                  subject="Welcome to FoodShare"
                  status="sent"
                  time="2 min ago"
                />
                <RecentEmailItem
                  to="test@example.com"
                  subject="New listing nearby"
                  status="sent"
                  time="15 min ago"
                />
                <RecentEmailItem
                  to="admin@example.com"
                  subject="Weekly report"
                  status="queued"
                  time="1 hour ago"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
            Email Templates
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Email templates management coming soon...
          </p>
        </div>
      )}
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
        active
          ? "border-green-500 text-green-600 dark:text-green-400"
          : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// Quick Action Card Component
function QuickActionCard({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
    >
      <div className="text-green-600 dark:text-green-400">{icon}</div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
    </button>
  );
}

// Recent Email Item Component
function RecentEmailItem({
  to,
  subject,
  status,
  time,
}: {
  to: string;
  subject: string;
  status: "sent" | "queued" | "failed";
  time: string;
}) {
  const statusColors = {
    sent: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    queued: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{subject}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{to}</p>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <Badge variant="outline" className={cn("text-xs", statusColors[status])}>
          {status}
        </Badge>
        <span className="text-xs text-gray-400">{time}</span>
      </div>
    </div>
  );
}
