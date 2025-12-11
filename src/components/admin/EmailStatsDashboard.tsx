"use client";

/**
 * EmailStatsDashboard - Email system statistics and metrics
 * Shows 24h stats, success rates, and provider performance
 * Optimized with custom hooks and modern UI
 */

import React from "react";
import { Activity, CheckCircle2, Clock, Mail, TrendingUp, XCircle, Zap } from "lucide-react";
import { motion } from "framer-motion";

import { useEmailStats } from "@/hooks/useEmailManagement";
import { PROVIDER_NAMES } from "@/lib/email/constants";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  colorScheme?: "emerald" | "blue" | "amber" | "rose" | "violet";
  suffix?: string;
  delay?: number;
}

const colorSchemes = {
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800/50",
    icon: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
    value: "text-emerald-700 dark:text-emerald-300",
    trend: "text-emerald-600 dark:text-emerald-400",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800/50",
    icon: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
    value: "text-blue-700 dark:text-blue-300",
    trend: "text-blue-600 dark:text-blue-400",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/50",
    icon: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400",
    value: "text-amber-700 dark:text-amber-300",
    trend: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800/50",
    icon: "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400",
    value: "text-rose-700 dark:text-rose-300",
    trend: "text-rose-600 dark:text-rose-400",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800/50",
    icon: "bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400",
    value: "text-violet-700 dark:text-violet-300",
    trend: "text-violet-600 dark:text-violet-400",
  },
};

function StatCard({
  label,
  value,
  icon,
  trend,
  trendValue,
  colorScheme = "emerald",
  suffix = "",
  delay = 0,
}: StatCardProps) {
  const colors = colorSchemes[colorScheme];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "relative overflow-hidden rounded-xl border p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className={cn("text-3xl font-bold tracking-tight", colors.value)}>{value}</span>
            {suffix && <span className={cn("text-lg font-medium", colors.value)}>{suffix}</span>}
          </div>
          {trend && trendValue && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", colors.trend)}>
              <TrendingUp className={cn("h-3 w-3", trend === "down" && "rotate-180")} />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={cn("rounded-lg p-2.5", colors.icon)}>{icon}</div>
      </div>
    </motion.div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

interface ProviderCardProps {
  provider: string;
  sent: number;
  failed: number;
  successRate: number;
  delay?: number;
}

function ProviderCard({ provider, sent, failed, successRate, delay = 0 }: ProviderCardProps) {
  const getStatusColor = (rate: number) => {
    if (rate >= 95) return "emerald";
    if (rate >= 80) return "amber";
    return "rose";
  };

  const statusColor = getStatusColor(successRate);
  const statusClasses = {
    emerald: {
      progress: "bg-emerald-500",
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    },
    amber: {
      progress: "bg-amber-500",
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    },
    rose: {
      progress: "bg-rose-500",
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
    },
  };

  const providerIcons: Record<string, React.ReactNode> = {
    brevo: <Mail className="h-5 w-5" />,
    resend: <Zap className="h-5 w-5" />,
    aws_ses: <Activity className="h-5 w-5" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:shadow-lg hover:border-border"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            {providerIcons[provider] || <Mail className="h-5 w-5" />}
          </div>
          <div>
            <h4 className="font-semibold text-foreground">
              {PROVIDER_NAMES[provider as keyof typeof PROVIDER_NAMES] || provider}
            </h4>
            <p className="text-xs text-muted-foreground">Email Provider</p>
          </div>
        </div>
        <div
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            statusClasses[statusColor].badge
          )}
        >
          {successRate.toFixed(1)}%
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Success Rate</span>
            <span className="font-medium text-foreground">{successRate.toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${successRate}%` }}
              transition={{ duration: 0.8, delay: delay + 0.2 }}
              className={cn("h-full rounded-full", statusClasses[statusColor].progress)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">Sent</p>
              <p className="font-semibold text-foreground">{sent.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-500" />
            <div>
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="font-semibold text-foreground">{failed.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProviderCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export function EmailStatsDashboard() {
  const { stats, loading, error } = useEmailStats(true);

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div>
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <ProviderCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-950/30 p-6 text-center"
      >
        <XCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <p className="text-rose-700 dark:text-rose-300 font-medium">
          {error || "Failed to load statistics"}
        </p>
        <p className="text-rose-600/70 dark:text-rose-400/70 text-sm mt-1">
          Please try refreshing the page
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overall Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Sent (24h)"
          value={stats.totalSent24h.toLocaleString()}
          icon={<Mail className="h-5 w-5" />}
          colorScheme="blue"
          trend="up"
          trendValue="vs yesterday"
          delay={0}
        />
        <StatCard
          label="Failed (24h)"
          value={stats.totalFailed24h.toLocaleString()}
          icon={<XCircle className="h-5 w-5" />}
          colorScheme={stats.totalFailed24h > 0 ? "rose" : "emerald"}
          delay={0.1}
        />
        <StatCard
          label="Queued"
          value={stats.totalQueued.toLocaleString()}
          icon={<Clock className="h-5 w-5" />}
          colorScheme={stats.totalQueued > 10 ? "amber" : "emerald"}
          delay={0.2}
        />
        <StatCard
          label="Success Rate"
          value={stats.successRate.toFixed(1)}
          suffix="%"
          icon={<CheckCircle2 className="h-5 w-5" />}
          colorScheme={
            stats.successRate >= 95 ? "emerald" : stats.successRate >= 80 ? "amber" : "rose"
          }
          delay={0.3}
        />
      </div>

      {/* Provider Performance */}
      <div>
        <motion.h3
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"
        >
          <Activity className="h-5 w-5 text-primary" />
          Provider Performance (24h)
        </motion.h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.providerStats.map((providerStat, index) => (
            <ProviderCard
              key={providerStat.provider}
              provider={providerStat.provider}
              sent={providerStat.sent}
              failed={providerStat.failed}
              successRate={providerStat.successRate}
              delay={0.5 + index * 0.1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
