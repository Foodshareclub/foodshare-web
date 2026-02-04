"use client";

/**
 * AutomationListItem - Premium automation row for overview lists
 */

import { motion } from "framer-motion";
import { MoreVertical, Eye, Edit, Play, Pause, Copy, Trash2, Zap, TrendingUp } from "lucide-react";
import type { ActiveAutomation } from "../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const statusConfig = {
  active: {
    color: "bg-emerald-500",
    textColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    label: "Active",
    icon: Play,
  },
  paused: {
    color: "bg-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    label: "Paused",
    icon: Pause,
  },
  draft: {
    color: "bg-slate-500",
    textColor: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800/50",
    label: "Draft",
    icon: Edit,
  },
  archived: {
    color: "bg-zinc-400",
    textColor: "text-zinc-600 dark:text-zinc-400",
    bgColor: "bg-zinc-100 dark:bg-zinc-800/50",
    label: "Archived",
    icon: Eye,
  },
};

const triggerLabels: Record<string, string> = {
  user_signup: "User Signup",
  first_post: "First Post",
  inactivity: "Inactivity",
  order_complete: "Order Complete",
  review_request: "Review Request",
  welcome: "Welcome Series",
  onboarding: "Onboarding",
};

interface AutomationListItemProps {
  automation: ActiveAutomation;
}

export function AutomationListItem({ automation }: AutomationListItemProps) {
  const config = statusConfig[automation.status] || statusConfig.draft;
  const StatusIcon = config.icon;

  return (
    <div className="group relative flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-gradient-to-r from-card/50 to-card/30 hover:from-card/80 hover:to-card/60 hover:shadow-md hover:shadow-black/5 transition-all duration-200">
      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center h-10 w-10 rounded-xl",
          "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        )}
      >
        <Zap className="h-5 w-5" />
      </div>

      {/* Automation Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">{automation.name}</p>
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0", config.textColor, config.bgColor, "border-0")}
          >
            <StatusIcon className="h-2.5 w-2.5 mr-1" />
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Trigger:{" "}
          {triggerLabels[automation.triggerType] || automation.triggerType.replace(/_/g, " ")}
        </p>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center min-w-[48px]">
              <span className="text-sm font-bold tabular-nums">
                {automation.totalEnrolled.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground">enrolled</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">Total users enrolled</TooltipContent>
        </Tooltip>

        <div className="h-8 w-px bg-border/50" />

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center min-w-[48px]">
              <span
                className={cn(
                  "text-sm font-bold tabular-nums",
                  automation.conversionRate > 10 ? "text-emerald-600 dark:text-emerald-400" : ""
                )}
              >
                {automation.conversionRate}%
              </span>
              <span className="text-[10px] text-muted-foreground">convert</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">Conversion rate</TooltipContent>
        </Tooltip>
      </div>

      {/* Conversion indicator */}
      <div className="hidden lg:block w-20">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(automation.conversionRate * 5, 100)}%` }}
              className={cn(
                "h-full rounded-full",
                automation.conversionRate > 15
                  ? "bg-emerald-500"
                  : automation.conversionRate > 5
                    ? "bg-amber-500"
                    : "bg-rose-500"
              )}
            />
          </div>
          <TrendingUp
            className={cn(
              "h-3.5 w-3.5",
              automation.conversionRate > 10 ? "text-emerald-500" : "text-muted-foreground"
            )}
          />
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="gap-2">
            <Eye className="h-4 w-4" />
            View Flow
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Automation
          </DropdownMenuItem>
          {automation.status === "active" ? (
            <DropdownMenuItem className="gap-2">
              <Pause className="h-4 w-4" />
              Pause
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="gap-2">
              <Play className="h-4 w-4" />
              Activate
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="gap-2">
            <Copy className="h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 text-rose-600 focus:text-rose-600">
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
