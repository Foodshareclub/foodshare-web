"use client";

/**
 * EmailCRMClient - Advanced Email CRM Management Interface
 * Modular version with extracted components
 */

import React, { useState, useTransition } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus, Send, Mail, Users, Zap } from "lucide-react";
import type { TabType, Props, ProviderHealth } from "./types";
import { TABS } from "./constants";
import { ProviderHealthBadge } from "./shared/ProviderComponents";
import { TabContent } from "./shared/TabContent";
import {
  DashboardTab,
  CampaignsTab,
  AutomationTab,
  AudienceTab,
  ComposeTab,
  ProvidersTab,
} from "./tabs";
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

export function EmailCRMClient({ initialData }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [_isPending, _startTransition] = useTransition();

  // Data state (use initial data or defaults)
  const stats = initialData?.stats || getDefaultStats();
  const providerHealth = initialData?.providerHealth || [];
  const campaigns = initialData?.campaigns || [];
  const automations = initialData?.automations || [];
  const segments = initialData?.segments || [];

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
          {/* Provider Health Indicators */}
          <div className="flex items-center gap-3">
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
          <AnimatePresence mode="wait">
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
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
