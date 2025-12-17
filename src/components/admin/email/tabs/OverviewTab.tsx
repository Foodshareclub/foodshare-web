"use client";

/**
 * OverviewTab - Dashboard overview with metrics and recent activity
 */

import {
  Send,
  Users,
  Eye,
  MousePointerClick,
  Megaphone,
  Zap,
  Activity,
  ChevronRight,
} from "lucide-react";

import { MetricCard, EmptyState } from "../components";
import { DEFAULT_PROVIDER_HEALTH } from "../constants";
import type { OverviewTabProps } from "../types";

// Import card components (to be extracted next)
import { CampaignListItem } from "../cards/CampaignListItem";
import { AutomationListItem } from "../cards/AutomationListItem";
import { ProviderPerformanceCard } from "../cards/ProviderPerformanceCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function OverviewTab({ stats, campaigns, automations, providerHealth }: OverviewTabProps) {
  return (
    <div className="space-y-5">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Subscribers"
          value={stats.totalSubscribers.toLocaleString()}
          subValue={`${stats.activeSubscribers.toLocaleString()} active`}
          icon={<Users className="h-5 w-5" />}
          trend="up"
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
          subValue="vs 21% industry avg"
          icon={<Eye className="h-5 w-5" />}
          trend={stats.avgOpenRate > 21 ? "up" : "down"}
          color="violet"
        />
        <MetricCard
          label="Click Rate"
          value={`${stats.avgClickRate}%`}
          subValue="vs 2.5% industry avg"
          icon={<MousePointerClick className="h-5 w-5" />}
          trend={stats.avgClickRate > 2.5 ? "up" : "down"}
          color="amber"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Recent Campaigns - Takes 3 columns */}
        <Card className="lg:col-span-3 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                Recent Campaigns
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7">
                View All <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {campaigns.slice(0, 4).map((campaign) => (
                <CampaignListItem key={campaign.id} campaign={campaign} />
              ))}
              {campaigns.length === 0 && (
                <EmptyState
                  icon={<Megaphone className="h-8 w-8" />}
                  title="No campaigns yet"
                  description="Create your first email campaign"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Automations - Takes 2 columns */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Active Automations
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7">
                View All <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {automations.slice(0, 4).map((automation) => (
                <AutomationListItem key={automation.id} automation={automation} />
              ))}
              {automations.length === 0 && (
                <EmptyState
                  icon={<Zap className="h-8 w-8" />}
                  title="No automations"
                  description="Set up automated email flows"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Performance */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Provider Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(providerHealth.length > 0 ? providerHealth : DEFAULT_PROVIDER_HEALTH).map(
              (provider) => (
                <ProviderPerformanceCard key={provider.provider} provider={provider} />
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
