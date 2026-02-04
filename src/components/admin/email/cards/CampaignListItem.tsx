"use client";

/**
 * CampaignListItem - Premium campaign row for overview lists
 */

import { motion } from "framer-motion";
import { MoreVertical, Eye, Edit, Copy, Trash2, Users, MousePointerClick } from "lucide-react";
import type { RecentCampaign } from "../types";
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
  draft: {
    color: "bg-slate-500",
    textColor: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800/50",
    label: "Draft",
  },
  scheduled: {
    color: "bg-blue-500",
    textColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    label: "Scheduled",
  },
  sending: {
    color: "bg-amber-500 animate-pulse",
    textColor: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    label: "Sending",
  },
  sent: {
    color: "bg-emerald-500",
    textColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    label: "Sent",
  },
  paused: {
    color: "bg-orange-500",
    textColor: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    label: "Paused",
  },
  cancelled: {
    color: "bg-rose-500",
    textColor: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    label: "Cancelled",
  },
};

interface CampaignListItemProps {
  campaign: RecentCampaign;
}

export function CampaignListItem({ campaign }: CampaignListItemProps) {
  const config = statusConfig[campaign.status];
  const openRate =
    campaign.totalSent > 0 ? Math.round((campaign.totalOpened / campaign.totalSent) * 100) : 0;
  const clickRate =
    campaign.totalSent > 0 ? Math.round((campaign.totalClicked / campaign.totalSent) * 100) : 0;

  return (
    <div className="group relative flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-gradient-to-r from-card/50 to-card/30 hover:from-card/80 hover:to-card/60 hover:shadow-md hover:shadow-black/5 transition-all duration-200">
      {/* Status Indicator */}
      <div className="relative">
        <div className={cn("h-3 w-3 rounded-full", config.color)} />
        {campaign.status === "sending" && (
          <div
            className={cn("absolute inset-0 rounded-full animate-ping", config.color, "opacity-50")}
          />
        )}
      </div>

      {/* Campaign Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">{campaign.name}</p>
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0", config.textColor, config.bgColor, "border-0")}
          >
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{campaign.subject}</p>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium tabular-nums">
                {campaign.totalRecipients.toLocaleString()}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">Recipients</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium tabular-nums">{openRate}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">Open Rate</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs">
              <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium tabular-nums">{clickRate}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">Click Rate</TooltipContent>
        </Tooltip>
      </div>

      {/* Performance Bar (Mobile) */}
      <div className="hidden sm:block md:hidden w-16">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${openRate}%` }}
            className="h-full bg-emerald-500 rounded-full"
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-0.5">{openRate}% opens</p>
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
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Campaign
          </DropdownMenuItem>
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
