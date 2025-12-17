"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Template definitions with sample data
const templates = [
  {
    id: "welcome-confirmation",
    name: "Welcome Confirmation",
    description: "Email verification for new users",
    icon: Sparkles,
    color: "#ff2d55",
    bgColor: "bg-pink-500/10",
    textColor: "text-pink-500",
    variables: {
      ConfirmationURL: "https://foodshare.app/auth/confirm?token=abc123",
    },
  },
  {
    id: "password-reset",
    name: "Password Reset",
    description: "Secure password reset link",
    icon: KeyRound,
    color: "#ff2d55",
    bgColor: "bg-pink-500/10",
    textColor: "text-pink-500",
    variables: {
      ConfirmationURL: "https://foodshare.app/auth/reset?token=xyz789",
    },
  },
  {
    id: "magic-link",
    name: "Magic Link",
    description: "Passwordless login",
    icon: Wand2,
    color: "#8b5cf6",
    bgColor: "bg-violet-500/10",
    textColor: "text-violet-500",
    variables: {
      ConfirmationURL: "https://foodshare.app/auth/magic?token=magic456",
    },
  },
  {
    id: "new-message",
    name: "New Message",
    description: "Chat notification",
    icon: MessageCircle,
    color: "#00A699",
    bgColor: "bg-teal-500/10",
    textColor: "text-teal-500",
    variables: {
      SenderAvatar: "https://i.pravatar.cc/150?img=32",
      SenderName: "Emma Wilson",
      MessagePreview:
        "Hi! I'm interested in the organic vegetables you posted. Are they still available? I can pick up tomorrow afternoon if that works for you.",
      ConversationURL: "https://foodshare.app/messages/conv123",
      ListingImage: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
      ListingTitle: "Fresh Organic Vegetables",
      ListingType: "Free",
      UnsubscribeURL: "https://foodshare.app/settings/notifications",
    },
  },
  {
    id: "listing-interest",
    name: "Listing Interest",
    description: "Someone wants your listing",
    icon: Heart,
    color: "#FC642D",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-500",
    variables: {
      InterestedUserName: "Alex Chen",
      InterestedUserAvatar: "https://i.pravatar.cc/150?img=12",
      InterestedUserRating: "4.9",
      InterestedUserShares: "23",
      ListingImage: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400",
      ListingTitle: "Homemade Apple Pie",
      ListingType: "Free",
      ListingLocation: "Brooklyn, NY",
      MessageURL: "https://foodshare.app/messages/new?user=alex",
      ListingURL: "https://foodshare.app/food/apple-pie-123",
      UnsubscribeURL: "https://foodshare.app/settings/notifications",
    },
  },
  {
    id: "review-request",
    name: "Review Request",
    description: "Ask for feedback after pickup",
    icon: Star,
    color: "#f59e0b",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-500",
    variables: {
      RecipientName: "Jordan",
      SharerName: "Maria Santos",
      ListingImage: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
      ListingTitle: "Fresh Baked Bread Loaves",
      PickupDate: "December 15, 2025",
      Review1StarURL: "https://foodshare.app/review?id=123&stars=1",
      Review2StarURL: "https://foodshare.app/review?id=123&stars=2",
      Review3StarURL: "https://foodshare.app/review?id=123&stars=3",
      Review4StarURL: "https://foodshare.app/review?id=123&stars=4",
      Review5StarURL: "https://foodshare.app/review?id=123&stars=5",
      ReviewURL: "https://foodshare.app/review?id=123",
      UnsubscribeURL: "https://foodshare.app/settings/notifications",
    },
  },
  {
    id: "pickup-reminder",
    name: "Pickup Reminder",
    description: "Don't forget your pickup",
    icon: Clock,
    color: "#10b981",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-500",
    variables: {
      PickupTime: "2:30 PM",
      PickupDate: "Today, December 16",
      ListingImage: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400",
      ListingTitle: "Garden Fresh Salad Mix",
      SharerName: "Carlos Rivera",
      PickupAddress: "247 Park Avenue, Apt 3B",
      PickupInstructions: "Ring buzzer 3B, I'll come down. Look for the blue door.",
      DirectionsURL: "https://maps.google.com/?q=247+Park+Avenue",
      MessageURL: "https://foodshare.app/messages/carlos",
      UnsubscribeURL: "https://foodshare.app/settings/notifications",
    },
  },
  {
    id: "listing-expired",
    name: "Listing Expired",
    description: "Renew or update your listing",
    icon: AlertCircle,
    color: "#64748b",
    bgColor: "bg-slate-500/10",
    textColor: "text-slate-500",
    variables: {
      UserName: "Taylor",
      ListingImage: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400",
      ListingTitle: "Homemade Pasta Sauce",
      ListingType: "Free",
      ExpiryDate: "December 14, 2025",
      RenewURL: "https://foodshare.app/my-listings/pasta-sauce/renew",
      EditURL: "https://foodshare.app/my-listings/pasta-sauce/edit",
      MarkSharedURL: "https://foodshare.app/my-listings/pasta-sauce/mark-shared",
      UnsubscribeURL: "https://foodshare.app/settings/notifications",
    },
  },
  {
    id: "weekly-digest",
    name: "Weekly Digest",
    description: "Weekly activity summary",
    icon: BarChart3,
    color: "#6366f1",
    bgColor: "bg-indigo-500/10",
    textColor: "text-indigo-500",
    variables: {
      WeekRange: "December 9 - 15, 2025",
      ItemsShared: "12",
      FoodSaved: "8.5",
      CO2Saved: "21",
      Listing1Image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
      Listing1Title: "Fresh Organic Vegetables",
      Listing1Distance: "0.3 mi",
      Listing1URL: "https://foodshare.app/food/veggies-123",
      Listing2Image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
      Listing2Title: "Artisan Sourdough Bread",
      Listing2Distance: "0.7 mi",
      Listing2URL: "https://foodshare.app/food/bread-456",
      Listing3Image: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400",
      Listing3Title: "Homemade Apple Pie",
      Listing3Distance: "1.2 mi",
      Listing3URL: "https://foodshare.app/food/pie-789",
      ExploreURL: "https://foodshare.app/explore",
      CommunityFoodSaved: "2,450 kg",
      UnsubscribeURL: "https://foodshare.app/settings/notifications",
    },
  },
];

type ViewMode = "desktop" | "mobile";

export default function EmailTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [previewHtml, setPreviewHtml] = useState<string>("");

  const loadTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/admin/email/templates/${templateId}`);
      if (response.ok) {
        const html = await response.text();
        setPreviewHtml(html);
        setSelectedTemplate(templateId);
      }
    } catch (error) {
      console.error("Failed to load template:", error);
    }
  };

  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate);

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
              <Eye className="h-3.5 w-3.5" />
              Preview and inspect all email templates
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Template List */}
        <div className="w-80 flex-shrink-0 overflow-y-auto pr-2 space-y-2">
          {templates.map((template) => {
            const Icon = template.icon;
            const isSelected = selectedTemplate === template.id;

            return (
              <button
                key={template.id}
                onClick={() => loadTemplate(template.id)}
                className={cn(
                  "w-full p-4 rounded-xl border text-left transition-all duration-200",
                  "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border/50 bg-card/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("rounded-lg p-2 transition-colors", template.bgColor)}>
                    <Icon className={cn("h-4 w-4", template.textColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {template.description}
                    </p>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: template.color }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Preview Panel */}
        <div className="flex-1 rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl overflow-hidden flex flex-col">
          {selectedTemplate && selectedTemplateData ? (
            <>
              {/* Preview Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/60 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-lg p-2", selectedTemplateData.bgColor)}>
                    <selectedTemplateData.icon
                      className={cn("h-4 w-4", selectedTemplateData.textColor)}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">
                      {selectedTemplateData.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedTemplateData.description}
                    </p>
                  </div>
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
                <div
                  className={cn(
                    "mx-auto transition-all duration-300 bg-white rounded-lg shadow-xl overflow-hidden",
                    viewMode === "desktop" ? "max-w-[650px]" : "max-w-[375px]"
                  )}
                >
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full border-0"
                    style={{ height: viewMode === "desktop" ? "800px" : "667px" }}
                    title={`Preview: ${selectedTemplateData.name}`}
                  />
                </div>
              </div>
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
                  Choose a template from the list to preview how it looks with sample data
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
