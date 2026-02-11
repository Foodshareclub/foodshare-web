import { Zap, Play, Pause, Edit, Copy, Trash2, MoreVertical } from "lucide-react";
import type { ActiveAutomation } from "../types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AutomationRow({
  automation,
  compact,
}: {
  automation: ActiveAutomation;
  compact?: boolean;
}) {
  const statusColors = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    archived: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{automation.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {automation.triggerType.replace("_", " ")}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <Badge variant="outline" className={cn("text-xs", statusColors[automation.status])}>
            {automation.status}
          </Badge>
          <span className="text-xs text-muted-foreground">{automation.totalEnrolled} enrolled</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-4">
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
        <div>
          <p className="font-medium">{automation.name}</p>
          <p className="text-sm text-muted-foreground capitalize">
            Trigger: {automation.triggerType.replace("_", " ")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="font-semibold">{automation.totalEnrolled.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Enrolled</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{automation.conversionRate}%</p>
          <p className="text-xs text-muted-foreground">Conversion</p>
        </div>
        <Badge variant="outline" className={cn("text-xs", statusColors[automation.status])}>
          {automation.status}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {automation.status === "active" ? (
              <DropdownMenuItem>
                <Pause className="h-4 w-4 mr-2" /> Pause
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem>
                <Play className="h-4 w-4 mr-2" /> Activate
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
