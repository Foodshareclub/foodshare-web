"use client";

/**
 * OverviewTab - Premium Dashboard Overview
 *
 * Bento grid layout with:
 * - Animated metric cards
 * - Real-time provider health
 * - Activity timeline
 * - Performance charts
 */

import { motion } from "framer-motion";
import {
  Send,
  Users,
  Eye,
  MousePointerClick,
  Megaphone,
  Zap,
  Activity,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Mail,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { EmptyState } from "../shared/EmptyState";
import { CampaignListItem } from "../cards/CampaignListItem";
import { AutomationListItem } from "../cards/AutomationListItem";
import type { OverviewTabProps, ProviderHealth } from "../types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PROVIDER_CONFIG = {
  resend: { name: "Resend", color: "from-zinc-600 to-zinc-800", icon: "✉️" },
  brevo: { name: "Brevo", color: "from-blue-500 to-blue-700", icon: "📧" },
  aws_ses: { name: "AWS SES", color: "from-orange-500 to-amber-600", icon: "☁️" },
  mailersend: { name: "MailerSend", color: "from-emerald-500 to-green-600", icon: "📬" },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function OverviewTab({ stats, campaigns, automations, providerHealth }: OverviewTabProps) {
  const openRateTrend = stats.avgOpenRate > 21 ? "up" : "down";
  const clickRateTrend = stats.avgClickRate > 2.5 ? "up" : "down";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Bento Grid - Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Subscribers"
          value={stats.totalSubscribers.toLocaleString()}
          subtext={`${stats.activeSubscribers.toLocaleString()} active`}
          icon={<Users className="h-5 w-5" />}
          color="blue"
          trend={{ direction: "up", value: "+12%" }}
        />
        <MetricCard
          label="Emails Sent"
          value={stats.emailsSent30d.toLocaleString()}
          subtext="Last 30 days"
          icon={<Send className="h-5 w-5" />}
          color="emerald"
        />
        <MetricCard
          label="Open Rate"
          value={`${stats.avgOpenRate}%`}
          subtext="vs 21% industry avg"
          icon={<Eye className="h-5 w-5" />}
          color="violet"
          trend={{
            direction: openRateTrend,
            value:
              openRateTrend === "up"
                ? `+${(stats.avgOpenRate - 21).toFixed(1)}%`
                : `${(stats.avgOpenRate - 21).toFixed(1)}%`,
          }}
        />
        <MetricCard
          label="Click Rate"
          value={`${stats.avgClickRate}%`}
          subtext="vs 2.5% industry avg"
          icon={<MousePointerClick className="h-5 w-5" />}
          color="amber"
          trend={{
            direction: clickRateTrend,
            value:
              clickRateTrend === "up"
                ? `+${(stats.avgClickRate - 2.5).toFixed(1)}%`
                : `${(stats.avgClickRate - 2.5).toFixed(1)}%`,
          }}
        />
      </div>

      {/* Provider Performance Grid */}
      <motion.div variants={item}>
        <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                  <Activity className="h-4 w-4" />
                </div>
                Email Providers
              </CardTitle>
              <Badge variant="outline" className="text-xs font-normal">
                <Sparkles className="h-3 w-3 mr-1" />
                Smart Routing Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(providerHealth.length > 0 ? providerHealth : defaultProviderHealth).map(
                (provider) => (
                  <ProviderCard key={provider.provider} provider={provider} />
                )
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Recent Campaigns - 3 columns */}
        <motion.div variants={item} className="lg:col-span-3">
          <Card className="h-full border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-500">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  Recent Campaigns
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 gap-1 text-muted-foreground hover:text-foreground"
                >
                  View All
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {campaigns.slice(0, 4).map((campaign, i) => (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <CampaignListItem campaign={campaign} />
                  </motion.div>
                ))}
                {campaigns.length === 0 && (
                  <EmptyState
                    icon={<Megaphone className="h-8 w-8" />}
                    title="No campaigns yet"
                    description="Create your first email campaign to reach your audience"
                    action={
                      <Button size="sm" variant="outline" className="mt-3">
                        <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                        Create Campaign
                      </Button>
                    }
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Automations - 2 columns */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="h-full border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-500">
                    <Zap className="h-4 w-4" />
                  </div>
                  Automations
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 gap-1 text-muted-foreground hover:text-foreground"
                >
                  View All
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {automations.slice(0, 4).map((automation, i) => (
                  <motion.div
                    key={automation.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <AutomationListItem automation={automation} />
                  </motion.div>
                ))}
                {automations.length === 0 && (
                  <EmptyState
                    icon={<Zap className="h-8 w-8" />}
                    title="No automations"
                    description="Set up automated flows to engage users"
                    action={
                      <Button size="sm" variant="outline" className="mt-3">
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                        Create Automation
                      </Button>
                    }
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Stats Row */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QuickStat
          label="Bounce Rate"
          value={`${stats.bounceRate}%`}
          status={stats.bounceRate < 2 ? "good" : stats.bounceRate < 5 ? "warning" : "bad"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <QuickStat
          label="Unsubscribe Rate"
          value={`${stats.unsubscribeRate}%`}
          status={
            stats.unsubscribeRate < 0.5 ? "good" : stats.unsubscribeRate < 1 ? "warning" : "bad"
          }
          icon={<Users className="h-4 w-4" />}
        />
        <QuickStat
          label="Active Campaigns"
          value={stats.activeCampaigns.toString()}
          status="neutral"
          icon={<Megaphone className="h-4 w-4" />}
        />
        <QuickStat
          label="Suppressed Emails"
          value={stats.suppressedEmails.toLocaleString()}
          status="neutral"
          icon={<Mail className="h-4 w-4" />}
        />
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

const colorConfig = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200/50 dark:border-blue-800/50",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200/50 dark:border-emerald-800/50",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-200/50 dark:border-violet-800/50",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200/50 dark:border-amber-800/50",
  },
};

function MetricCard({
  label,
  value,
  subtext,
  icon,
  color,
  trend,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  color: keyof typeof colorConfig;
  trend?: { direction: "up" | "down"; value: string };
}) {
  const colors = colorConfig[color];

  return (
    <motion.div variants={item}>
      <Card
        className={cn(
          "relative overflow-hidden border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm",
          "hover:shadow-lg hover:shadow-black/5 transition-all duration-300 hover:-translate-y-0.5"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {subtext && (
                <div className="flex items-center gap-1.5">
                  {trend && (
                    <span
                      className={cn(
                        "flex items-center text-xs font-medium",
                        trend.direction === "up"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {trend.direction === "up" ? (
                        <TrendingUp className="h-3 w-3 mr-0.5" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-0.5" />
                      )}
                      {trend.value}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{subtext}</span>
                </div>
              )}
            </div>
            <div className={cn("rounded-xl p-2.5", colors.bg, colors.text)}>{icon}</div>
          </div>
        </CardContent>
        {/* Decorative gradient */}
        <div className={cn("absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r", colors.bg)} />
      </Card>
    </motion.div>
  );
}

function ProviderCard({ provider }: { provider: ProviderHealth }) {
  const config = PROVIDER_CONFIG[provider.provider] || PROVIDER_CONFIG.resend;
  const quotaPercent = provider.dailyQuotaLimit
    ? Math.round(((provider.dailyQuotaUsed || 0) / provider.dailyQuotaLimit) * 100)
    : 0;

  const statusColors = {
    healthy: "bg-emerald-500",
    degraded: "bg-amber-500",
    down: "bg-rose-500",
  };

  return (
    <div className="group relative rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-4 hover:shadow-lg hover:shadow-black/5 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className="font-semibold text-sm">{config.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn("h-2 w-2 rounded-full", statusColors[provider.status])} />
          <span className="text-xs text-muted-foreground capitalize">{provider.status}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-muted-foreground">Health</p>
          <p className="text-lg font-bold">{provider.healthScore}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Latency</p>
          <p className="text-lg font-bold">{provider.avgLatencyMs}ms</p>
        </div>
      </div>

      {/* Quota Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Daily Quota</span>
          <span className="font-medium tabular-nums">
            {provider.dailyQuotaUsed || 0}/{provider.dailyQuotaLimit || 0}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-border/50 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(quotaPercent, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
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
      </div>

      {/* Gradient overlay on hover */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
          `bg-gradient-to-br ${config.color} opacity-5`
        )}
      />
    </div>
  );
}

function QuickStat({
  label,
  value,
  status,
  icon,
}: {
  label: string;
  value: string;
  status: "good" | "warning" | "bad" | "neutral";
  icon: React.ReactNode;
}) {
  const statusColors = {
    good: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    warning: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    bad: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
    neutral: "text-muted-foreground bg-muted/50",
  };

  return (
    <motion.div
      variants={item}
      className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50"
    >
      <div className={cn("rounded-lg p-2", statusColors[status])}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </motion.div>
  );
}

const defaultProviderHealth: ProviderHealth[] = [
  {
    provider: "resend",
    healthScore: 100,
    successRate: 100,
    avgLatencyMs: 0,
    totalRequests: 0,
    status: "healthy",
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 100,
  },
  {
    provider: "brevo",
    healthScore: 100,
    successRate: 100,
    avgLatencyMs: 0,
    totalRequests: 0,
    status: "healthy",
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 300,
  },
  {
    provider: "aws_ses",
    healthScore: 100,
    successRate: 100,
    avgLatencyMs: 0,
    totalRequests: 0,
    status: "healthy",
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 50000,
  },
  {
    provider: "mailersend",
    healthScore: 100,
    successRate: 100,
    avgLatencyMs: 0,
    totalRequests: 0,
    status: "healthy",
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 400,
  },
];
