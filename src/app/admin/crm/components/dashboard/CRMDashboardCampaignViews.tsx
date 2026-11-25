"use client";

import { Button } from "@/components/ui/button";
import {
  Activity,
  Bell,
  CheckCircle2,
  ChevronRight,
  Heart,
  Mail,
  Megaphone,
  MessageSquare,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { type CRMNewsletterStats, CRM_COPY, RECOMMENDED_AUTOMATIONS, SEGMENT_IDEAS } from "../shared/crm-copy";
import { CRMMetricCard } from "../shared/CRMSharedWidgets";
import {
  AutomationSummaryCard,
  CampaignSummaryCard,
  type NormalizedAutomationItem,
  type NormalizedCampaignItem,
  type NormalizedSegmentItem,
  QuickSegmentCard,
} from "./CRMDashboardCards";

const CAMPAIGN_TEMPLATES = [
  {
    name: "Weekly Newsletter",
    desc: "Community updates and tips",
    icon: <MessageSquare className="h-5 w-5" aria-hidden="true" />,
  },
  {
    name: "New Feature Announcement",
    desc: "Introduce new platform features",
    icon: <Sparkles className="h-5 w-5" aria-hidden="true" />,
  },
  {
    name: "Re-engagement",
    desc: "Win back inactive users",
    icon: <Heart className="h-5 w-5" aria-hidden="true" />,
  },
] as const;

export function CRMSegmentsView({ segments }: { segments: NormalizedSegmentItem[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">{CRM_COPY.segmentsSubtitle}</p>
        <Button size="sm" className="gap-2">
          <Target className="h-4 w-4" aria-hidden="true" /> {CRM_COPY.createSegment}
        </Button>
      </div>

      {segments.length === 0 && (
        <p className="rounded-xl border border-border/50 bg-card p-6 text-sm text-muted-foreground">
          {CRM_COPY.noSegmentsYet}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((seg) => (
          <QuickSegmentCard key={seg.name} {...seg} />
        ))}
        <div className="p-6 rounded-xl border-2 border-dashed border-border/50 bg-muted/20 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[160px]">
          <div className="p-3 rounded-full bg-muted mb-3">
            <Target className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="font-medium text-foreground">{CRM_COPY.createNewSegment}</p>
          <p className="text-xs text-muted-foreground text-center mt-1">{CRM_COPY.createNewSegmentDesc}</p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-5">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" aria-hidden="true" /> {CRM_COPY.suggestedSegments}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SEGMENT_IDEAS.map((idea) => (
            <div
              key={idea.name}
              className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-slate-800/50"
            >
              <div>
                <p className="font-medium text-foreground text-sm">{idea.name}</p>
                <p className="text-xs text-muted-foreground">{idea.desc}</p>
              </div>
              <Button variant="ghost" size="sm">
                {CRM_COPY.createButton}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CRMCampaignsView({
  campaigns,
  newsletterStats,
  onOpenEmail,
}: {
  campaigns: NormalizedCampaignItem[];
  newsletterStats?: CRMNewsletterStats;
  onOpenEmail: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">{CRM_COPY.campaignsSubtitle}</p>
        <Button size="sm" className="gap-2" onClick={onOpenEmail}>
          <Send className="h-4 w-4" aria-hidden="true" /> {CRM_COPY.newCampaignLabel}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CRMMetricCard
          label={CRM_COPY.totalSent30d}
          value={newsletterStats?.totalSent.toLocaleString() || "0"}
          icon={<Send className="h-4 w-4" aria-hidden="true" />}
          color="blue"
        />
        <CRMMetricCard
          label={CRM_COPY.avgOpenRate}
          value={`${newsletterStats?.avgOpenRate || 0}%`}
          icon={<Mail className="h-4 w-4" aria-hidden="true" />}
          color="emerald"
        />
        <CRMMetricCard
          label={CRM_COPY.avgClickRate}
          value={`${newsletterStats?.avgClickRate || 0}%`}
          icon={<Activity className="h-4 w-4" aria-hidden="true" />}
          color="violet"
        />
        <CRMMetricCard
          label={CRM_COPY.subscribersLabel}
          value={newsletterStats?.totalSubscribers.toLocaleString() || "0"}
          icon={<Bell className="h-4 w-4" aria-hidden="true" />}
          color="amber"
        />
      </div>

      {campaigns.length === 0 && (
        <p className="rounded-xl border border-border/50 bg-card p-6 text-sm text-muted-foreground">
          {CRM_COPY.noCampaignsYet}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((c) => (
          <CampaignSummaryCard key={c.name} {...c} />
        ))}
        <button
          type="button"
          onClick={onOpenEmail}
          className="p-6 rounded-xl border-2 border-dashed border-border/50 bg-muted/20 flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer min-h-[180px] w-full"
        >
          <div className="p-3 rounded-full bg-muted mb-3">
            <Megaphone className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="font-medium text-foreground">{CRM_COPY.createCampaign}</p>
          <p className="text-xs text-muted-foreground text-center mt-1">{CRM_COPY.createCampaignDesc}</p>
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-foreground mb-3">{CRM_COPY.quickTemplatesTitle}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CAMPAIGN_TEMPLATES.map((template) => (
            <div
              key={template.name}
              className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary">{template.icon}</div>
              <div className="flex-1">
                <p className="font-medium text-foreground text-sm">{template.name}</p>
                <p className="text-xs text-muted-foreground">{template.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CRMAutomationView({
  automations,
  newsletterStats,
}: {
  automations: NormalizedAutomationItem[];
  newsletterStats?: CRMNewsletterStats;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">{CRM_COPY.automationSubtitle}</p>
        <Button size="sm" className="gap-2">
          <Zap className="h-4 w-4" aria-hidden="true" /> {CRM_COPY.createAutomation}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CRMMetricCard
          label={CRM_COPY.activeFlows}
          value={newsletterStats?.activeAutomations || automations.filter((a) => a.status === "active").length}
          icon={<Workflow className="h-4 w-4" aria-hidden="true" />}
          color="emerald"
        />
        <CRMMetricCard
          label={CRM_COPY.totalEnrolled}
          value={automations.reduce((sum, a) => sum + a.enrolled, 0).toLocaleString()}
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          color="blue"
        />
        <CRMMetricCard
          label={CRM_COPY.completedSuffix}
          value={automations.reduce((sum, a) => sum + a.completed, 0).toLocaleString()}
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          color="violet"
        />
        <CRMMetricCard
          label={CRM_COPY.avgConversion}
          value={`${automations.length > 0 ? Math.round(automations.reduce((sum, a) => sum + a.rate, 0) / automations.length) : 0}%`}
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          color="amber"
        />
      </div>

      <div className="space-y-3">
        {automations.length === 0 ? (
          <p className="rounded-xl border border-border/50 bg-card p-6 text-sm text-muted-foreground">
            {CRM_COPY.noAutomationsYet}
          </p>
        ) : (
          automations.map((a) => <AutomationSummaryCard key={a.name} {...a} />)
        )}
      </div>

      <div className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 p-5">
        <h3 className="font-semibold text-violet-800 dark:text-violet-200 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" aria-hidden="true" /> {CRM_COPY.recommendedAutomations}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RECOMMENDED_AUTOMATIONS.map((idea) => (
            <div key={idea.name} className="p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-foreground text-sm">{idea.name}</p>
                <Button variant="ghost" size="sm">
                  {CRM_COPY.setupButton}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{idea.trigger}</p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">{idea.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
