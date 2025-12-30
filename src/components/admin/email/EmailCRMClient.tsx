"use client";

/**
 * EmailCRMClient - Advanced Email CRM Management Interface
 * Modular version with lazy-loaded tabs for optimal bundle size
 * Real-time updates via Supabase Realtime (no polling)
 */

import React, { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Plus, Send, Mail, Users, Zap, Loader2, Wifi, WifiOff } from "lucide-react";
import type { TabType, EmailCRMClientProps, ProviderHealth } from "./types";
import { TABS } from "./constants";
import { ProviderHealthBadge } from "./shared/ProviderComponents";
import { TabContent } from "./shared/TabContent";
import { DashboardTab } from "./tabs/DashboardTab";
import { useEmailCRMRealtime, getConnectionStatusColor } from "@/hooks/queries/useEmailCRMRealtime";
import { useEmailCRMData } from "@/hooks/queries/useEmailCRM";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Lazy-load tabs - only Dashboard loads eagerly (most common entry point)

const CampaignsTab = dynamic(
  () => import("./tabs/CampaignsTab").then((m) => ({ default: m.CampaignsTab })),
  {
    loading: () => <TabSkeleton />,
  }
);
const AutomationTab = dynamic(
  () => import("./tabs/AutomationTab").then((m) => ({ default: m.AutomationTab })),
  {
    loading: () => <TabSkeleton />,
  }
);
const AudienceTab = dynamic(
  () => import("./tabs/AudienceTab").then((m) => ({ default: m.AudienceTab })),
  {
    loading: () => <TabSkeleton />,
  }
);
const ComposeTab = dynamic(
  () => import("./tabs/ComposeTab").then((m) => ({ default: m.ComposeTab })),
  {
    loading: () => <TabSkeleton />,
  }
);
const ProvidersTab = dynamic(
  () => import("./tabs/ProvidersTab").then((m) => ({ default: m.ProvidersTab })),
  {
    loading: () => <TabSkeleton />,
  }
);

// Lightweight skeleton for tab loading
function TabSkeleton() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Internal imports
import type { EmailDashboardStats } from "@/lib/data/admin-email";

// Default stats helper
function getDefaultStats(): EmailDashboardStats {
  return {
    totalSubscribers: 0,
    activeSubscribers: 0,
    emailsSent30d: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    unsubscribeRate: 0,
    bounceRate: 0,
    activeCampaigns: 0,
    activeAutomations: 0,
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 500,
    monthlyQuotaUsed: 0,
    monthlyQuotaLimit: 15000,
    suppressedEmails: 0,
  };
}

export function EmailCRMClient({ initialData }: EmailCRMClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [_isPending, _startTransition] = useTransition();

  // Enable realtime updates - invalidates React Query cache on changes
  const { connectionStatus, reconnect } = useEmailCRMRealtime();

  // Fetch live data (updated by realtime hook)
  const {
    stats: liveStats,
    providerHealth: liveHealth,
    campaigns: liveCampaigns,
    automations: liveAutomations,
    segments: liveSegments,
  } = useEmailCRMData();

  // Use live data if available, fall back to initial data, then defaults
  const stats = liveStats || initialData?.stats || getDefaultStats();
  const providerHealth = liveHealth || initialData?.providerHealth || [];
  const campaigns = liveCampaigns || initialData?.campaigns || [];
  const automations = liveAutomations || initialData?.automations || [];
  const segments = liveSegments || initialData?.segments || [];

  // Quota calculation
  const quotaPercent =
    stats.dailyQuotaLimit > 0
      ? Math.round((stats.dailyQuotaUsed / stats.dailyQuotaLimit) * 100)
      : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden">
      {/* Header with Provider Health & Quota */}
      <div className="flex-shrink-0 border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 p-4">
          {/* Provider Health Indicators + Live Status */}
          <div className="flex items-center gap-3">
            {/* Realtime Connection Status */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={connectionStatus === "disconnected" ? reconnect : undefined}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
                >
                  {connectionStatus === "connected" ? (
                    <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      getConnectionStatusColor(connectionStatus)
                    )}
                  />
                  <span className="text-xs text-muted-foreground">
                    {connectionStatus === "connected"
                      ? "Live"
                      : connectionStatus === "reconnecting"
                        ? "..."
                        : "Offline"}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {connectionStatus === "connected"
                  ? "Real-time updates active"
                  : connectionStatus === "reconnecting"
                    ? "Reconnecting to server..."
                    : "Click to reconnect"}
              </TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border" />

            {providerHealth.map((provider: ProviderHealth) => (
              <ProviderHealthBadge key={provider.provider} provider={provider} />
            ))}
          </div>

          {/* Daily Quota */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Daily Quota</p>
              <p className="text-sm font-semibold">
                {stats.dailyQuotaUsed.toLocaleString()} / {stats.dailyQuotaLimit.toLocaleString()}
              </p>
            </div>
            <div className="w-24">
              <Progress
                value={quotaPercent}
                className={cn(
                  "h-2",
                  quotaPercent > 90
                    ? "[&>div]:bg-rose-500"
                    : quotaPercent > 70
                      ? "[&>div]:bg-amber-500"
                      : "[&>div]:bg-emerald-500"
                )}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setActiveTab("compose")}>
                  <Send className="h-4 w-4 mr-2" />
                  New Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("campaigns")}>
                  <Mail className="h-4 w-4 mr-2" />
                  New Campaign
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("automation")}>
                  <Zap className="h-4 w-4 mr-2" />
                  New Automation
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab("audience")}>
                  <Users className="h-4 w-4 mr-2" />
                  New Segment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pb-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
            <TabsList className="bg-transparent border-b-0 p-0 h-auto gap-1">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "gap-2 px-4 py-2.5 rounded-t-lg rounded-b-none border-b-2 border-transparent",
                    "data-[state=active]:bg-background data-[state=active]:border-primary",
                    "data-[state=active]:shadow-none"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {activeTab === "dashboard" && (
            <TabContent key="dashboard">
              <DashboardTab
                stats={stats}
                campaigns={campaigns}
                automations={automations}
                providerHealth={providerHealth}
              />
            </TabContent>
          )}
          {activeTab === "campaigns" && (
            <TabContent key="campaigns">
              <CampaignsTab campaigns={campaigns} />
            </TabContent>
          )}
          {activeTab === "automation" && (
            <TabContent key="automation">
              <AutomationTab automations={automations} />
            </TabContent>
          )}
          {activeTab === "audience" && (
            <TabContent key="audience">
              <AudienceTab segments={segments} stats={stats} />
            </TabContent>
          )}
          {activeTab === "compose" && (
            <TabContent key="compose">
              <ComposeTab />
            </TabContent>
          )}
          {activeTab === "providers" && (
            <TabContent key="providers">
              <ProvidersTab providerHealth={providerHealth} />
            </TabContent>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
