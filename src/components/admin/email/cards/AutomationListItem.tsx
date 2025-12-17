"use client";

/**
 * AutomationListItem - Compact automation row for overview lists
 */

import { Play, Pause } from "lucide-react";
import type { ActiveAutomation } from "../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const statusConfig = {
  draft: { color: "bg-slate-500", label: "Draft" },
  active: { color: "bg-emerald-500 animate-pulse", label: "Active" },
  paused: { color: "bg-amber-500", label: "Paused" },
  archived: { color: "bg-slate-400", label: "Archived" },
};

interface AutomationListItemProps {
  automation: ActiveAutomation;
}

export function AutomationListItem({ automation }: AutomationListItemProps) {
  const config = statusConfig[automation.status];

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("h-2 w-2 rounded-full flex-shrink-0", config.color)} />
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{automation.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {automation.triggerType.replace(/_/g, " ")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium tabular-nums">
            {automation.totalEnrolled.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">enrolled</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          {automation.status === "active" ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
