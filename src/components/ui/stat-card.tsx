import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { GlassCard } from "./glass-card";

interface StatCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({ icon: Icon, value, label, trend, className }: StatCardProps) {
  return (
    <GlassCard hover intensity="subtle" className={cn("p-6", className)}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <span className="text-3xl font-bold text-foreground">{value}</span>
          {trend && (
            <span
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
              )}
            >
              {trend.positive ? "+" : ""}
              {trend.value}
            </span>
          )}
        </div>
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="size-6 text-primary" />
        </div>
      </div>
    </GlassCard>
  );
}
