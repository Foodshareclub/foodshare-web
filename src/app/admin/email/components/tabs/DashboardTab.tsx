"use client";

import {
  Users,
  Send,
  Eye,
  MousePointerClick,
  Mail,
  Zap,
  Activity,
  ChevronRight,
} from "lucide-react";
import { GlassCard } from "../shared/GlassCard";
import { MetricCard } from "../shared/MetricCard";
import { ProviderCard } from "../shared/ProviderComponents";
import { EmptyState } from "../shared/EmptyState";
import { CampaignRow } from "../campaign/CampaignRow";
import { AutomationRow } from "../automation/AutomationRow";
import type {
  EmailDashboardStats,
  RecentCampaign,
  ActiveAutomation,
  ProviderHealth,
} from "../types";
import { Button } from "@/components/ui/button";

export function DashboardTab({
  stats,
  campaigns,
  automations,
  providerHealth,
}: {
  stats: EmailDashboardStats;
  campaigns: RecentCampaign[];
  automations: ActiveAutomation[];
  providerHealth: ProviderHealth[];
}) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Subscribers"
          value={stats.totalSubscribers.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          trend={stats.activeSubscribers > 0 ? "up" : undefined}
          trendValue={`${stats.activeSubscribers.toLocaleString()} active`}
          color="blue"
        />
        <MetricCard
          label="Emails Sent (30d)"
          value={stats.emailsSent30d.toLocaleString()}
          icon={<Send className="h-5 w-5" />}
          color="emerald"
        />
        <MetricCard
          label="Open Rate"
          value={`${stats.avgOpenRate}%`}
          icon={<Eye className="h-5 w-5" />}
          trend={stats.avgOpenRate > 20 ? "up" : "down"}
          trendValue="vs industry avg"
          color="violet"
        />
        <MetricCard
          label="Click Rate"
          value={`${stats.avgClickRate}%`}
          icon={<MousePointerClick className="h-5 w-5" />}
          trend={stats.avgClickRate > 2 ? "up" : "down"}
          trendValue="vs industry avg"
          color="amber"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Recent Campaigns
            </h3>
            <Button variant="ghost" size="sm" className="text-xs">
              View All <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {campaigns.slice(0, 5).map((campaign) => (
              <CampaignRow key={campaign.id} campaign={campaign} compact />
            ))}
            {campaigns.length === 0 && <EmptyState icon={<Mail />} message="No campaigns yet" />}
          </div>
        </GlassCard>

        {/* Active Automations */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Active Automations
            </h3>
            <Button variant="ghost" size="sm" className="text-xs">
              View All <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {automations.slice(0, 5).map((automation) => (
              <AutomationRow key={automation.id} automation={automation} compact />
            ))}
            {automations.length === 0 && <EmptyState icon={<Zap />} message="No automations yet" />}
          </div>
        </GlassCard>
      </div>

      {/* Provider Performance */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Provider Performance
          </h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {providerHealth.map((provider) => (
            <ProviderCard key={provider.provider} provider={provider} />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
