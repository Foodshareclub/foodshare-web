"use client";

import { importProfilesAsCRMCustomers } from "@/app/actions/crm";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AlertTriangle, BarChart3, Heart, Megaphone, Send, Star, Target, UserPlus, Users, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CRMAutomationView, CRMCampaignsView, CRMSegmentsView } from "./dashboard/CRMDashboardCampaignViews";
import type {
  NormalizedAutomationItem,
  NormalizedCampaignItem,
  NormalizedSegmentItem,
} from "./dashboard/CRMDashboardCards";
import { CRMDashboardCustomers, CRMDashboardOverview } from "./dashboard/CRMDashboardOverview";
import { type CRMDashboardProps, CRM_COPY, TRIGGER_TYPE_LABELS, type ViewType } from "./shared/crm-copy";

export function CRMDashboard({
  customers,
  tags,
  stats,
  campaigns: campaignsData = [],
  segments: segmentsData = [],
  automations: automationsData = [],
  newsletterStats,
}: CRMDashboardProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewType>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState("all");
  const [isPending, startTransition] = useTransition();
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleImport = () => {
    startTransition(async () => {
      const result = await importProfilesAsCRMCustomers();
      if (result.success) {
        setImportMessage(`Imported ${result.data.imported} profiles`);
        router.refresh();
      } else {
        setImportMessage(`Error: ${result.error}`);
      }
      setTimeout(() => setImportMessage(null), 4000);
    });
  };

  const handleCustomerAction = (action: string, customerId: string) => {
    if (action === "view") router.push(`/profile/${customerId}`);
    if (action === "email") router.push(`/admin/email?to=${customerId}`);
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLifecycle = lifecycleFilter === "all" || c.lifecycle_stage === lifecycleFilter;
    return matchesSearch && matchesLifecycle;
  });

  const segments: NormalizedSegmentItem[] =
    segmentsData.length > 0
      ? segmentsData.map((seg) => ({
          name: seg.name,
          count: seg.cached_count,
          icon:
            seg.icon_name === "heart" ? (
              <Heart className="h-4 w-4" aria-hidden="true" />
            ) : seg.icon_name === "user-plus" ? (
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            ) : seg.icon_name === "alert-triangle" ? (
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            ) : seg.icon_name === "star" ? (
              <Star className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Users className="h-4 w-4" aria-hidden="true" />
            ),
          accentHex: seg.color,
        }))
      : [
          {
            name: "Active Sharers",
            count: Math.round(stats.activeCustomers * 0.6),
            icon: <Heart className="h-4 w-4" aria-hidden="true" />,
            colorClass: "bg-emerald-100 text-emerald-600",
            growth: 12,
          },
          {
            name: "New Users (7d)",
            count: stats.newThisWeek,
            icon: <UserPlus className="h-4 w-4" aria-hidden="true" />,
            colorClass: "bg-blue-100 text-blue-600",
            growth: 23,
          },
          {
            name: CRM_COPY.atRiskLabel,
            count: stats.atRiskCustomers,
            icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
            colorClass: "bg-amber-100 text-amber-600",
            growth: -5,
          },
          {
            name: "Champions",
            count: Math.round(stats.activeCustomers * 0.15),
            icon: <Star className="h-4 w-4" aria-hidden="true" />,
            colorClass: "bg-violet-100 text-violet-600",
            growth: 8,
          },
        ];

  const campaigns: NormalizedCampaignItem[] =
    campaignsData.length > 0
      ? campaignsData.map((c) => ({
          name: c.name,
          status: (c.status === "sending"
            ? "active"
            : c.status === "cancelled" || c.status === "paused"
              ? "draft"
              : c.status) as "draft" | "scheduled" | "sent" | "active",
          sent: c.total_sent,
          opened: c.total_opened,
          clicked: c.total_clicked,
        }))
      : [
          { name: "Weekly Food Tips", status: "sent", sent: 2450, opened: 1823, clicked: 456 },
          { name: "Community Fridge Launch", status: "scheduled", sent: 0, opened: 0, clicked: 0 },
          { name: "Holiday Food Drive", status: "draft", sent: 0, opened: 0, clicked: 0 },
        ];

  const automations: NormalizedAutomationItem[] =
    automationsData.length > 0
      ? automationsData.map((a) => ({
          name: a.name,
          trigger: TRIGGER_TYPE_LABELS[a.trigger_type] || a.trigger_type,
          status: a.status as "active" | "paused" | "draft",
          enrolled: a.total_enrolled,
          completed: a.total_completed,
          rate: a.total_enrolled > 0 ? Math.round((a.total_converted / a.total_enrolled) * 1000) / 10 : 0,
        }))
      : [
          {
            name: "Welcome Series",
            trigger: "User signs up",
            status: "active",
            enrolled: 1234,
            completed: 987,
            rate: 34.5,
          },
          {
            name: "First Listing Nudge",
            trigger: "No listing after 3 days",
            status: "active",
            enrolled: 567,
            completed: 456,
            rate: 67.2,
          },
          {
            name: "Re-engagement",
            trigger: "30 days inactive",
            status: "paused",
            enrolled: 234,
            completed: 89,
            rate: 12.3,
          },
        ];

  const navItems = [
    { id: "overview" as ViewType, label: "Overview", icon: <BarChart3 className="h-4 w-4" aria-hidden="true" /> },
    { id: "customers" as ViewType, label: "Customers", icon: <Users className="h-4 w-4" aria-hidden="true" /> },
    { id: "segments" as ViewType, label: "Segments", icon: <Target className="h-4 w-4" aria-hidden="true" /> },
    { id: "campaigns" as ViewType, label: "Campaigns", icon: <Megaphone className="h-4 w-4" aria-hidden="true" /> },
    { id: "automation" as ViewType, label: "Automation", icon: <Zap className="h-4 w-4" aria-hidden="true" /> },
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] bg-background">
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{CRM_COPY.title}</h1>
            <p className="text-sm text-muted-foreground">{CRM_COPY.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImport} disabled={isPending}>
              {isPending ? CRM_COPY.importingLabel : CRM_COPY.syncProfilesLabel}
            </Button>
            <Button size="sm" className="gap-2" onClick={() => router.push("/admin/email")}>
              <Send className="h-4 w-4" aria-hidden="true" /> {CRM_COPY.newCampaignLabel}
            </Button>
          </div>
        </div>

        <div className="flex gap-1 px-4 pb-2 overflow-x-auto">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={activeView === item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                activeView === item.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {importMessage && (
        <div
          role="status"
          className={cn(
            "mx-4 mt-4 p-3 rounded-lg text-sm font-medium",
            importMessage.startsWith("Error") ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800",
          )}
        >
          {importMessage}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeView === "overview" && (
            <CRMDashboardOverview
              stats={stats}
              segments={segments}
              campaigns={campaigns}
              automations={automations}
              customers={customers}
              onNavigate={setActiveView}
              onCustomerAction={handleCustomerAction}
            />
          )}
          {activeView === "customers" && (
            <CRMDashboardCustomers
              customers={customers}
              filteredCustomers={filteredCustomers}
              tags={tags}
              searchQuery={searchQuery}
              lifecycleFilter={lifecycleFilter}
              onSearchChange={setSearchQuery}
              onLifecycleChange={setLifecycleFilter}
              onCustomerAction={handleCustomerAction}
            />
          )}
          {activeView === "segments" && <CRMSegmentsView segments={segments} />}
          {activeView === "campaigns" && (
            <CRMCampaignsView
              campaigns={campaigns}
              newsletterStats={newsletterStats}
              onOpenEmail={() => router.push("/admin/email")}
            />
          )}
          {activeView === "automation" && (
            <CRMAutomationView automations={automations} newsletterStats={newsletterStats} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
