"use client";

/**
 * RoutingRule - Smart routing rule display
 */

import { Layers, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const priorityConfig = {
  High: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  Normal: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  Fallback: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  "Last resort": "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
};

interface RoutingRuleProps {
  condition: string;
  action: string;
  priority: string;
}

export function RoutingRule({ condition, action, priority }: RoutingRuleProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded bg-primary/10 text-primary">
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{condition}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {action}
          </p>
        </div>
      </div>
      <Badge className={cn("text-xs", priorityConfig[priority as keyof typeof priorityConfig])}>
        {priority}
      </Badge>
    </div>
  );
}
