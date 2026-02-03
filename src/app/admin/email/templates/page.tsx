"use client";

/**
 * Email Templates Admin Page
 *
 * Displays and previews email templates from the database.
 * Supports both database-driven templates and legacy React Email templates.
 */

import { useState, useTransition } from "react";
import {
  Mail,
  Eye,
  Sparkles,
  KeyRound,
  Wand2,
  MessageCircle,
  Heart,
  Star,
  Clock,
  AlertCircle,
  BarChart3,
  X,
  Smartphone,
  Monitor,
  ExternalLink,
  Database,
  Code,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Users,
  Home,
  Trophy,
  Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useEmailTemplates,
  useRenderTemplate,
  useInvalidateTemplates,
  type EmailTemplate,
  TEMPLATE_CATEGORIES,
} from "@/hooks/use-email-templates";

// ============================================================================
// Template Icon Mapping
// ============================================================================

const templateIcons: Record<string, React.ElementType> = {
  welcome: Sparkles,
  "email-verification": Wand2,
  "password-reset": KeyRound,
  "volunteer-welcome": Users,
  "complete-profile": Star,
  "first-share-tips": Leaf,
  "community-highlights": BarChart3,
  "monthly-impact": BarChart3,
  "milestone-celebration": Trophy,
  "neighborhood-welcome": Home,
  reengagement: Heart,
  "new-listing-nearby": Heart,
  "chat-notification": MessageCircle,
  "feedback-alert": AlertCircle,
  // Legacy React Email templates
  "welcome-confirmation": Sparkles,
  "magic-link": Wand2,
  "new-message": MessageCircle,
  "listing-interest": Heart,
  "review-request": Star,
  "pickup-reminder": Clock,
  "listing-expired": AlertCircle,
  "weekly-digest": BarChart3,
};

const templateColors: Record<string, { bg: string; text: string; color: string }> = {
  welcome: { bg: "bg-pink-500/10", text: "text-pink-500", color: "#ff2d55" },
  "email-verification": { bg: "bg-violet-500/10", text: "text-violet-500", color: "#8b5cf6" },
  "password-reset": { bg: "bg-pink-500/10", text: "text-pink-500", color: "#ff2d55" },
  "volunteer-welcome": { bg: "bg-emerald-500/10", text: "text-emerald-500", color: "#10b981" },
  "complete-profile": { bg: "bg-amber-500/10", text: "text-amber-500", color: "#f59e0b" },
  "first-share-tips": { bg: "bg-green-500/10", text: "text-green-500", color: "#22c55e" },
  "community-highlights": { bg: "bg-indigo-500/10", text: "text-indigo-500", color: "#6366f1" },
  "monthly-impact": { bg: "bg-indigo-500/10", text: "text-indigo-500", color: "#6366f1" },
  "milestone-celebration": { bg: "bg-amber-500/10", text: "text-amber-500", color: "#f59e0b" },
  "neighborhood-welcome": { bg: "bg-teal-500/10", text: "text-teal-500", color: "#14b8a6" },
  reengagement: { bg: "bg-rose-500/10", text: "text-rose-500", color: "#f43f5e" },
  "new-listing-nearby": { bg: "bg-orange-500/10", text: "text-orange-500", color: "#f97316" },
  "chat-notification": { bg: "bg-teal-500/10", text: "text-teal-500", color: "#00A699" },
  "feedback-alert": { bg: "bg-slate-500/10", text: "text-slate-500", color: "#64748b" },
};

// Default sample variables for previewing templates
const defaultVariables: Record<string, Record<string, unknown>> = {
  welcome: { name: "John Doe" },
  "email-verification": { verifyUrl: "https://foodshare.club/verify?token=sample123" },
  "password-reset": {
    name: "John Doe",
    resetUrl: "https://foodshare.club/reset?token=abc123",
    expiresIn: "1 hour",
  },
  "volunteer-welcome": { name: "Jane Smith" },
  "complete-profile": { name: "John Doe", completionPercent: 65 },
  "first-share-tips": { name: "New User" },
  "community-highlights": {
    name: "Community Member",
    mealsShared: 156,
    co2Saved: 42,
    newMembers: 23,
  },
  "monthly-impact": {
    name: "Impact Hero",
    month: "January 2026",
    totalMeals: 45,
    foodSavedKg: 28,
    co2Prevented: 70,
    connections: 12,
    carMilesEquivalent: 175,
  },
  "milestone-celebration": {
    name: "Achievement Hunter",
    milestoneName: "Food Hero",
    milestoneDescription: "You've shared 50 meals!",
    milestoneEmoji: "🏆",
    percentile: 5,
    nextMilestone: "Share 100 meals for Legend status!",
  },
  "neighborhood-welcome": {
    name: "Neighbor",
    neighborhood: "Downtown Sacramento",
    memberCount: 234,
    activeListings: 18,
    recentShares: 156,
  },
  reengagement: {
    name: "Missed Friend",
    daysSinceLastVisit: 14,
    newListingsNearby: 23,
    mealsSavedCommunity: 456,
    newMembersNearby: 12,
    unsubscribeUrl: "https://foodshare.club/unsubscribe",
  },
  "new-listing-nearby": {
    recipientName: "Hungry Helper",
    listingTitle: "Fresh Homemade Bread",
    listingDescription: "Just baked this morning, still warm!",
    listingAddress: "123 Baker Street",
    posterName: "Maria Baker",
    listingUrl: "https://foodshare.club/listing/123",
    listingType: "food",
    listingEmoji: "🍞",
  },
  "chat-notification": {
    recipientName: "Chat User",
    senderName: "Emma Wilson",
    messagePreview: "Hi! Is the bread still available? I can pick up this afternoon.",
    chatUrl: "https://foodshare.club/chat/123",
  },
  "feedback-alert": {
    feedbackId: "FB-2026-001",
    feedbackType: "feature",
    feedbackEmoji: "✨",
    subject: "Great idea for the app",
    submitterName: "Happy User",
    submitterEmail: "user@example.com",
    message: "Love the app! Would be great if you could add a favorite sellers feature.",
    timestamp: new Date().toISOString(),
  },
};

type ViewMode = "desktop" | "mobile";

export default function EmailTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSource, setPreviewSource] = useState<"database" | "legacy">("database");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fetch templates from database
  const {
    data: templates,
    isLoading,
    error,
    refetch,
  } = useEmailTemplates(selectedCategory ?? undefined);

  // Render template mutation
  const renderMutation = useRenderTemplate();

  // Cache invalidation
  const { invalidateAll } = useInvalidateTemplates();

  // Load and preview a database template
  const loadDatabaseTemplate = async (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setPreviewSource("database");

    try {
      const variables = defaultVariables[template.slug] || {};
      const result = await renderMutation.mutateAsync({
        slug: template.slug,
        variables,
        format: "html",
      });

      if (result.html) {
        setPreviewHtml(result.html);
      }
    } catch (error) {
      console.error("Failed to render template:", error);
      // Fallback to legacy API
      loadLegacyTemplate(template.slug);
    }
  };

  // Fallback to legacy React Email template
  const loadLegacyTemplate = async (slug: string) => {
    setPreviewSource("legacy");
    try {
      // Map database slugs to legacy template IDs
      const legacyMap: Record<string, string> = {
        welcome: "welcome-confirmation",
        "email-verification": "magic-link",
        "password-reset": "password-reset",
        "chat-notification": "new-message",
        "new-listing-nearby": "listing-interest",
        "community-highlights": "weekly-digest",
      };

      const templateId = legacyMap[slug] || slug;
      const response = await fetch(`/api/admin/email/templates/${templateId}`);

      if (response.ok) {
        const html = await response.text();
        setPreviewHtml(html);
      }
    } catch (error) {
      console.error("Failed to load legacy template:", error);
    }
  };

  // Refresh templates
  const handleRefresh = () => {
    startTransition(() => {
      invalidateAll();
      refetch();
    });
  };

  const getTemplateIcon = (slug: string) => templateIcons[slug] || Mail;
  const getTemplateColors = (slug: string) =>
    templateColors[slug] || { bg: "bg-gray-500/10", text: "text-gray-500", color: "#6b7280" };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -mt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Email Templates</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              Database-driven email templates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                selectedCategory === null
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  selectedCategory === cat.value
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Template List */}
        <div className="w-80 flex-shrink-0 overflow-y-auto pr-2 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 mb-2" />
              Failed to load templates
            </div>
          ) : templates && templates.length > 0 ? (
            templates.map((template) => {
              const Icon = getTemplateIcon(template.slug);
              const colors = getTemplateColors(template.slug);
              const isSelected = selectedTemplate?.id === template.id;

              return (
                <button
                  key={template.id}
                  onClick={() => loadDatabaseTemplate(template)}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all duration-200",
                    "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : "border-border/50 bg-card/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("rounded-lg p-2 transition-colors", colors.bg)}>
                      <Icon className={cn("h-4 w-4", colors.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {template.name}
                        </h3>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          v{template.version}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {template.slug}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {template.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {template.variables?.length || 0} vars
                        </span>
                      </div>
                    </div>
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: colors.color }}
                    />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No templates found
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="flex-1 rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl overflow-hidden flex flex-col">
          {selectedTemplate ? (
            <>
              {/* Preview Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/60 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = getTemplateIcon(selectedTemplate.slug);
                    const colors = getTemplateColors(selectedTemplate.slug);
                    return (
                      <>
                        <div className={cn("rounded-lg p-2", colors.bg)}>
                          <Icon className={cn("h-4 w-4", colors.text)} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground text-sm">
                              {selectedTemplate.name}
                            </h3>
                            <Badge
                              variant={previewSource === "database" ? "default" : "secondary"}
                              className="text-[10px] gap-1"
                            >
                              {previewSource === "database" ? (
                                <>
                                  <Database className="h-2.5 w-2.5" />
                                  Database
                                </>
                              ) : (
                                <>
                                  <Code className="h-2.5 w-2.5" />
                                  Legacy
                                </>
                              )}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {selectedTemplate.subject}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
                    <button
                      onClick={() => setViewMode("desktop")}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        viewMode === "desktop"
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Monitor className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("mobile")}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        viewMode === "mobile"
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Smartphone className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Open in New Tab */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => {
                      const blob = new Blob([previewHtml], { type: "text/html" });
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                  </Button>

                  {/* Close */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setSelectedTemplate(null);
                      setPreviewHtml("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-auto p-4 bg-[#e5e5e5] dark:bg-zinc-800">
                {renderMutation.isPending ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "mx-auto transition-all duration-300 bg-white rounded-lg shadow-xl overflow-hidden",
                      viewMode === "desktop" ? "max-w-[650px]" : "max-w-[375px]"
                    )}
                  >
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full border-0"
                      style={{ height: viewMode === "desktop" ? "900px" : "750px" }}
                      title={`Preview: ${selectedTemplate.name}`}
                    />
                  </div>
                )}
              </div>

              {/* Variables Info */}
              {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                <div className="px-4 py-3 border-t border-border/40 bg-card/60">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Code className="h-3.5 w-3.5" />
                    <span className="font-medium">Variables:</span>
                    {selectedTemplate.variables.map((v, i) => (
                      <span key={v.name}>
                        <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">
                          {"{{" + v.name + "}}"}
                        </code>
                        {v.required && <span className="text-destructive">*</span>}
                        {i < selectedTemplate.variables.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Eye className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Select a Template</h3>
                <p className="text-sm text-muted-foreground max-w-[240px]">
                  Choose a template from the list to preview with sample data
                </p>
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {templates?.length || 0} templates
                  </span>
                  <span className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5 text-blue-500" />
                    Database-driven
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
