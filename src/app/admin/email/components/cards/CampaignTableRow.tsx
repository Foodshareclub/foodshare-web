"use client";

/**
 * CampaignTableRow - Full table row for campaigns list view
 */

import { MoreVertical, Eye, Edit, Copy, Send, Trash2 } from "lucide-react";
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
  draft: {
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    label: "Draft",
  },
  scheduled: {
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    label: "Scheduled",
  },
  sending: {
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    label: "Sending",
  },
  sent: {
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    label: "Sent",
  },
  paused: {
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    label: "Paused",
  },
  cancelled: {
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    label: "Cancelled",
  },
};

interface CampaignTableRowProps {
  campaign: RecentCampaign;
}

export function CampaignTableRow({ campaign }: CampaignTableRowProps) {
  const config = statusConfig[campaign.status];
  const openRate =
    campaign.totalSent > 0 ? Math.round((campaign.totalOpened / campaign.totalSent) * 100) : 0;
  const clickRate =
    campaign.totalOpened > 0 ? Math.round((campaign.totalClicked / campaign.totalOpened) * 100) : 0;

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="p-3">
        <div>
          <p className="font-medium text-sm">{campaign.name}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{campaign.subject}</p>
        </div>
      </td>
      <td className="p-3">
        <Badge className={cn("text-xs font-medium", config.color)}>{config.label}</Badge>
      </td>
      <td className="p-3 text-sm tabular-nums">{campaign.totalRecipients.toLocaleString()}</td>
      <td className="p-3 text-sm tabular-nums">{openRate}%</td>
      <td className="p-3 text-sm tabular-nums">{clickRate}%</td>
      <td className="p-3 text-sm text-muted-foreground">
        {campaign.sentAt
          ? new Date(campaign.sentAt).toLocaleDateString()
          : campaign.scheduledAt
            ? new Date(campaign.scheduledAt).toLocaleDateString()
            : "—"}
      </td>
      <td className="p-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            {campaign.status === "draft" && (
              <DropdownMenuItem>
                <Send className="h-4 w-4 mr-2" />
                Send Now
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
