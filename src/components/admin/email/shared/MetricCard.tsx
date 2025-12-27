import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  icon,
  trend,
  trendValue,
  color = "blue",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: "up" | "down";
  trendValue?: string;
  color?: "blue" | "emerald" | "violet" | "amber" | "rose";
}) {
  const colors = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200/50 dark:border-blue-800/50",
      icon: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
      value: "text-blue-700 dark:text-blue-300",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200/50 dark:border-emerald-800/50",
      icon: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
      value: "text-emerald-700 dark:text-emerald-300",
    },
    violet: {
      bg: "bg-violet-50 dark:bg-violet-950/30",
      border: "border-violet-200/50 dark:border-violet-800/50",
      icon: "bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400",
      value: "text-violet-700 dark:text-violet-300",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200/50 dark:border-amber-800/50",
      icon: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400",
      value: "text-amber-700 dark:text-amber-300",
    },
    rose: {
      bg: "bg-rose-50 dark:bg-rose-950/30",
      border: "border-rose-200/50 dark:border-rose-800/50",
      icon: "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400",
      value: "text-rose-700 dark:text-rose-300",
    },
  };

  const c = colors[color];

  return (
    <div className={cn("rounded-xl border p-4 transition-all hover:shadow-md", c.bg, c.border)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={cn("text-2xl font-bold", c.value)}>{value}</p>
          {trend && trendValue && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {trend === "up" ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-rose-500" />
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={cn("rounded-lg p-2", c.icon)}>{icon}</div>
      </div>
    </div>
  );
}
