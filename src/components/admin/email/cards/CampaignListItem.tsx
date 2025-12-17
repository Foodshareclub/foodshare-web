"use client";

/**
 * CampaignListItem - Compact campaign row for overview lists
 */

import { MoreVertical, Eye, Edit, Copy, Trash2 } from "lucide-react";
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

const statusConfig = {
  draft: { color: "bg-slate-500", label: "Draft" },
  scheduled: { color: "bg-blue-500", label: "Scheduled" },
  sending: { color: "bg-amber-500 animate-pulse", label: "Sending" },
  sent: { color: "bg-emerald-500", label: "Sent" },
  paused: { color: "bg-orange-500", label: "Paused" },
  cancelled: { color: "bg-rose-500", label: "Cancelled" },
};

interface CampaignListItemProps {
  campaign: RecentCampaign;
}

export function CampaignListItem({ campaign }: CampaignListItemProps) {
  const config = statusConfig[campaign.status];
  const openRate =
    campaign.totalSent > 0 ? Math.round((campaign.totalOpened / campaign.totalSent) * 100) : 0;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("h-2 w-2 rounded-full flex-shrink-0", config.color)} />
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{campaign.name}</p>
          <p className="text-xs text-muted-foreground truncate">{campaign.subject}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium tabular-nums">{openRate}%</p>
          <p className="text-xs text-muted-foreground">open rate</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {config.label}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
