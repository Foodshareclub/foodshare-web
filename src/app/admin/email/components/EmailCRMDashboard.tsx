"use client";

/**
 * EmailCRMDashboard - Professional Email CRM Management Interface
 *
 * A polished, enterprise-grade email management dashboard featuring:
 * - Real-time provider health monitoring with live quota tracking
 * - Bento grid layout with glass morphism design
 * - Micro-interactions and smooth animations
 * - Professional data visualization
 */

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send,
  Plus,
  RefreshCw,
  Zap,
  Target,
  Megaphone,
  Activity,
  ChevronRight,
  BarChart3,
  Users,
  Settings,
  FileText,
  Inbox,
} from "lucide-react";
import { getDefaultStats } from "./constants";
import {
  OverviewTab,
  CampaignsTab,
  AutomationTab,
  AudienceTab,
  ComposeTab,
  ProvidersTab,
  TemplatesTab,
  QueueTab,
} from "./tabs";
import type { TabType, EmailCRMDashboardProps } from "./types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { refreshEmailDashboard } from "@/app/actions/campaigns";
import type { ProviderHealth } from "@/lib/data/admin-email";

// Provider brand colors and icons
const PROVIDER_CONFIG = {
  resend: {
    name: "Resend",
    color: "from-black to-zinc-800",
    textColor: "text-zinc-900 dark:text-zinc-100",
    bgColor: "bg-zinc-100 dark:bg-zinc-800/50",
    borderColor: "border-zinc-200 dark:border-zinc-700",
    icon: "✉️",
  },
  brevo: {
    name: "Brevo",
    color: "from-blue-600 to-blue-700",
    textColor: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: "📧",
  },
  aws_ses: {
    name: "AWS SES",
    color: "from-orange-500 to-amber-600",
    textColor: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: "☁️",
  },
  mailersend: {
    name: "MailerSend",
    color: "from-emerald-500 to-green-600",
    textColor: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    icon: "📬",
  },
};

const TAB_CONFIG: Record<TabType, { icon: React.ReactNode; label: string; color: string }> = {
  dashboard: { icon: <BarChart3 className="h-4 w-4" />, label: "Dashboard", color: "text-primary" },
  overview: { icon: <Activity className="h-4 w-4" />, label: "Overview", color: "text-primary" },
  campaigns: {
    icon: <Megaphone className="h-4 w-4" />,
    label: "Campaigns",
    color: "text-blue-500",
  },
  automation: { icon: <Zap className="h-4 w-4" />, label: "Automation", color: "text-amber-500" },
  audience: { icon: <Users className="h-4 w-4" />, label: "Audience", color: "text-violet-500" },
  templates: {
    icon: <FileText className="h-4 w-4" />,
    label: "Templates",
    color: "text-purple-500",
  },
  queue: { icon: <Inbox className="h-4 w-4" />, label: "Queue", color: "text-cyan-500" },
  compose: { icon: <Send className="h-4 w-4" />, label: "Compose", color: "text-emerald-500" },
  providers: {
    icon: <Settings className="h-4 w-4" />,
    label: "Providers",
    color: "text-slate-500",
  },
};

export function EmailCRMDashboard({ initialData }: EmailCRMDashboardProps) {
  const _t = useTranslations();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data with defaults
  const stats = initialData?.stats || getDefaultStats();
  const providerHealth = initialData?.providerHealth || [];
  const campaigns = initialData?.campaigns || [];
  const automations = initialData?.automations || [];
  const segments = initialData?.segments || [];
  const templates = initialData?.templates || [];
  const circuitBreakers = initialData?.circuitBreakers || [];
  const queueStats = initialData?.queueStats || {
    pending: 0,
    processing: 0,
    failed: 0,
    deadLetter: 0,
    completed: 0,
    totalToday: 0,
  };

  // Quota calculations
  const dailyQuotaPercent =
    stats.dailyQuotaLimit > 0
      ? Math.round((stats.dailyQuotaUsed / stats.dailyQuotaLimit) * 100)
      : 0;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshEmailDashboard();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, []);

  // Default provider health for display
  const displayProviderHealth: ProviderHealth[] =
    providerHealth.length > 0
      ? providerHealth
      : [
          {
            provider: "resend",
            healthScore: 100,
            successRate: 100,
            avgLatencyMs: 0,
            totalRequests: 0,
            status: "healthy",
          },
          {
            provider: "brevo",
            healthScore: 100,
            successRate: 100,
            avgLatencyMs: 0,
            totalRequests: 0,
            status: "healthy",
          },
          {
            provider: "aws_ses",
            healthScore: 100,
            successRate: 100,
            avgLatencyMs: 0,
            totalRequests: 0,
            status: "healthy",
          },
          {
            provider: "mailersend",
            healthScore: 100,
            successRate: 100,
            avgLatencyMs: 0,
            totalRequests: 0,
            status: "healthy",
          },
        ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full min-h-0 rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden shadow-xl shadow-black/5">
        {/* Premium Header */}
        <header className="flex-shrink-0 border-b border-border/50 bg-gradient-to-r from-card/80 via-card/60 to-card/80 backdrop-blur-xl">
          {/* Top Bar - Providers & Actions */}
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            {/* Provider Health Cards */}
            <div className="flex items-center gap-3">
              {displayProviderHealth.map((provider) => (
                <ProviderHealthPill key={provider.provider} provider={provider} />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {/* Quota Display */}
              <QuotaDisplay
                used={stats.dailyQuotaUsed}
                limit={stats.dailyQuotaLimit}
                percent={dailyQuotaPercent}
              />

              <div className="h-8 w-px bg-border/50" />

              {/* Sync Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 h-9 px-3 bg-background/50 hover:bg-background border-border/50"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                    <span className="hidden sm:inline text-xs font-medium">Sync</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Refresh provider stats</p>
                </TooltipContent>
              </Tooltip>

              {/* Create Button */}
              <CreateDropdown onTabChange={setActiveTab} />
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 pb-0">
            <nav className="flex items-center gap-1">
              {(
                [
                  "overview",
                  "campaigns",
                  "automation",
                  "audience",
                  "templates",
                  "queue",
                  "compose",
                  "providers",
                ] as TabType[]
              ).map((tab) => {
                const config = TAB_CONFIG[tab];
                const isActive = activeTab === tab;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200",
                      "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 rounded-t-lg"
                    )}
                  >
                    <span className={cn(isActive && config.color)}>{config.icon}</span>
                    <span className="hidden sm:inline">{config.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-transparent to-muted/10">
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {activeTab === "overview" && (
                  <OverviewTab
                    stats={stats}
                    campaigns={campaigns}
                    automations={automations}
                    providerHealth={providerHealth}
                  />
                )}
                {activeTab === "campaigns" && <CampaignsTab campaigns={campaigns} />}
                {activeTab === "automation" && <AutomationTab automations={automations} />}
                {activeTab === "audience" && <AudienceTab segments={segments} stats={stats} />}
                {activeTab === "templates" && <TemplatesTab templates={templates} />}
                {activeTab === "queue" && (
                  <QueueTab queueStats={queueStats} circuitBreakers={circuitBreakers} />
                )}
                {activeTab === "compose" && <ComposeTab />}
                {activeTab === "providers" && <ProvidersTab providerHealth={providerHealth} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Premium Sub-components
// ============================================================================

function ProviderHealthPill({ provider }: { provider: ProviderHealth }) {
  const config = PROVIDER_CONFIG[provider.provider] || PROVIDER_CONFIG.resend;

  const statusConfig = {
    healthy: {
      dot: "bg-emerald-500",
      ring: "ring-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    degraded: {
      dot: "bg-amber-500",
      ring: "ring-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
    },
    down: {
      dot: "bg-rose-500",
      ring: "ring-rose-500/20",
      text: "text-rose-600 dark:text-rose-400",
    },
  };

  const status = statusConfig[provider.status];
  const quotaPercent = provider.dailyQuotaLimit
    ? Math.round(((provider.dailyQuotaUsed || 0) / provider.dailyQuotaLimit) * 100)
    : 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "group relative flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-default",
            "border transition-all duration-200",
            config.bgColor,
            config.borderColor,
            "hover:shadow-md hover:shadow-black/5"
          )}
        >
          {/* Status Indicator */}
          <div className="relative">
            <div className={cn("h-2 w-2 rounded-full", status.dot)} />
            <div
              className={cn("absolute inset-0 rounded-full animate-ping opacity-75", status.dot)}
              style={{ animationDuration: "2s" }}
            />
          </div>

          {/* Provider Info */}
          <div className="flex flex-col min-w-0">
            <span className={cn("text-xs font-semibold truncate", config.textColor)}>
              {config.name}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {provider.dailyQuotaUsed || 0}/{provider.dailyQuotaLimit || 0}
            </span>
          </div>

          {/* Mini Progress */}
          <div className="w-12 h-1 rounded-full bg-border/50 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(quotaPercent, 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                quotaPercent > 90
                  ? "bg-rose-500"
                  : quotaPercent > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              )}
            />
          </div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium">{config.name}</span>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", status.text)}>
              {provider.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Health</p>
              <p className="font-semibold">{provider.healthScore}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Latency</p>
              <p className="font-semibold">{provider.avgLatencyMs}ms</p>
            </div>
            <div>
              <p className="text-muted-foreground">Success</p>
              <p className="font-semibold">{provider.successRate}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Requests</p>
              <p className="font-semibold">{provider.totalRequests.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function QuotaDisplay({ used, limit, percent }: { used: number; limit: number; percent: number }) {
  const getQuotaColor = () => {
    if (percent > 90) return "text-rose-500";
    if (percent > 70) return "text-amber-500";
    return "text-emerald-500";
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/30 border border-border/50">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Daily Quota
        </span>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-lg font-bold tabular-nums", getQuotaColor())}>
            {used.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">/ {limit.toLocaleString()}</span>
        </div>
      </div>

      {/* Circular Progress */}
      <div className="relative h-10 w-10">
        <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border/50"
          />
          <motion.path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={getQuotaColor()}
            initial={{ strokeDasharray: "0 100" }}
            animate={{ strokeDasharray: `${percent} 100` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center text-[10px] font-bold",
            getQuotaColor()
          )}
        >
          {percent}%
        </span>
      </div>
    </div>
  );
}

function CreateDropdown({ onTabChange }: { onTabChange: (tab: TabType) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-2 h-9 px-4 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" />
          <span className="font-semibold">Create</span>
          <ChevronRight className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-2" sideOffset={8}>
        <DropdownMenuItem
          onClick={() => onTabChange("compose")}
          className="flex items-start gap-3 p-3 cursor-pointer rounded-lg"
        >
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Send className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Send Email</p>
            <p className="text-xs text-muted-foreground truncate">Quick one-off email</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onTabChange("campaigns")}
          className="flex items-start gap-3 p-3 cursor-pointer rounded-lg"
        >
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
            <Megaphone className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">New Campaign</p>
            <p className="text-xs text-muted-foreground truncate">Bulk email campaign</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuItem
          onClick={() => onTabChange("automation")}
          className="flex items-start gap-3 p-3 cursor-pointer rounded-lg"
        >
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
            <Zap className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">New Automation</p>
            <p className="text-xs text-muted-foreground truncate">Automated email flow</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onTabChange("audience")}
          className="flex items-start gap-3 p-3 cursor-pointer rounded-lg"
        >
          <div className="rounded-lg bg-violet-500/10 p-2 text-violet-500">
            <Target className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">New Segment</p>
            <p className="text-xs text-muted-foreground truncate">Target audience group</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
