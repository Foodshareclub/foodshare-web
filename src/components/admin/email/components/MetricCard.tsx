"use client";

/**
 * MetricCard - Displays a single metric with icon and optional trend
 * Used in dashboard overview and various stat displays
 */

import { TrendingUp, TrendingDown } from "lucide-react";
import type { MetricCardProps } from "../types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const colorClasses = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function MetricCard({
  label,
  value,
  subValue,
  icon,
  trend,
  color = "blue",
}: MetricCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                {trend === "down" && <TrendingDown className="h-3 w-3 text-rose-500" />}
                {subValue}
              </p>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl", colorClasses[color])}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
