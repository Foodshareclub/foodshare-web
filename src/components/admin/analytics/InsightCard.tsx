"use client";

import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass";

interface InsightCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  subtitle?: string;
  loading?: boolean;
  delay?: number;
}

export function InsightCard({
  title,
  value,
  change,
  changeLabel = "vs last month",
  icon: Icon,
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10",
  subtitle,
  loading = false,
  delay = 0,
}: InsightCardProps) {
  const getTrendColor = () => {
    if (change === undefined || change === 0) return "text-muted-foreground";
    return change > 0 ? "text-emerald-500" : "text-rose-500";
  };

  const renderTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className="w-4 h-4" />;
    }
    return change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <GlassCard className="relative overflow-hidden">
        <div className="animate-pulse space-y-3">
          <div className="flex justify-between">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-10 w-10 bg-muted rounded-xl" />
          </div>
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-3 w-20 bg-muted rounded" />
        </div>
      </GlassCard>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
    >
      <GlassCard className="relative overflow-hidden group">
        {/* Gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative">
          <div className="flex justify-between items-start mb-3">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className={cn("p-2.5 rounded-xl", iconBgColor)}>
              <Icon className={cn("w-5 h-5", iconColor)} />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-3xl font-bold tracking-tight">
              {typeof value === "number" ? value.toLocaleString() : value}
            </h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>

          {change !== undefined && (
            <div
              className={cn("flex items-center gap-1.5 mt-3 text-sm font-medium", getTrendColor())}
            >
              {renderTrendIcon()}
              <span>
                {change > 0 ? "+" : ""}
                {change.toFixed(1)}%
              </span>
              <span className="text-muted-foreground font-normal">{changeLabel}</span>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
