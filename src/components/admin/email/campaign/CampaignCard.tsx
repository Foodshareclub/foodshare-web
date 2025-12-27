import { Eye, Edit, Copy, Trash2, MoreVertical, Calendar } from "lucide-react";
import { GlassCard } from "../shared/GlassCard";
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

export function CampaignCard({ campaign }: { campaign: RecentCampaign }) {
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

  return (
    <GlassCard className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <Badge variant="outline" className={cn("text-xs", statusColors[campaign.status])}>
          {campaign.status}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2 -mt-1">
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
      </div>

      <h4 className="font-semibold mb-1 line-clamp-1">{campaign.name}</h4>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{campaign.subject}</p>

      {campaign.status === "sent" && (
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
          <div className="text-center">
            <p className="text-lg font-semibold">{campaign.totalSent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{openRate}%</p>
            <p className="text-xs text-muted-foreground">Opened</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{clickRate}%</p>
            <p className="text-xs text-muted-foreground">Clicked</p>
          </div>
        </div>
      )}

      {campaign.status === "scheduled" && campaign.scheduledAt && (
        <div className="flex items-center gap-2 pt-3 border-t border-border/50 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Scheduled for {new Date(campaign.scheduledAt).toLocaleDateString()}</span>
        </div>
      )}
    </GlassCard>
  );
}
