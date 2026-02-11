import { Zap } from "lucide-react";
import { GlassCard } from "../shared/GlassCard";
import type { ActiveAutomation } from "../types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function AutomationCard({ automation }: { automation: ActiveAutomation }) {
  const statusColors = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    archived: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <GlassCard className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "rounded-lg p-2",
            automation.status === "active"
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          )}
        >
          <Zap className="h-5 w-5" />
        </div>
        <Badge variant="outline" className={cn("text-xs", statusColors[automation.status])}>
          {automation.status}
        </Badge>
      </div>

      <h4 className="font-semibold mb-1">{automation.name}</h4>
      <p className="text-sm text-muted-foreground mb-4 capitalize">
        Trigger: {automation.triggerType.replace("_", " ")}
      </p>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
        <div className="text-center">
          <p className="text-lg font-semibold">{automation.totalEnrolled.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Enrolled</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">{automation.totalCompleted.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">{automation.conversionRate}%</p>
          <p className="text-xs text-muted-foreground">Conversion</p>
        </div>
      </div>
    </GlassCard>
  );
}
