"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CRMCustomerTag, CRMCustomerWithProfile, CRMDashboardStats } from "@/types/crm.types";
import {
  Activity,
  AlertTriangle,
  Award,
  Clock,
  Heart,
  MessageSquare,
  Tag,
  Target,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import type React from "react";
import { ENGAGEMENT_BUCKETS } from "../shared/crm-copy";
import { CRM_CLIENT_COPY } from "./copy";

function SegmentCard({
  name,
  description,
  count,
  color,
  icon,
}: {
  name: string;
  description: string;
  count: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${color}15`, color }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          <p className="text-lg font-bold text-foreground mt-2 tabular-nums">{count.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function EngagementMetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "violet" | "amber";
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4 flex items-center gap-3">
      <div className={cn("p-2.5 rounded-lg", colorClasses[color])}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function CRMClientSegmentsTab({ stats, tags }: { stats: CRMDashboardStats; tags: CRMCustomerTag[] }) {
  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{CRM_CLIENT_COPY.audienceSegments}</h2>
          <p className="text-sm text-muted-foreground">{CRM_CLIENT_COPY.audienceSubtitle}</p>
        </div>
        <Button className="gap-2 h-9">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {CRM_CLIENT_COPY.createSegment}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SegmentCard
          name="New Users (7 days)"
          description="Users who joined in the last week"
          count={stats.newCustomersThisWeek}
          color="#3b82f6"
          icon={<UserPlus className="h-5 w-5" aria-hidden="true" />}
        />
        <SegmentCard
          name="Active Champions"
          description="Highly engaged power users"
          count={stats.championCount}
          color="#10b981"
          icon={<Award className="h-5 w-5" aria-hidden="true" />}
        />
        <SegmentCard
          name="At Risk Users"
          description="Users showing churn signals"
          count={stats.atRiskCount}
          color="#f59e0b"
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
        />
        <SegmentCard
          name="Food Donors"
          description="Users who share food"
          count={stats.donorCount}
          color="#8b5cf6"
          icon={<Heart className="h-5 w-5" aria-hidden="true" />}
        />
        <SegmentCard
          name="Food Receivers"
          description="Users who receive food"
          count={stats.receiverCount}
          color="#ec4899"
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
        />
        <SegmentCard
          name="Inactive (30+ days)"
          description="Users with no recent activity"
          count={stats.churnedCount}
          color="#6b7280"
          icon={<Clock className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            <Tag className="h-4 w-4 text-primary" aria-hidden="true" />
            {CRM_CLIENT_COPY.customTags}
          </h3>
          <Button variant="outline" size="sm" className="h-8">
            {CRM_CLIENT_COPY.addTag}
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{tag.name}</p>
                {tag.description && <p className="text-xs text-muted-foreground truncate">{tag.description}</p>}
              </div>
            </div>
          ))}
          {tags.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-6">
              {CRM_CLIENT_COPY.noCustomTags}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function CRMClientEngagementTab({
  stats,
  customers,
}: {
  stats: CRMDashboardStats;
  customers: CRMCustomerWithProfile[];
}) {
  return (
    <div className="p-5 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{CRM_CLIENT_COPY.engagementAnalytics}</h2>
        <p className="text-sm text-muted-foreground">{CRM_CLIENT_COPY.engagementSubtitle}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <EngagementMetricCard
          label={CRM_CLIENT_COPY.avgEngagement}
          value={`${stats.averageEngagementScore}%`}
          icon={<Activity className="h-4 w-4" aria-hidden="true" />}
          color="blue"
        />
        <EngagementMetricCard
          label={CRM_CLIENT_COPY.avgChurnRisk}
          value={`${stats.averageChurnRisk}%`}
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          color="amber"
        />
        <EngagementMetricCard
          label={CRM_CLIENT_COPY.totalInteractions}
          value={stats.totalInteractions.toLocaleString()}
          icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
          color="emerald"
        />
        <EngagementMetricCard
          label={CRM_CLIENT_COPY.avgLtvScore}
          value={stats.averageLTVScore.toLocaleString()}
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          color="violet"
        />
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm">
          <Award className="h-4 w-4 text-primary" aria-hidden="true" />
          {CRM_CLIENT_COPY.topChampions}
        </h3>
        <div className="space-y-2">
          {stats.topChampions.map((champion, index) => (
            <div key={champion.customer_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <span className="text-lg font-bold text-muted-foreground w-6">{`#${index + 1}`}</span>
              <div className="flex-1">
                <p className="font-medium text-foreground">{champion.full_name}</p>
                <p className="text-xs text-muted-foreground">{`${CRM_CLIENT_COPY.ltvScorePrefix}${champion.ltv_score}`}</p>
              </div>
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                {CRM_CLIENT_COPY.championBadge}
              </Badge>
            </div>
          ))}
          {stats.topChampions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">{CRM_CLIENT_COPY.noChampionsYet}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm">
          <Target className="h-4 w-4 text-primary" aria-hidden="true" />
          {CRM_CLIENT_COPY.engagementDistribution}
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {ENGAGEMENT_BUCKETS.map((bucket, i) => {
            const count = customers.filter((c) => {
              const score = c.engagement_score || 50;
              return score >= i * 20 && score < (i + 1) * 20;
            }).length;
            return (
              <div key={bucket.range} className="text-center">
                <div
                  className={cn("h-20 rounded-lg mb-2", bucket.color)}
                  style={{ opacity: 0.2 + (count / Math.max(customers.length, 1)) * 0.8 }}
                />
                <p className="text-xs font-medium text-foreground tabular-nums">{count}</p>
                <p className="text-[10px] text-muted-foreground">{bucket.range}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
