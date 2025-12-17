"use client";

/**
 * ComposeTab - Email composition with rich editor and templates
 */

import React, { useState, useTransition, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Users,
  Edit,
  Eye,
  FileText,
  Layers,
  Globe,
  CheckCircle,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Copy,
  UserPlus,
  Heart,
  Star,
} from "lucide-react";
import { EMAIL_TYPES, PROVIDERS } from "../constants";
import type { EmailFormData } from "../types";
import { cn } from "@/lib/utils";
import { useEmailTemplates } from "@/hooks/queries/useEmailCRM";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { sendAdminEmail, sendTestEmailDirect } from "@/app/actions/email";
import type { EmailType } from "@/lib/email/types";
import type { EmailTemplate } from "@/types/automations.types";

// Lazy load heavy components
const RichTextEditor = lazy(() =>
  import("@/components/ui/rich-text-editor").then((mod) => ({ default: mod.RichTextEditor }))
);

const EmailContentEditor = lazy(() =>
  import("../EmailContentEditor").then((mod) => ({ default: mod.EmailContentEditor }))
);

// Rich Text Editor with loading state
function RichTextEditorLazy({
  value,
  onChange,
  placeholder,
  minHeight,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  return (
    <Suspense
      fallback={
        <div
          className="rounded-xl border border-border/50 bg-background/50 animate-pulse"
          style={{ minHeight: minHeight || "300px" }}
        >
          <div className="p-2 border-b border-border/50 bg-muted/30">
            <div className="flex gap-1">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-8 w-8 rounded bg-muted" />
              ))}
            </div>
          </div>
          <div className="p-4">
            <div className="h-4 w-3/4 bg-muted rounded mb-2" />
            <div className="h-4 w-1/2 bg-muted rounded" />
          </div>
        </div>
      }
    >
      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minHeight={minHeight}
      />
    </Suspense>
  );
}

// Email Templates Panel - Fetches templates from database
function EmailTemplatesPanel({
  onSelectTemplate,
}: {
  onSelectTemplate: (template: EmailTemplate) => void;
}) {
  const { data: templates, isLoading } = useEmailTemplates();
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  const getTemplateIcon = (slug: string) => {
    if (slug.includes("welcome") || slug.includes("confirmation"))
      return <UserPlus className="h-4 w-4" />;
    if (slug.includes("food") || slug.includes("alert")) return <Heart className="h-4 w-4" />;
    if (slug.includes("newsletter")) return <FileText className="h-4 w-4" />;
    if (slug.includes("reengagement") || slug.includes("miss")) return <Star className="h-4 w-4" />;
    return <Layers className="h-4 w-4" />;
  };

  const getTemplateColor = (slug: string): "emerald" | "blue" | "rose" | "amber" | "violet" => {
    if (slug.includes("welcome") || slug.includes("confirmation")) return "emerald";
    if (slug.includes("food") || slug.includes("alert")) return "rose";
    if (slug.includes("newsletter")) return "blue";
    if (slug.includes("reengagement")) return "amber";
    return "violet";
  };

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-500" />
            Email Templates
          </CardTitle>
          <CardDescription className="text-xs">
            Beautiful pre-designed templates from database
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : templates && templates.length > 0 ? (
            templates
              .filter((t) => t.is_active)
              .map((template) => (
                <div key={template.id} className="group">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(template)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 hover:shadow-sm transition-all text-left"
                  >
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        getTemplateColor(template.slug) === "emerald" &&
                          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        getTemplateColor(template.slug) === "blue" &&
                          "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                        getTemplateColor(template.slug) === "rose" &&
                          "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                        getTemplateColor(template.slug) === "amber" &&
                          "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        getTemplateColor(template.slug) === "violet" &&
                          "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      )}
                    >
                      {getTemplateIcon(template.slug)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">{template.name}</span>
                      <span className="text-xs text-muted-foreground truncate block">
                        {template.subject}
                      </span>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                </div>
              ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">No templates available</p>
          )}
        </CardContent>
      </Card>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewTemplate && getTemplateIcon(previewTemplate.slug)}
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>Subject: {previewTemplate?.subject}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            {previewTemplate && (
              <iframe
                srcDoc={previewTemplate.html_content}
                className="w-full h-[500px] border-0"
                title="Email Preview"
              />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (previewTemplate) {
                  onSelectTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }
              }}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Use This Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ComposeTab() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState<EmailFormData>({
    to: "",
    subject: "",
    message: "",
    emailType: "newsletter",
    provider: "auto",
    useHtml: true,
  });
  const [showPreview, setShowPreview] = useState(false);

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
        useHtml: true,
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
          useHtml: true,
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
    <div className="grid lg:grid-cols-3 gap-5">
      {/* Email Form */}
      <div className="lg:col-span-2 space-y-5">
        <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-sm border-border/50 shadow-lg">
          <CardHeader className="pb-4 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Compose Email</CardTitle>
                  <CardDescription>Create and send beautiful emails</CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4" />
                {showPreview ? "Edit" : "Preview"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {showPreview ? (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                }
              >
                <EmailContentEditor
                  to={formData.to}
                  subject={formData.subject}
                  html={formData.message}
                  onClose={() => setShowPreview(false)}
                />
              </Suspense>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Recipient & Subject Row */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="to" className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      Recipient
                    </Label>
                    <Input
                      id="to"
                      type="email"
                      value={formData.to}
                      onChange={(e) => handleChange("to", e.target.value)}
                      placeholder="user@example.com"
                      className="bg-background/50 h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="subject"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      Subject Line
                    </Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => handleChange("subject", e.target.value)}
                      placeholder="Your email subject..."
                      className="bg-background/50 h-11"
                      required
                    />
                  </div>
                </div>

                {/* Type & Provider Row */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      Email Type
                    </Label>
                    <Select
                      value={formData.emailType}
                      onValueChange={(value) => handleChange("emailType", value)}
                    >
                      <SelectTrigger className="bg-background/50 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMAIL_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{type.icon}</span>
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      Provider
                    </Label>
                    <Select
                      value={formData.provider}
                      onValueChange={(value) => handleChange("provider", value)}
                    >
                      <SelectTrigger className="bg-background/50 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((provider) => (
                          <SelectItem key={provider.value} value={provider.value}>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  provider.value === "auto" && "bg-violet-500",
                                  provider.value === "brevo" && "bg-blue-500",
                                  provider.value === "resend" && "bg-emerald-500",
                                  provider.value === "mailersend" && "bg-green-500",
                                  provider.value === "aws_ses" && "bg-amber-500"
                                )}
                              />
                              <span>{provider.label}</span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {provider.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Rich Text Editor */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                    Email Content
                  </Label>
                  <RichTextEditorLazy
                    value={formData.message}
                    onChange={(html) => handleChange("message", html)}
                    placeholder="Start writing your email..."
                    minHeight="280px"
                  />
                </div>

                {/* Result */}
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-xl flex items-center gap-3",
                      result.success
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400"
                    )}
                  >
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    )}
                    <p className="font-medium text-sm">{result.message}</p>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 gap-2 h-11 shadow-lg shadow-primary/20"
                  >
                    <Send className="h-4 w-4" />
                    {isPending ? "Sending..." : "Send Email"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending}
                    onClick={handleTestSend}
                    className="gap-2 h-11"
                  >
                    <Eye className="h-4 w-4" />
                    Test
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => {
                      setFormData({
                        to: "",
                        subject: "",
                        message: "",
                        emailType: "newsletter",
                        provider: "auto",
                        useHtml: true,
                      });
                      setResult(null);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-5">
        {/* Smart Routing Info */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-violet-500/10 border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
              Smart Routing
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-sm text-blue-700/80 dark:text-blue-400/80 space-y-2.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                <span>Auto-select uses quota-aware routing</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-4 w-4 mt-0.5 flex-shrink-0 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-blue-600">B</span>
                </div>
                <span>Brevo: Primary for notifications</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-4 w-4 mt-0.5 flex-shrink-0 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-emerald-600">R</span>
                </div>
                <span>Resend: Prioritized for auth emails</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-4 w-4 mt-0.5 flex-shrink-0 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-amber-600">A</span>
                </div>
                <span>AWS SES: High-volume failover</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Quick Templates - Fetched from database */}
        <EmailTemplatesPanel
          onSelectTemplate={(template) => {
            setFormData((prev) => ({
              ...prev,
              subject: template.subject,
              message: template.html_content,
              emailType: template.category === "automation" ? "newsletter" : template.category,
            }));
          }}
        />

        {/* Character Count */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Content Length</span>
              <span className="font-mono tabular-nums">
                {formData.message.length.toLocaleString()} chars
              </span>
            </div>
            <Progress
              value={Math.min((formData.message.length / 10000) * 100, 100)}
              className="h-1.5 mt-2"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
