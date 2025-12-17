"use client";

/**
 * EmailCRMDashboard - Advanced Email CRM Management Interface
 *
 * Modular orchestrator component that coordinates:
 * - Tab navigation and state
 * - Provider health monitoring
 * - Quota tracking
 * - Data distribution to child components
 *
 * All tab content is extracted to ./tabs/
 * All card components are in ./cards/
 * Shared components are in ./components/
 */

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence } from "framer-motion";
import { Send, Plus, RefreshCw, Zap, Target, Megaphone } from "lucide-react";
import { TABS, getDefaultStats } from "./constants";
import { TabPanel, ProviderPill } from "./components";
import {
  OverviewTab,
  CampaignsTab,
  AutomationTab,
  AudienceTab,
  ComposeTab,
  ProvidersTab,
} from "./tabs";
import type { TabType, EmailCRMDashboardProps } from "./types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { refreshEmailDashboard } from "@/app/actions/campaigns";

// Modular imports
import type { ProviderHealth } from "@/lib/data/admin-email";

export function EmailCRMDashboard({ initialData }: EmailCRMDashboardProps) {
  const _t = useTranslations();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data state with defaults
  const stats = initialData?.stats || getDefaultStats();
  const providerHealth = initialData?.providerHealth || [];
  const campaigns = initialData?.campaigns || [];
  const automations = initialData?.automations || [];
  const segments = initialData?.segments || [];

  // Quota calculations
  const dailyQuotaPercent =
    stats.dailyQuotaLimit > 0
      ? Math.round((stats.dailyQuotaUsed / stats.dailyQuotaLimit) * 100)
      : 0;
  const monthlyQuotaPercent =
    stats.monthlyQuotaLimit > 0
      ? Math.round((stats.monthlyQuotaUsed / stats.monthlyQuotaLimit) * 100)
      : 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshEmailDashboard();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Default provider health for display when no data
  const displayProviderHealth: ProviderHealth[] =
    providerHealth.length > 0
      ? providerHealth
      : [
          {
            provider: "brevo",
            healthScore: 100,
            successRate: 100,
            avgLatencyMs: 0,
            totalRequests: 0,
            status: "healthy",
          },
          {
            provider: "resend",
            healthScore: 100,
            successRate: 100,
            avgLatencyMs: 0,
            totalRequests: 0,
            status: "healthy",
          },
        ];

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0 rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl overflow-hidden">
        {/* Header Bar */}
        <header className="flex-shrink-0 border-b border-border/40 bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            {/* Provider Health Pills */}
            <div className="flex items-center gap-2">
              {displayProviderHealth.map((provider) => (
                <ProviderPill key={provider.provider} provider={provider} />
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Daily Quota Indicator */}
              <QuotaIndicator
                label="Daily"
                used={stats.dailyQuotaUsed}
                limit={stats.dailyQuotaLimit}
                percent={dailyQuotaPercent}
              />

              {/* Monthly Quota Indicator */}
              <QuotaIndicator
                label="Monthly"
                used={stats.monthlyQuotaUsed}
                limit={stats.monthlyQuotaLimit}
                percent={monthlyQuotaPercent}
              />

              <Separator orientation="vertical" className="h-8" />

              {/* Refresh Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh data</TooltipContent>
              </Tooltip>

              {/* Create Dropdown */}
              <CreateDropdown onTabChange={setActiveTab} />
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-5">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
              <TabsList className="bg-transparent h-auto p-0 gap-0">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "relative gap-2 px-4 py-2.5 rounded-none border-b-2 border-transparent",
                      "data-[state=active]:bg-transparent data-[state=active]:border-primary",
                      "data-[state=active]:shadow-none hover:bg-muted/50 transition-colors"
                    )}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </header>

        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-5">
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <TabPanel key="overview">
                  <OverviewTab
                    stats={stats}
                    campaigns={campaigns}
                    automations={automations}
                    providerHealth={providerHealth}
                  />
                </TabPanel>
              )}
              {activeTab === "campaigns" && (
                <TabPanel key="campaigns">
                  <CampaignsTab campaigns={campaigns} />
                </TabPanel>
              )}
              {activeTab === "automation" && (
                <TabPanel key="automation">
                  <AutomationTab automations={automations} />
                </TabPanel>
              )}
              {activeTab === "audience" && (
                <TabPanel key="audience">
                  <AudienceTab segments={segments} stats={stats} />
                </TabPanel>
              )}
              {activeTab === "compose" && (
                <TabPanel key="compose">
                  <ComposeTab />
                </TabPanel>
              )}
              {activeTab === "providers" && (
                <TabPanel key="providers">
                  <ProvidersTab providerHealth={providerHealth} />
                </TabPanel>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Sub-components (kept local as they're only used here)
// ============================================================================

function QuotaIndicator({
  label,
  used,
  limit,
  percent,
}: {
  label: string;
  used: number;
  limit: number;
  percent: number;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/50">
      <div className="text-right">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </p>
        <p className="text-sm font-bold tabular-nums">
          {used.toLocaleString()}/{limit.toLocaleString()}
        </p>
      </div>
      <div className="w-16">
        <Progress
          value={percent}
          className={cn(
            "h-1.5",
            percent > 90
              ? "[&>div]:bg-rose-500"
              : percent > 70
                ? "[&>div]:bg-amber-500"
                : "[&>div]:bg-emerald-500"
          )}
        />
      </div>
    </div>
  );
}

function CreateDropdown({ onTabChange }: { onTabChange: (tab: TabType) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => onTabChange("compose")}>
          <Send className="h-4 w-4 mr-2 text-primary" />
          <div>
            <p className="font-medium">New Email</p>
            <p className="text-xs text-muted-foreground">Send a single email</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange("campaigns")}>
          <Megaphone className="h-4 w-4 mr-2 text-blue-500" />
          <div>
            <p className="font-medium">New Campaign</p>
            <p className="text-xs text-muted-foreground">Bulk email campaign</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onTabChange("automation")}>
          <Zap className="h-4 w-4 mr-2 text-amber-500" />
          <div>
            <p className="font-medium">New Automation</p>
            <p className="text-xs text-muted-foreground">Automated email flow</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTabChange("audience")}>
          <Target className="h-4 w-4 mr-2 text-violet-500" />
          <div>
            <p className="font-medium">New Segment</p>
            <p className="text-xs text-muted-foreground">Audience segment</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
