"use client";

/**
 * CampaignCard - Grid card view for campaigns
 */

import { MoreVertical, Eye, Edit, Copy } from "lucide-react";
import type { RecentCampaign } from "../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  draft: { color: "border-slate-500/30 bg-slate-500/5", dot: "bg-slate-500", label: "Draft" },
  scheduled: { color: "border-blue-500/30 bg-blue-500/5", dot: "bg-blue-500", label: "Scheduled" },
  sending: {
    color: "border-amber-500/30 bg-amber-500/5",
    dot: "bg-amber-500 animate-pulse",
    label: "Sending",
  },
  sent: { color: "border-emerald-500/30 bg-emerald-500/5", dot: "bg-emerald-500", label: "Sent" },
  paused: { color: "border-orange-500/30 bg-orange-500/5", dot: "bg-orange-500", label: "Paused" },
  cancelled: { color: "border-rose-500/30 bg-rose-500/5", dot: "bg-rose-500", label: "Cancelled" },
};

interface CampaignCardProps {
  campaign: RecentCampaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const config = statusConfig[campaign.status];
  const openRate =
    campaign.totalSent > 0 ? Math.round((campaign.totalOpened / campaign.totalSent) * 100) : 0;

  return (
    <Card
      className={cn(
        "bg-card/50 backdrop-blur-sm border hover:shadow-md transition-all",
        config.color
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h4 className="font-semibold text-sm mb-1 line-clamp-1">{campaign.name}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{campaign.subject}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold tabular-nums">
              {campaign.totalRecipients.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Recipients</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{openRate}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">Open Rate</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">
              {campaign.totalClicked.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Clicks</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
