"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ChevronRight, Search, TrendingUp, UserCheck, Users } from "lucide-react";
import { type CRMCustomer, type CRMStats, type CRMTag, CRM_COPY, type ViewType } from "../shared/crm-copy";
import { CRMMetricCard } from "../shared/CRMSharedWidgets";
import {
  AutomationSummaryCard,
  CampaignSummaryCard,
  CustomerListRow,
  type NormalizedAutomationItem,
  type NormalizedCampaignItem,
  type NormalizedSegmentItem,
  QuickSegmentCard,
} from "./CRMDashboardCards";

export function CRMDashboardOverview({
  stats,
  segments,
  campaigns,
  automations,
  customers,
  onNavigate,
  onCustomerAction,
}: {
  stats: CRMStats;
  segments: NormalizedSegmentItem[];
  campaigns: NormalizedCampaignItem[];
  automations: NormalizedAutomationItem[];
  customers: CRMCustomer[];
  onNavigate: (view: ViewType) => void;
  onCustomerAction: (action: string, id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CRMMetricCard
          label={CRM_COPY.totalCustomers}
          value={stats.totalCustomers.toLocaleString()}
          change={8}
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          color="blue"
        />
        <CRMMetricCard
          label={CRM_COPY.activeLabel}
          value={stats.activeCustomers.toLocaleString()}
          change={12}
          icon={<UserCheck className="h-4 w-4" aria-hidden="true" />}
          color="emerald"
        />
        <CRMMetricCard
          label={CRM_COPY.atRiskLabel}
          value={stats.atRiskCustomers.toLocaleString()}
          change={-3}
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          color="amber"
        />
        <CRMMetricCard
          label={CRM_COPY.newThisWeekLabel}
          value={stats.newThisWeek.toLocaleString()}
          change={23}
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          color="violet"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{CRM_COPY.quickSegments}</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate("segments")}>
            {CRM_COPY.viewAll} <ChevronRight className="h-4 w-4 ms-1" aria-hidden="true" />
          </Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {segments.map((seg) => (
            <QuickSegmentCard key={seg.name} {...seg} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">{CRM_COPY.recentCampaigns}</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("campaigns")}>
              {CRM_COPY.viewAll} <ChevronRight className="h-4 w-4 ms-1" aria-hidden="true" />
            </Button>
          </div>
          <div className="space-y-3">
            {campaigns.map((c) => (
              <CampaignSummaryCard key={c.name} {...c} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">{CRM_COPY.activeAutomations}</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("automation")}>
              {CRM_COPY.viewAll} <ChevronRight className="h-4 w-4 ms-1" aria-hidden="true" />
            </Button>
          </div>
          <div className="space-y-3">
            {automations.map((a) => (
              <AutomationSummaryCard key={a.name} {...a} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{CRM_COPY.topCustomers}</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate("customers")}>
            {CRM_COPY.viewAll} <ChevronRight className="h-4 w-4 ms-1" aria-hidden="true" />
          </Button>
        </div>
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          {customers.slice(0, 5).map((customer) => (
            <CustomerListRow key={customer.id} customer={customer} onAction={onCustomerAction} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CRMDashboardCustomers({
  customers,
  filteredCustomers,
  tags,
  searchQuery,
  lifecycleFilter,
  onSearchChange,
  onLifecycleChange,
  onCustomerAction,
}: {
  customers: CRMCustomer[];
  filteredCustomers: CRMCustomer[];
  tags: CRMTag[];
  searchQuery: string;
  lifecycleFilter: string;
  onSearchChange: (q: string) => void;
  onLifecycleChange: (v: string) => void;
  onCustomerAction: (action: string, id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={CRM_COPY.searchPlaceholder}
            aria-label={CRM_COPY.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="ps-9 h-9"
          />
        </div>
        <Select value={lifecycleFilter} onValueChange={onLifecycleChange}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder={CRM_COPY.lifecyclePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{CRM_COPY.allStages}</SelectItem>
            <SelectItem value="lead">{CRM_COPY.stageLead}</SelectItem>
            <SelectItem value="active">{CRM_COPY.stageActive}</SelectItem>
            <SelectItem value="champion">{CRM_COPY.stageChampion}</SelectItem>
            <SelectItem value="at_risk">{CRM_COPY.stageAtRisk}</SelectItem>
            <SelectItem value="churned">{CRM_COPY.stageChurned}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {`${filteredCustomers.length} ${CRM_COPY.ofConnector} ${customers.length} ${CRM_COPY.customersSuffix}`}
        </span>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              style={{ backgroundColor: tag.color }}
              className="text-white cursor-pointer hover:opacity-80"
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" aria-hidden="true" />
            <p className="text-muted-foreground">
              {customers.length === 0 ? CRM_COPY.noCustomersYetImport : CRM_COPY.noCustomersMatch}
            </p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <CustomerListRow key={customer.id} customer={customer} onAction={onCustomerAction} />
          ))
        )}
      </div>
    </div>
  );
}
