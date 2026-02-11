"use client";

/**
 * AutomationCardEnhanced - Full CRUD automation card
 */

import React, { useState, useTransition } from "react";
import { Play, Pause, MoreVertical, Edit, Copy, Trash2 } from "lucide-react";
import type { ActiveAutomation } from "../types";
import { cn } from "@/lib/utils";
import { useActionToast } from "@/hooks/useActionToast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { refreshEmailDashboard } from "@/app/actions/campaigns";

const statusConfig = {
  draft: {
    color: "border-slate-500/30",
    dot: "bg-slate-500",
    label: "Draft",
    bg: "bg-slate-500/5",
  },
  active: {
    color: "border-emerald-500/30",
    dot: "bg-emerald-500 animate-pulse",
    label: "Active",
    bg: "bg-emerald-500/5",
  },
  paused: {
    color: "border-amber-500/30",
    dot: "bg-amber-500",
    label: "Paused",
    bg: "bg-amber-500/5",
  },
  archived: {
    color: "border-slate-400/30",
    dot: "bg-slate-400",
    label: "Archived",
    bg: "bg-slate-400/5",
  },
};

interface AutomationCardEnhancedProps {
  automation: ActiveAutomation;
  onEdit: () => void;
}

export function AutomationCardEnhanced({ automation, onEdit }: AutomationCardEnhancedProps) {
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<"toggle" | "delete" | "duplicate" | null>(null);
  const toast = useActionToast();
  const config = statusConfig[automation.status];
  const isLoading = isPending && actionType !== null;

  const handleToggleStatus = (): void => {
    setActionType("toggle");
    startTransition(async () => {
      const { toggleAutomationStatus } = await import("@/app/actions/automations");
      const newStatus = automation.status === "active" ? "paused" : "active";
      const result = await toggleAutomationStatus(automation.id, newStatus);
      if (result.success) {
        toast.success(
          newStatus === "active" ? "Automation activated" : "Automation paused",
          result.data.message
        );
      } else {
        const errorMsg = typeof result.error === "string" ? result.error : result.error?.message;
        toast.error("Failed to update status", errorMsg);
      }
      refreshEmailDashboard();
      setActionType(null);
    });
  };

  const handleDuplicate = (): void => {
    setActionType("duplicate");
    startTransition(async () => {
      const { duplicateAutomation } = await import("@/app/actions/automations");
      const result = await duplicateAutomation(automation.id);
      if (result.success) {
        toast.success("Automation duplicated", `Created "${result.data.name}"`);
      } else {
        const errorMsg = typeof result.error === "string" ? result.error : result.error?.message;
        toast.error("Failed to duplicate", errorMsg);
      }
      refreshEmailDashboard();
      setActionType(null);
    });
  };

  const handleDelete = (): void => {
    if (
      !confirm(
        `Are you sure you want to archive "${automation.name}"? This will stop all pending emails.`
      )
    )
      return;
    setActionType("delete");
    startTransition(async () => {
      const { deleteAutomationFlow } = await import("@/app/actions/automations");
      const result = await deleteAutomationFlow(automation.id);
      if (result.success) {
        toast.success("Automation archived", "All pending emails have been cancelled");
      } else {
        const errorMsg = typeof result.error === "string" ? result.error : result.error?.message;
        toast.error("Failed to archive", errorMsg);
      }
      refreshEmailDashboard();
      setActionType(null);
    });
  };

  return (
    <Card
      className={cn(
        "bg-card/50 backdrop-blur-sm border hover:shadow-md transition-all",
        config.color,
        config.bg,
        isLoading && "opacity-70"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", config.dot)} />
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleToggleStatus}
                  disabled={isLoading || automation.status === "archived"}
                >
                  {isPending && actionType === "toggle" ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : automation.status === "active" ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {automation.status === "active" ? "Pause automation" : "Activate automation"}
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isLoading}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate} disabled={isPending}>
                  {actionType === "duplicate" ? (
                    <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-600"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {actionType === "delete" ? (
                    <div className="h-4 w-4 mr-2 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <h4 className="font-semibold text-sm mb-1">{automation.name}</h4>
        <p className="text-xs text-muted-foreground mb-4 capitalize">
          Trigger: {automation.triggerType.replace(/_/g, " ")}
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold tabular-nums">
              {automation.totalEnrolled.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Enrolled</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">
              {automation.totalCompleted.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{automation.conversionRate}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">Conversion</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
