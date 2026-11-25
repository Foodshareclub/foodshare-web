"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CRMCustomerTag, CRMCustomerWithProfile, CRMDashboardStats } from "@/types/crm.types";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Clock,
  Heart,
  Target,
  Tag,
  Users,
} from "lucide-react";
import type React from "react";
import { CRMLifecycleBadge } from "../shared/CRMSharedWidgets";
import { CRM_CLIENT_COPY } from "./copy";

function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  color,
  negative = false,
}: {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "violet" | "amber";
  negative?: boolean;
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{value}</p>
          <div className="flex items-center gap-1 mt-1">
            {negative ? (
              <ArrowDownRight className="h-3 w-3 text-amber-500" aria-hidden="true" />
            ) : (
              <ArrowUpRight className="h-3 w-3 text-emerald-500" aria-hidden="true" />
            )}
            <span className={cn("text-xs", negative ? "text-amber-500" : "text-emerald-500")}>
              {`${change} ${changeLabel}`}
            </span>
          </div>
        </div>
        <div className={cn("p-2.5 rounded-lg", colorClasses[color])}>{icon}</div>
      </div>
    </div>
  );
}

function LifecycleBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: "slate" | "blue" | "emerald" | "amber" | "rose";
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colorClasses = {
    slate: "bg-slate-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-24">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-foreground w-12 text-end tabular-nums">{count}</span>
    </div>
  );
}

function TypeRow({ label, count, icon }: { label: string; count: number; icon: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground tabular-nums">{count.toLocaleString()}</span>
    </div>
  );
}

function CompactCustomerRow({ customer }: { customer: CRMCustomerWithProfile }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
      <Avatar className="h-8 w-8">
        <AvatarImage src={customer.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {customer.full_name?.slice(0, 2).toUpperCase() || CRM_CLIENT_COPY.unknownInitials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {customer.full_name || CRM_CLIENT_COPY.unknownUser}
        </p>
        <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
      </div>
      <CRMLifecycleBadge stage={customer.lifecycle_stage || "lead"} compactIcons />
    </div>
  );
}

export function CRMClientOverviewTab({
  stats,
  customers,
  tags,
  onViewAllCustomers,
}: {
  stats: CRMDashboardStats;
  customers: CRMCustomerWithProfile[];
  tags: CRMCustomerTag[];
  onViewAllCustomers: () => void;
}) {
  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={CRM_CLIENT_COPY.totalCustomers}
          value={stats.totalCustomers.toLocaleString()}
          change={stats.newCustomersThisWeek}
          changeLabel={CRM_CLIENT_COPY.thisWeek}
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          color="blue"
        />
        <StatCard
          label={CRM_CLIENT_COPY.activeUsers}
          value={stats.activeCustomers.toLocaleString()}
          change={Math.round((stats.activeCustomers / Math.max(stats.totalCustomers, 1)) * 100)}
          changeLabel={CRM_CLIENT_COPY.ofTotal}
          icon={<Activity className="h-4 w-4" aria-hidden="true" />}
          color="emerald"
        />
        <StatCard
          label={CRM_CLIENT_COPY.champions}
          value={stats.championCount.toLocaleString()}
          change={stats.championCount}
          changeLabel={CRM_CLIENT_COPY.topUsers}
          icon={<Award className="h-4 w-4" aria-hidden="true" />}
          color="violet"
        />
        <StatCard
          label={CRM_CLIENT_COPY.atRisk}
          value={stats.atRiskCount.toLocaleString()}
          change={stats.atRiskCount}
          changeLabel={CRM_CLIENT_COPY.needAttention}
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          color="amber"
          negative
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/50 p-4">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-primary" aria-hidden="true" />
            {CRM_CLIENT_COPY.customerLifecycle}
          </h3>
          <div className="space-y-3">
            <LifecycleBar
              label={CRM_CLIENT_COPY.leadsLabel}
              count={stats.leadCount}
              total={stats.totalCustomers}
              color="slate"
            />
            <LifecycleBar
              label={CRM_CLIENT_COPY.activeLabel}
              count={stats.activeCount}
              total={stats.totalCustomers}
              color="blue"
            />
            <LifecycleBar
              label={CRM_CLIENT_COPY.championsLabel}
              count={stats.championCount}
              total={stats.totalCustomers}
              color="emerald"
            />
            <LifecycleBar
              label={CRM_CLIENT_COPY.atRiskLabel}
              count={stats.atRiskCount}
              total={stats.totalCustomers}
              color="amber"
            />
            <LifecycleBar
              label={CRM_CLIENT_COPY.churnedLabel}
              count={stats.churnedCount}
              total={stats.totalCustomers}
              color="rose"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
              {CRM_CLIENT_COPY.customerTypes}
            </h3>
            <div className="space-y-2">
              <TypeRow label={CRM_CLIENT_COPY.donorsLabel} count={stats.donorCount} icon={CRM_CLIENT_COPY.donorEmoji} />
              <TypeRow
                label={CRM_CLIENT_COPY.receiversLabel}
                count={stats.receiverCount}
                icon={CRM_CLIENT_COPY.receiverEmoji}
              />
              <TypeRow label={CRM_CLIENT_COPY.bothLabel} count={stats.bothCount} icon={CRM_CLIENT_COPY.bothEmoji} />
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-primary" aria-hidden="true" />
              {CRM_CLIENT_COPY.popularTags}
            </h3>
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 6).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-xs"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  {tag.name}
                </Badge>
              ))}
              {tags.length === 0 && <p className="text-xs text-muted-foreground">{CRM_CLIENT_COPY.noTagsDefined}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
            {CRM_CLIENT_COPY.recentCustomers}
          </h3>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onViewAllCustomers}>
            {CRM_CLIENT_COPY.viewAll}
          </Button>
        </div>
        <div className="space-y-2">
          {customers.slice(0, 5).map((customer) => (
            <CompactCustomerRow key={customer.id} customer={customer} />
          ))}
          {customers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">{CRM_CLIENT_COPY.noCustomersYet}</p>
          )}
        </div>
      </div>
    </div>
  );
}
