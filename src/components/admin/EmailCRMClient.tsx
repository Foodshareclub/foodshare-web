"use client";

/**
 * EmailCRMClient - Advanced Email CRM Management Interface
 * Features: Dashboard, Campaigns, Automation, Audience, Compose, Providers
 * Modern glass UI with fixed viewport layout (no horizontal scroll)
 */

import React, { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Mail,
  Users,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Zap,
  Settings,
  Plus,
  Search,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Edit,
  Eye,
  Copy,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  MousePointerClick,
  UserPlus,
  UserMinus,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  List,
  Calendar,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { sendAdminEmail, sendTestEmailDirect } from "@/app/actions/email";
import type { EmailType } from "@/lib/email/types";
import type {
  EmailCRMData,
  EmailDashboardStats,
  ProviderHealth,
  RecentCampaign,
  ActiveAutomation,
  AudienceSegment,
} from "@/lib/data/admin-email";

// ============================================================================
// Types
// ============================================================================

type TabType = "dashboard" | "campaigns" | "automation" | "audience" | "compose" | "providers";

interface EmailFormData {
  to: string;
  subject: string;
  message: string;
  emailType: string;
  provider: string;
  useHtml: boolean;
}

interface Props {
  initialData?: EmailCRMData;
}

// ============================================================================
// Constants
// ============================================================================

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "campaigns", label: "Campaigns", icon: <Mail className="h-4 w-4" /> },
  { id: "automation", label: "Automation", icon: <Zap className="h-4 w-4" /> },
  { id: "audience", label: "Audience", icon: <Users className="h-4 w-4" /> },
  { id: "compose", label: "Compose", icon: <Send className="h-4 w-4" /> },
  { id: "providers", label: "Providers", icon: <Settings className="h-4 w-4" /> },
];

const EMAIL_TYPES = [
  { value: "newsletter", label: "Newsletter" },
  { value: "announcement", label: "Announcement" },
  { value: "chat", label: "Chat Notification" },
  { value: "food_listing", label: "Food Listing" },
  { value: "feedback", label: "Feedback Request" },
  { value: "review_reminder", label: "Review Reminder" },
  { value: "auth", label: "Authentication" },
];

const PROVIDERS = [
  { value: "auto", label: "Smart Routing", description: "Auto-select best provider" },
  { value: "brevo", label: "Brevo", description: "Primary (300/day)" },
  { value: "resend", label: "Resend", description: "Auth emails (100/day)" },
  { value: "aws_ses", label: "AWS SES", description: "Failover (100/day)" },
];

// ============================================================================
// Main Component
// ============================================================================

export function EmailCRMClient({ initialData }: Props) {
  const _t = useTranslations();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [_isPending, _startTransition] = useTransition();

  // Data state (use initial data or defaults)
  const stats = initialData?.stats || getDefaultStats();
  const providerHealth = initialData?.providerHealth || [];
  const campaigns = initialData?.campaigns || [];
  const automations = initialData?.automations || [];
  const segments = initialData?.segments || [];

  // Quota calculation
  const quotaPercent =
    stats.dailyQuotaLimit > 0
      ? Math.round((stats.dailyQuotaUsed / stats.dailyQuotaLimit) * 100)
      : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden">
      {/* Header with Provider Health & Quota */}
      <div className="flex-shrink-0 border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 p-4">
          {/* Provider Health Indicators */}
          <div className="flex items-center gap-3">
            {providerHealth.map((provider) => (
              <ProviderHealthBadge key={provider.provider} provider={provider} />
            ))}
          </div>

          {/* Daily Quota */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Daily Quota</p>
              <p className="text-sm font-semibold">
                {stats.dailyQuotaUsed.toLocaleString()} / {stats.dailyQuotaLimit.toLocaleString()}
              </p>
            </div>
            <div className="w-24">
              <Progress
                value={quotaPercent}
                className={cn(
                  "h-2",
                  quotaPercent > 90
                    ? "[&>div]:bg-rose-500"
                    : quotaPercent > 70
                      ? "[&>div]:bg-amber-500"
                      : "[&>div]:bg-emerald-500"
                )}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setActiveTab("compose")}>
                  <Send className="h-4 w-4 mr-2" />
                  New Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("campaigns")}>
                  <Mail className="h-4 w-4 mr-2" />
                  New Campaign
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("automation")}>
                  <Zap className="h-4 w-4 mr-2" />
                  New Automation
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab("audience")}>
                  <Users className="h-4 w-4 mr-2" />
                  New Segment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pb-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
            <TabsList className="bg-transparent border-b-0 p-0 h-auto gap-1">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "gap-2 px-4 py-2.5 rounded-t-lg rounded-b-none border-b-2 border-transparent",
                    "data-[state=active]:bg-background data-[state=active]:border-primary",
                    "data-[state=active]:shadow-none"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <TabContent key="dashboard">
                <DashboardTab
                  stats={stats}
                  campaigns={campaigns}
                  automations={automations}
                  providerHealth={providerHealth}
                />
              </TabContent>
            )}
            {activeTab === "campaigns" && (
              <TabContent key="campaigns">
                <CampaignsTab campaigns={campaigns} />
              </TabContent>
            )}
            {activeTab === "automation" && (
              <TabContent key="automation">
                <AutomationTab automations={automations} />
              </TabContent>
            )}
            {activeTab === "audience" && (
              <TabContent key="audience">
                <AudienceTab segments={segments} stats={stats} />
              </TabContent>
            )}
            {activeTab === "compose" && (
              <TabContent key="compose">
                <ComposeTab />
              </TabContent>
            )}
            {activeTab === "providers" && (
              <TabContent key="providers">
                <ProvidersTab providerHealth={providerHealth} />
              </TabContent>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Tab Content Wrapper
// ============================================================================

function TabContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Dashboard Tab
// ============================================================================

function DashboardTab({
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

// ============================================================================
// Campaigns Tab
// ============================================================================

function CampaignsTab({ campaigns }: { campaigns: RecentCampaign[] }) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="sending">Sending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Campaign List/Grid */}
      {viewMode === "list" ? (
        <GlassCard className="p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Campaign
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Recipients
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Open Rate
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Click Rate
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCampaigns.map((campaign) => (
                <CampaignRow key={campaign.id} campaign={campaign} />
              ))}
            </tbody>
          </table>
          {filteredCampaigns.length === 0 && (
            <div className="p-12">
              <EmptyState icon={<Mail />} message="No campaigns found" />
            </div>
          )}
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
          {filteredCampaigns.length === 0 && (
            <div className="col-span-full">
              <GlassCard className="p-12">
                <EmptyState icon={<Mail />} message="No campaigns found" />
              </GlassCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Automation Tab
// ============================================================================

function AutomationTab({ automations }: { automations: ActiveAutomation[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAutomations = automations.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search automations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Automation
        </Button>
      </div>

      {/* Automation Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAutomations.map((automation) => (
          <AutomationCard key={automation.id} automation={automation} />
        ))}
        {filteredAutomations.length === 0 && (
          <div className="col-span-full">
            <GlassCard className="p-12">
              <EmptyState
                icon={<Zap />}
                message="No automations yet"
                action={
                  <Button className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Automation
                  </Button>
                }
              />
            </GlassCard>
          </div>
        )}
      </div>

      {/* Automation Templates */}
      <GlassCard>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Quick Start Templates
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <AutomationTemplate
            name="Welcome Series"
            description="Onboard new subscribers with a 3-email sequence"
            trigger="On signup"
          />
          <AutomationTemplate
            name="Re-engagement"
            description="Win back inactive users after 30 days"
            trigger="Inactivity"
          />
          <AutomationTemplate
            name="Food Alert"
            description="Notify users when food is available nearby"
            trigger="New listing"
          />
        </div>
      </GlassCard>
    </div>
  );
}

// ============================================================================
// Audience Tab
// ============================================================================

function AudienceTab({
  segments,
  stats,
}: {
  segments: AudienceSegment[];
  stats: EmailDashboardStats;
}) {
  return (
    <div className="space-y-6">
      {/* Audience Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Subscribers"
          value={stats.totalSubscribers.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          label="Active"
          value={stats.activeSubscribers.toLocaleString()}
          icon={<UserPlus className="h-5 w-5" />}
          color="emerald"
        />
        <MetricCard
          label="Unsubscribed (30d)"
          value={Math.round(
            (stats.totalSubscribers * stats.unsubscribeRate) / 100
          ).toLocaleString()}
          icon={<UserMinus className="h-5 w-5" />}
          color="rose"
        />
        <MetricCard
          label="Growth Rate"
          value={`+${Math.max(0, 100 - stats.unsubscribeRate).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="violet"
        />
      </div>

      {/* Segments */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Audience Segments
          </h3>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Segment
          </Button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((segment) => (
            <SegmentCard key={segment.id} segment={segment} />
          ))}
          {segments.length === 0 && (
            <div className="col-span-full py-8">
              <EmptyState
                icon={<Target />}
                message="No segments created yet"
                action={
                  <Button className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Create Segment
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </GlassCard>

      {/* Default Segments */}
      <GlassCard>
        <h3 className="font-semibold mb-4">System Segments</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <SystemSegmentCard name="All Subscribers" count={stats.totalSubscribers} color="blue" />
          <SystemSegmentCard name="Active Users" count={stats.activeSubscribers} color="emerald" />
          <SystemSegmentCard
            name="New (7 days)"
            count={Math.round(stats.totalSubscribers * 0.05)}
            color="violet"
          />
          <SystemSegmentCard
            name="Engaged"
            count={Math.round((stats.totalSubscribers * stats.avgOpenRate) / 100)}
            color="amber"
          />
        </div>
      </GlassCard>
    </div>
  );
}

// ============================================================================
// Compose Tab
// ============================================================================

function ComposeTab() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState<EmailFormData>({
    to: "",
    subject: "",
    message: "",
    emailType: "newsletter",
    provider: "auto",
    useHtml: false,
  });

  const handleChange = (field: keyof EmailFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    startTransition(async () => {
      const response = await sendAdminEmail({
        to: formData.to,
        subject: formData.subject,
        message: formData.message,
        useHtml: formData.useHtml,
        emailType: formData.emailType as EmailType,
      });

      if (response.success) {
        setResult({
          success: true,
          message: `Email sent! ID: ${response.data?.messageId}`,
        });
        setFormData({
          to: "",
          subject: "",
          message: "",
          emailType: "newsletter",
          provider: "auto",
          useHtml: false,
        });
      } else {
        setResult({ success: false, message: response.error.message });
      }
    });
  };

  const handleTestSend = async () => {
    if (!formData.to || !formData.subject || !formData.message) {
      setResult({ success: false, message: "Please fill in all required fields" });
      return;
    }
    setResult(null);
    startTransition(async () => {
      const response = await sendTestEmailDirect(formData.to, formData.subject, formData.message);
      if (response.success) {
        setResult({
          success: true,
          message: `Test email sent! ID: ${response.data.messageId}`,
        });
      } else {
        setResult({ success: false, message: `Test failed: ${response.error.message}` });
      }
    });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Email Form */}
      <div className="lg:col-span-2">
        <GlassCard>
          <h3 className="font-semibold mb-6 flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Compose Email
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Recipient */}
            <div className="space-y-2">
              <Label htmlFor="to">Recipient Email</Label>
              <Input
                id="to"
                type="email"
                value={formData.to}
                onChange={(e) => handleChange("to", e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                placeholder="Your email subject..."
                required
              />
            </div>

            {/* Type & Provider */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email Type</Label>
                <Select
                  value={formData.emailType}
                  onValueChange={(value) => handleChange("emailType", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) => handleChange("provider", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        <div className="flex flex-col">
                          <span>{provider.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {provider.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="message">Message</Label>
                <label className="flex items-center text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.useHtml}
                    onChange={(e) => handleChange("useHtml", e.target.checked)}
                    className="mr-2 rounded"
                  />
                  HTML Mode
                </label>
              </div>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleChange("message", e.target.value)}
                rows={12}
                placeholder={formData.useHtml ? "<p>HTML content...</p>" : "Your message..."}
                className="font-mono text-sm"
                required
              />
            </div>

            {/* Result */}
            {result && (
              <div
                className={cn(
                  "p-4 rounded-lg flex items-center gap-3",
                  result.success
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                )}
              >
                {result.success ? (
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                )}
                <p className="text-sm font-medium">{result.message}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1 gap-2">
                <Send className="h-4 w-4" />
                {isPending ? "Sending..." : "Send Email"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={handleTestSend}
              >
                Test (Resend)
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    to: "",
                    subject: "",
                    message: "",
                    emailType: "newsletter",
                    provider: "auto",
                    useHtml: false,
                  });
                  setResult(null);
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Smart Routing Info */}
        <GlassCard className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Smart Routing
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              Auto-select uses quota-aware routing
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              Brevo: Primary for notifications
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              Resend: Prioritized for auth emails
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              AWS SES: Failover when others exhausted
            </li>
          </ul>
        </GlassCard>

        {/* Quick Templates */}
        <GlassCard>
          <h4 className="font-medium mb-3">Quick Templates</h4>
          <div className="space-y-2">
            <QuickTemplateButton
              label="Welcome Email"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  subject: "Welcome to FoodShare! 🍎",
                  message:
                    "Hi there!\n\nWelcome to FoodShare, your community food sharing platform.\n\nStart exploring food near you today!",
                }));
              }}
            />
            <QuickTemplateButton
              label="Newsletter"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  subject: "This Week on FoodShare 📬",
                  message: "Hi!\n\nHere's what's happening in your community this week...",
                  emailType: "newsletter",
                }));
              }}
            />
            <QuickTemplateButton
              label="Food Alert"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  subject: "New Food Available Near You! 🥗",
                  message:
                    "Great news!\n\nNew food has been listed in your area. Check it out before it's gone!",
                  emailType: "food_listing",
                }));
              }}
            />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

// ============================================================================
// Providers Tab
// ============================================================================

function ProvidersTab({ providerHealth }: { providerHealth: ProviderHealth[] }) {
  return (
    <div className="space-y-6">
      {/* Provider Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {providerHealth.map((provider) => (
          <ProviderDetailCard key={provider.provider} provider={provider} />
        ))}
      </div>

      {/* Configuration */}
      <GlassCard>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          Provider Configuration
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <ProviderConfigCard
            name="Brevo"
            status="configured"
            dailyLimit={300}
            priority={1}
            description="Primary provider for app notifications and newsletters"
          />
          <ProviderConfigCard
            name="Resend"
            status="configured"
            dailyLimit={100}
            priority={2}
            description="Optimized for authentication and transactional emails"
          />
          <ProviderConfigCard
            name="AWS SES"
            status="configured"
            dailyLimit={100}
            priority={3}
            description="Failover provider when primary quotas are exhausted"
          />
        </div>
      </GlassCard>

      {/* Routing Rules */}
      <GlassCard>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Smart Routing Rules
        </h3>
        <div className="space-y-3">
          <RoutingRule condition="Email type = auth" action="Route to Resend" priority="High" />
          <RoutingRule
            condition="Email type = newsletter"
            action="Route to Brevo"
            priority="Normal"
          />
          <RoutingRule
            condition="Primary quota exhausted"
            action="Failover to AWS SES"
            priority="Fallback"
          />
          <RoutingRule
            condition="All quotas exhausted"
            action="Queue for next day"
            priority="Last resort"
          />
        </div>
      </GlassCard>
    </div>
  );
}

// ============================================================================
// Shared Components
// ============================================================================

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  trend,
  trendValue,
  color = "blue",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: "up" | "down";
  trendValue?: string;
  color?: "blue" | "emerald" | "violet" | "amber" | "rose";
}) {
  const colors = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200/50 dark:border-blue-800/50",
      icon: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
      value: "text-blue-700 dark:text-blue-300",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200/50 dark:border-emerald-800/50",
      icon: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
      value: "text-emerald-700 dark:text-emerald-300",
    },
    violet: {
      bg: "bg-violet-50 dark:bg-violet-950/30",
      border: "border-violet-200/50 dark:border-violet-800/50",
      icon: "bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400",
      value: "text-violet-700 dark:text-violet-300",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200/50 dark:border-amber-800/50",
      icon: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400",
      value: "text-amber-700 dark:text-amber-300",
    },
    rose: {
      bg: "bg-rose-50 dark:bg-rose-950/30",
      border: "border-rose-200/50 dark:border-rose-800/50",
      icon: "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400",
      value: "text-rose-700 dark:text-rose-300",
    },
  };

  const c = colors[color];

  return (
    <div className={cn("rounded-xl border p-4 transition-all hover:shadow-md", c.bg, c.border)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={cn("text-2xl font-bold", c.value)}>{value}</p>
          {trend && trendValue && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {trend === "up" ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-rose-500" />
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={cn("rounded-lg p-2", c.icon)}>{icon}</div>
      </div>
    </div>
  );
}

function ProviderHealthBadge({ provider }: { provider: ProviderHealth }) {
  const statusColors = {
    healthy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    degraded: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    down: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  };

  const providerNames = {
    brevo: "Brevo",
    resend: "Resend",
    aws_ses: "AWS SES",
    mailersend: "MailerSend",
  };

  return (
    <Badge variant="outline" className={cn("gap-1.5", statusColors[provider.status])}>
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          provider.status === "healthy"
            ? "bg-emerald-500"
            : provider.status === "degraded"
              ? "bg-amber-500"
              : "bg-rose-500"
        )}
      />
      {providerNames[provider.provider]}
      <span className="text-xs opacity-70">{provider.successRate}%</span>
    </Badge>
  );
}

function ProviderCard({ provider }: { provider: ProviderHealth }) {
  const providerNames = {
    brevo: "Brevo",
    resend: "Resend",
    aws_ses: "AWS SES",
    mailersend: "MailerSend",
  };

  const statusColors = {
    healthy: "text-emerald-600 dark:text-emerald-400",
    degraded: "text-amber-600 dark:text-amber-400",
    down: "text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">{providerNames[provider.provider]}</span>
        <span className={cn("text-sm font-semibold", statusColors[provider.status])}>
          {provider.successRate}%
        </span>
      </div>
      <Progress
        value={provider.successRate}
        className={cn(
          "h-2",
          provider.status === "healthy"
            ? "[&>div]:bg-emerald-500"
            : provider.status === "degraded"
              ? "[&>div]:bg-amber-500"
              : "[&>div]:bg-rose-500"
        )}
      />
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{provider.totalRequests.toLocaleString()} requests</span>
        <span>{provider.avgLatencyMs}ms avg</span>
      </div>
    </div>
  );
}

function ProviderDetailCard({ provider }: { provider: ProviderHealth }) {
  const providerNames = {
    brevo: "Brevo",
    resend: "Resend",
    aws_ses: "AWS SES",
  };

  const providerDescriptions = {
    brevo: "Primary email provider for app notifications",
    resend: "Optimized for authentication emails",
    aws_ses: "Failover provider for high availability",
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-lg p-2",
              provider.status === "healthy"
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                : provider.status === "degraded"
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                  : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
            )}
          >
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold">{providerNames[provider.provider]}</h4>
            <p className="text-xs text-muted-foreground">
              {providerDescriptions[provider.provider]}
            </p>
          </div>
        </div>
        <Badge
          variant={provider.status === "healthy" ? "default" : "secondary"}
          className="capitalize"
        >
          {provider.status}
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Success Rate</span>
            <span className="font-medium">{provider.successRate}%</span>
          </div>
          <Progress value={provider.successRate} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground">Total Requests</p>
            <p className="font-semibold">{provider.totalRequests.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Latency</p>
            <p className="font-semibold">{provider.avgLatencyMs}ms</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function ProviderConfigCard({
  name,
  status,
  dailyLimit,
  priority,
  description,
}: {
  name: string;
  status: "configured" | "not_configured";
  dailyLimit: number;
  priority: number;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{name}</span>
        <Badge variant={status === "configured" ? "default" : "secondary"} className="text-xs">
          {status === "configured" ? "Active" : "Not Configured"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Daily Limit: {dailyLimit}</span>
        <span className="text-muted-foreground">Priority: {priority}</span>
      </div>
    </div>
  );
}

function RoutingRule({
  condition,
  action,
  priority,
}: {
  condition: string;
  action: string;
  priority: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="text-xs">
          {priority}
        </Badge>
        <div>
          <p className="text-sm font-medium">{condition}</p>
          <p className="text-xs text-muted-foreground">→ {action}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Edit className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// Campaign Components
// ============================================================================

function CampaignRow({ campaign, compact }: { campaign: RecentCampaign; compact?: boolean }) {
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

function CampaignCard({ campaign }: { campaign: RecentCampaign }) {
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

// ============================================================================
// Automation Components
// ============================================================================

function AutomationRow({
  automation,
  compact,
}: {
  automation: ActiveAutomation;
  compact?: boolean;
}) {
  const statusColors = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    archived: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{automation.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {automation.triggerType.replace("_", " ")}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <Badge variant="outline" className={cn("text-xs", statusColors[automation.status])}>
            {automation.status}
          </Badge>
          <span className="text-xs text-muted-foreground">{automation.totalEnrolled} enrolled</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "rounded-lg p-2",
            automation.status === "active"
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          )}
        >
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium">{automation.name}</p>
          <p className="text-sm text-muted-foreground capitalize">
            Trigger: {automation.triggerType.replace("_", " ")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="font-semibold">{automation.totalEnrolled.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Enrolled</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{automation.conversionRate}%</p>
          <p className="text-xs text-muted-foreground">Conversion</p>
        </div>
        <Badge variant="outline" className={cn("text-xs", statusColors[automation.status])}>
          {automation.status}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {automation.status === "active" ? (
              <DropdownMenuItem>
                <Pause className="h-4 w-4 mr-2" /> Pause
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem>
                <Play className="h-4 w-4 mr-2" /> Activate
              </DropdownMenuItem>
            )}
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
    </div>
  );
}

function AutomationCard({ automation }: { automation: ActiveAutomation }) {
  const statusColors = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    archived: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <GlassCard className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "rounded-lg p-2",
            automation.status === "active"
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          )}
        >
          <Zap className="h-5 w-5" />
        </div>
        <Badge variant="outline" className={cn("text-xs", statusColors[automation.status])}>
          {automation.status}
        </Badge>
      </div>

      <h4 className="font-semibold mb-1">{automation.name}</h4>
      <p className="text-sm text-muted-foreground mb-4 capitalize">
        Trigger: {automation.triggerType.replace("_", " ")}
      </p>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
        <div className="text-center">
          <p className="text-lg font-semibold">{automation.totalEnrolled.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Enrolled</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">{automation.totalCompleted.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">{automation.conversionRate}%</p>
          <p className="text-xs text-muted-foreground">Conversion</p>
        </div>
      </div>
    </GlassCard>
  );
}

function AutomationTemplate({
  name,
  description,
  trigger,
}: {
  name: string;
  description: string;
  trigger: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Zap className="h-4 w-4" />
        </div>
        <h4 className="font-medium">{name}</h4>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{description}</p>
      <Badge variant="outline" className="text-xs">
        {trigger}
      </Badge>
    </div>
  );
}

// ============================================================================
// Audience Components
// ============================================================================

function SegmentCard({ segment }: { segment: AudienceSegment }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div
          className="rounded-lg p-2"
          style={{ backgroundColor: `${segment.color}20`, color: segment.color }}
        >
          <Target className="h-5 w-5" />
        </div>
        {segment.isSystem && (
          <Badge variant="outline" className="text-xs">
            System
          </Badge>
        )}
      </div>
      <h4 className="font-semibold mb-1">{segment.name}</h4>
      {segment.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{segment.description}</p>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <span className="text-lg font-semibold">{segment.cachedCount.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">subscribers</span>
      </div>
    </div>
  );
}

function SystemSegmentCard({
  name,
  count,
  color,
}: {
  name: string;
  count: number;
  color: "blue" | "emerald" | "violet" | "amber";
}) {
  const colors = {
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4">
      <div className={cn("rounded-lg p-2 w-fit mb-3", colors[color])}>
        <Users className="h-4 w-4" />
      </div>
      <p className="text-sm text-muted-foreground">{name}</p>
      <p className="text-xl font-bold">{count.toLocaleString()}</p>
    </div>
  );
}

// ============================================================================
// Utility Components
// ============================================================================

function EmptyState({
  icon,
  message,
  action,
}: {
  icon: React.ReactNode;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="rounded-full bg-muted p-3 mb-3 text-muted-foreground">{icon}</div>
      <p className="text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}

function QuickTemplateButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-sm"
    >
      {label}
    </button>
  );
}

// ============================================================================
// Default Data
// ============================================================================

function getDefaultStats(): EmailDashboardStats {
  return {
    totalSubscribers: 0,
    activeSubscribers: 0,
    emailsSent30d: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    unsubscribeRate: 0,
    bounceRate: 0,
    activeCampaigns: 0,
    activeAutomations: 0,
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 500,
    monthlyQuotaUsed: 0,
    monthlyQuotaLimit: 15000,
    suppressedEmails: 0,
  };
}
