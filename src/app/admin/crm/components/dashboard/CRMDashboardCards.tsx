"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronRight, MoreHorizontal, Workflow } from "lucide-react";
import type React from "react";
import { type CRMCustomer, CRM_COPY } from "../shared/crm-copy";
import { CRMEngagementScoreBar, CRMLifecycleBadge } from "../shared/CRMSharedWidgets";

export interface NormalizedSegmentItem {
  name: string;
  count: number;
  icon: React.ReactNode;
  colorClass?: string;
  accentHex?: string;
  growth?: number;
}

export interface NormalizedCampaignItem {
  name: string;
  status: "draft" | "scheduled" | "sent" | "active";
  sent: number;
  opened: number;
  clicked: number;
}

export interface NormalizedAutomationItem {
  name: string;
  trigger: string;
  status: "active" | "paused" | "draft";
  enrolled: number;
  completed: number;
  rate: number;
}

export function CustomerListRow({
  customer,
  onAction,
}: {
  customer: CRMCustomer;
  onAction: (action: string, id: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
      <Avatar className="h-10 w-10 ring-2 ring-background">
        <AvatarImage src={customer.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {customer.full_name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{customer.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
      </div>
      <CRMLifecycleBadge stage={customer.lifecycle_stage} />
      <CRMEngagementScoreBar score={customer.engagement_score} />
      <div className="text-end min-w-[80px]">
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            customer.churn_risk_score >= 70
              ? "text-rose-600"
              : customer.churn_risk_score >= 40
                ? "text-amber-600"
                : "text-emerald-600",
          )}
        >
          {`${customer.churn_risk_score}${CRM_COPY.riskSuffix}`}
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={CRM_COPY.viewProfile}
            className="h-8 w-8 opacity-75 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onAction("view", customer.id)}>{CRM_COPY.viewProfile}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction("email", customer.id)}>{CRM_COPY.sendEmail}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction("note", customer.id)}>{CRM_COPY.addNote}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction("tag", customer.id)}>{CRM_COPY.manageTags}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function QuickSegmentCard({ name, count, icon, colorClass, accentHex, growth }: NormalizedSegmentItem) {
  return (
    <div className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn("p-2 rounded-lg", colorClass)}
          style={accentHex ? { backgroundColor: `${accentHex}1A`, color: accentHex } : undefined}
        >
          {icon}
        </div>
        {growth !== undefined && (
          <span className={cn("text-xs font-medium", growth >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {`${growth >= 0 ? "↑" : "↓"} ${Math.abs(growth)}%`}
          </span>
        )}
      </div>
      <p className="font-semibold text-foreground mb-1">{name}</p>
      <p className="text-2xl font-bold text-foreground tabular-nums">{count.toLocaleString()}</p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full justify-between opacity-70 group-hover:opacity-100 transition-opacity"
      >
        {CRM_COPY.viewSegment} <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

export function CampaignSummaryCard({ name, status, sent, opened, clicked }: NormalizedCampaignItem) {
  const statusConfig = {
    draft: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600" },
    scheduled: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600" },
    sent: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600" },
    active: { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-600" },
  };
  const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : "0";
  const clickRate = opened > 0 ? ((clicked / opened) * 100).toFixed(1) : "0";

  return (
    <div className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          <Badge className={cn("mt-1 capitalize", statusConfig[status].bg, statusConfig[status].text)}>{status}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={name}>
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-foreground tabular-nums">{sent.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{CRM_COPY.sentLabel}</p>
        </div>
        <div>
          <p className="text-lg font-bold text-emerald-600 tabular-nums">{`${openRate}%`}</p>
          <p className="text-xs text-muted-foreground">{CRM_COPY.openedLabel}</p>
        </div>
        <div>
          <p className="text-lg font-bold text-blue-600 tabular-nums">{`${clickRate}%`}</p>
          <p className="text-xs text-muted-foreground">{CRM_COPY.clickedLabel}</p>
        </div>
      </div>
    </div>
  );
}

export function AutomationSummaryCard({ name, trigger, status, enrolled, completed, rate }: NormalizedAutomationItem) {
  return (
    <div className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "p-1.5 rounded-lg",
              status === "active"
                ? "bg-emerald-100 text-emerald-600"
                : status === "paused"
                  ? "bg-amber-100 text-amber-600"
                  : "bg-slate-100 text-slate-600",
            )}
          >
            <Workflow className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{trigger}</p>
          </div>
        </div>
        <Badge
          className={cn(
            "capitalize",
            status === "active"
              ? "bg-emerald-100 text-emerald-700"
              : status === "paused"
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-700",
          )}
        >
          {status}
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">{`${enrolled} ${CRM_COPY.enrolledSuffix}`}</span>
        <span className="text-muted-foreground">{`${completed} ${CRM_COPY.completedSuffix}`}</span>
        <span className="text-emerald-600 font-medium">{`${rate}% ${CRM_COPY.conversionSuffix}`}</span>
      </div>
    </div>
  );
}
