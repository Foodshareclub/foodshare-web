"use client";

import { useState, useTransition } from "react";
import { Send, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { GlassCard } from "../shared/GlassCard";
import { QuickTemplateButton } from "../shared/EmptyState";
import { EMAIL_TYPES, PROVIDERS } from "../constants";
import type { EmailFormData } from "../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendAdminEmail, sendTestEmailDirect } from "@/app/actions/email";
import type { EmailType } from "@/lib/email/types";

export function ComposeTab() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState<EmailFormData>({
    to: "",
    subject: "",
    message: "",
    emailType: "newsletter",
    provider: "auto",
    useHtml: false,
  });

  const handleChange = (field: keyof EmailFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    startTransition(async () => {
      const response = await sendAdminEmail({
        to: formData.to,
        subject: formData.subject,
        message: formData.message,
        useHtml: formData.useHtml,
        emailType: formData.emailType as EmailType,
      });

      if (response.success) {
        setResult({
          success: true,
          message: `Email sent! ID: ${response.data?.messageId}`,
        });
        setFormData({
          to: "",
          subject: "",
          message: "",
          emailType: "newsletter",
          provider: "auto",
          useHtml: false,
        });
      } else {
        setResult({ success: false, message: response.error.message });
      }
    });
  };

  const handleTestSend = async () => {
    if (!formData.to || !formData.subject || !formData.message) {
      setResult({ success: false, message: "Please fill in all required fields" });
      return;
    }
    setResult(null);
    startTransition(async () => {
      const response = await sendTestEmailDirect(formData.to, formData.subject, formData.message);
      if (response.success) {
        setResult({
          success: true,
          message: `Test email sent! ID: ${response.data.messageId}`,
        });
      } else {
        setResult({ success: false, message: `Test failed: ${response.error.message}` });
      }
    });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Email Form */}
      <div className="lg:col-span-2">
        <GlassCard>
          <h3 className="font-semibold mb-6 flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Compose Email
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Recipient */}
            <div className="space-y-2">
              <Label htmlFor="to">Recipient Email</Label>
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
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                placeholder="Your email subject..."
                required
              />
            </div>

            {/* Type & Provider */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email Type</Label>
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

              <div className="space-y-2">
                <Label>Provider</Label>
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
                        <div className="flex flex-col">
                          <span>{provider.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {provider.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="message">Message</Label>
                <label className="flex items-center text-sm text-muted-foreground cursor-pointer">
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
                rows={12}
                placeholder={formData.useHtml ? "<p>HTML content...</p>" : "Your message..."}
                className="font-mono text-sm"
                required
              />
            </div>

            {/* Result */}
            {result && (
              <div
                className={cn(
                  "p-4 rounded-lg flex items-center gap-3",
                  result.success
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                )}
              >
                {result.success ? (
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                )}
                <p className="text-sm font-medium">{result.message}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1 gap-2">
                <Send className="h-4 w-4" />
                {isPending ? "Sending..." : "Send Email"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={handleTestSend}
              >
                Test (Resend)
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    to: "",
                    subject: "",
                    message: "",
                    emailType: "newsletter",
                    provider: "auto",
                    useHtml: false,
                  });
                  setResult(null);
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Smart Routing Info */}
        <GlassCard className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Smart Routing
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              Auto-select uses quota-aware routing
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              Brevo: Primary for notifications
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              Resend: Prioritized for auth emails
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              AWS SES: Failover when others exhausted
            </li>
          </ul>
        </GlassCard>

        {/* Quick Templates */}
        <GlassCard>
          <h4 className="font-medium mb-3">Quick Templates</h4>
          <div className="space-y-2">
            <QuickTemplateButton
              label="Welcome Email"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  subject: "Welcome to FoodShare! 🍎",
                  message:
                    "Hi there!\n\nWelcome to FoodShare, your community food sharing platform.\n\nStart exploring food near you today!",
                }));
              }}
            />
            <QuickTemplateButton
              label="Newsletter"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  subject: "This Week on FoodShare 📬",
                  message: "Hi!\n\nHere's what's happening in your community this week...",
                  emailType: "newsletter",
                }));
              }}
            />
            <QuickTemplateButton
              label="Food Alert"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  subject: "New Food Available Near You! 🥗",
                  message:
                    "Great news!\n\nNew food has been listed in your area. Check it out before it's gone!",
                  emailType: "food_listing",
                }));
              }}
            />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
