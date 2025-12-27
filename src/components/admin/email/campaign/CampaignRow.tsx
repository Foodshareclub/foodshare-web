import { Eye, Edit, Copy, Trash2, MoreVertical } from "lucide-react";
import type { RecentCampaign } from "../types";
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

export function CampaignRow({
  campaign,
  compact,
}: {
  campaign: RecentCampaign;
  compact?: boolean;
}) {
  const statusColors = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    sending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    paused: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  };

  const openRate =
    campaign.totalSent > 0 ? Math.round((campaign.totalOpened / campaign.totalSent) * 100) : 0;
  const clickRate =
    campaign.totalOpened > 0 ? Math.round((campaign.totalClicked / campaign.totalOpened) * 100) : 0;

  if (compact) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{campaign.name}</p>
          <p className="text-xs text-muted-foreground truncate">{campaign.subject}</p>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <Badge variant="outline" className={cn("text-xs", statusColors[campaign.status])}>
            {campaign.status}
          </Badge>
          {campaign.status === "sent" && (
            <span className="text-xs text-muted-foreground">{openRate}% open</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <tr className="hover:bg-muted/50">
      <td className="p-4">
        <div>
          <p className="font-medium">{campaign.name}</p>
          <p className="text-sm text-muted-foreground truncate max-w-[200px]">{campaign.subject}</p>
        </div>
      </td>
      <td className="p-4">
        <Badge variant="outline" className={cn("text-xs", statusColors[campaign.status])}>
          {campaign.status}
        </Badge>
      </td>
      <td className="p-4 text-sm">{campaign.totalRecipients.toLocaleString()}</td>
      <td className="p-4 text-sm">{openRate}%</td>
      <td className="p-4 text-sm">{clickRate}%</td>
      <td className="p-4 text-sm text-muted-foreground">
        {campaign.sentAt
          ? new Date(campaign.sentAt).toLocaleDateString()
          : campaign.scheduledAt
            ? `Scheduled: ${new Date(campaign.scheduledAt).toLocaleDateString()}`
            : "Draft"}
      </td>
      <td className="p-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" /> View
            </DropdownMenuItem>
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
      </td>
    </tr>
  );
}
