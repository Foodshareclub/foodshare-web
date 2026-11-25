"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, Star, UserPlus } from "lucide-react";
import type React from "react";
import { CRM_COPY } from "./crm-copy";

export function CRMMetricCard({
  label,
  value,
  change,
  icon,
  color = "blue",
}: {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: "blue" | "emerald" | "violet" | "amber" | "rose";
}) {
  const colorClasses = {
    blue: "from-blue-500/10 to-blue-500/5 text-blue-600 dark:text-blue-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    violet: "from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-400",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400",
    rose: "from-rose-500/10 to-rose-500/5 text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 hover:shadow-md transition-all">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", colorClasses[color])} />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", colorClasses[color])}>{icon}</div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-foreground tabular-nums">{value}</span>
          {change !== undefined && (
            <span className={cn("text-xs font-medium mb-1", change >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {`${change >= 0 ? "+" : ""}${change}%`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function CRMLifecycleBadge({ stage, compactIcons = false }: { stage: string; compactIcons?: boolean }) {
  const config: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    lead: {
      label: CRM_COPY.stageLead,
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-700 dark:text-slate-300",
      icon: <UserPlus className="h-3 w-3" />,
    },
    active: {
      label: CRM_COPY.stageActive,
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    champion: {
      label: CRM_COPY.stageChampion,
      bg: "bg-violet-100 dark:bg-violet-900/30",
      text: "text-violet-700 dark:text-violet-400",
      icon: <Star className="h-3 w-3" />,
    },
    at_risk: {
      label: CRM_COPY.stageAtRisk,
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-400",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    churned: {
      label: CRM_COPY.stageChurned,
      bg: "bg-rose-100 dark:bg-rose-900/30",
      text: "text-rose-700 dark:text-rose-400",
      icon: <Clock className="h-3 w-3" />,
    },
  };
  const entry = config[stage] || config.lead;

  return (
    <Badge variant="secondary" className={cn("gap-1 font-medium text-xs", entry.bg, entry.text)}>
      {!compactIcons && entry.icon}
      {entry.label}
    </Badge>
  );
}

export function CRMEngagementScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-muted-foreground w-8 tabular-nums">{score}</span>
    </div>
  );
}

export function CRMChurnRiskBadge({ score }: { score: number }) {
  let className = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  let label: string = CRM_COPY.lowLabel;

  if (score >= 70) {
    className = "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
    label = CRM_COPY.highLabel;
  } else if (score >= 40) {
    className = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    label = CRM_COPY.mediumLabel;
  }

  return (
    <Badge variant="secondary" className={cn("text-xs", className)}>
      {`${label} (${score}%)`}
    </Badge>
  );
}
