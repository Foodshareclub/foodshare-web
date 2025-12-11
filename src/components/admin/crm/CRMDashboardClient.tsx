"use client";

/**
 * CRMDashboardClient - Customer Relationship Management Dashboard
 * Modern UI with customer management, engagement tracking, and analytics
 */

import React, { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Search,
  MoreHorizontal,
  Mail,
  MessageSquare,
  Tag,
  UserPlus,
  Download,
  RefreshCw,
  Activity,
  Target,
  Heart,
  Award,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CRMCustomerWithProfile, CRMCustomerTag, CRMDashboardStats } from "@/types/crm.types";

// ============================================================================
// Types
// ============================================================================

interface CRMDashboardClientProps {
  initialCustomers: CRMCustomerWithProfile[];
  stats: CRMDashboardStats;
  tags: CRMCustomerTag[];
}

type TabType = "overview" | "customers" | "segments" | "engagement";

// ============================================================================
// Main Component
// ============================================================================

export function CRMDashboardClient({ initialCustomers, stats, tags }: CRMDashboardClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CRMCustomerWithProfile | null>(null);

  // Filter customers
  const filteredCustomers = initialCustomers.filter((customer) => {
    const matchesSearch =
      customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLifecycle =
      lifecycleFilter === "all" || customer.lifecycle_stage === lifecycleFilter;
    return matchesSearch && matchesLifecycle;
  });

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="flex flex-1 min-h-0 rounded-2xl border border-border/40 bg-gradient-to-br from-card to-card/80 overflow-hidden shadow-xl">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-border/40 px-4">
          <nav className="flex gap-1">
            {(["overview", "customers", "segments", "engagement"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t(tab)}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <OverviewTab key="overview" stats={stats} customers={filteredCustomers} tags={tags} />
            )}
            {activeTab === "customers" && (
              <CustomersTab
                key="customers"
                customers={filteredCustomers}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                lifecycleFilter={lifecycleFilter}
                setLifecycleFilter={setLifecycleFilter}
                onSelectCustomer={setSelectedCustomer}
                onRefresh={handleRefresh}
                isPending={isPending}
              />
            )}
            {activeTab === "segments" && <SegmentsTab key="segments" stats={stats} tags={tags} />}
            {activeTab === "engagement" && (
              <EngagementTab key="engagement" stats={stats} customers={filteredCustomers} />
            )}
          </AnimatePresence>
        </ScrollArea>
      </div>

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({
  stats,
  customers,
  tags,
}: {
  stats: CRMDashboardStats;
  customers: CRMCustomerWithProfile[];
  tags: CRMCustomerTag[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="p-5 space-y-5"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Customers"
          value={stats.totalCustomers.toLocaleString()}
          change={stats.newCustomersThisWeek}
          changeLabel="this week"
          icon={<Users className="h-4 w-4" />}
          color="blue"
        />
        <StatCard
          label="Active Users"
          value={stats.activeCustomers.toLocaleString()}
          change={Math.round((stats.activeCustomers / Math.max(stats.totalCustomers, 1)) * 100)}
          changeLabel="of total"
          icon={<Activity className="h-4 w-4" />}
          color="emerald"
        />
        <StatCard
          label="Champions"
          value={stats.championCount.toLocaleString()}
          change={stats.championCount}
          changeLabel="top users"
          icon={<Award className="h-4 w-4" />}
          color="violet"
        />
        <StatCard
          label="At Risk"
          value={stats.atRiskCount.toLocaleString()}
          change={stats.atRiskCount}
          changeLabel="need attention"
          icon={<AlertTriangle className="h-4 w-4" />}
          color="amber"
          negative
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Lifecycle Funnel */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/50 p-4">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-primary" />
            Customer Lifecycle
          </h3>
          <div className="space-y-3">
            <LifecycleBar
              label="Leads"
              count={stats.leadCount}
              total={stats.totalCustomers}
              color="slate"
            />
            <LifecycleBar
              label="Active"
              count={stats.activeCount}
              total={stats.totalCustomers}
              color="blue"
            />
            <LifecycleBar
              label="Champions"
              count={stats.championCount}
              total={stats.totalCustomers}
              color="emerald"
            />
            <LifecycleBar
              label="At Risk"
              count={stats.atRiskCount}
              total={stats.totalCustomers}
              color="amber"
            />
            <LifecycleBar
              label="Churned"
              count={stats.churnedCount}
              total={stats.totalCustomers}
              color="rose"
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          {/* Customer Types */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-primary" />
              Customer Types
            </h3>
            <div className="space-y-2">
              <TypeRow label="Donors" count={stats.donorCount} icon="🎁" />
              <TypeRow label="Receivers" count={stats.receiverCount} icon="📦" />
              <TypeRow label="Both" count={stats.bothCount} icon="🤝" />
            </div>
          </div>

          {/* Top Tags */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-primary" />
              Popular Tags
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
              {tags.length === 0 && (
                <p className="text-xs text-muted-foreground">No tags defined</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Customers */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            Recent Customers
          </h3>
          <Button variant="ghost" size="sm" className="text-xs h-7">
            View All
          </Button>
        </div>
        <div className="space-y-2">
          {customers.slice(0, 5).map((customer) => (
            <CustomerRow key={customer.id} customer={customer} compact />
          ))}
          {customers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No customers yet</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Customers Tab
// ============================================================================

function CustomersTab({
  customers,
  searchQuery,
  setSearchQuery,
  lifecycleFilter,
  setLifecycleFilter,
  onSelectCustomer,
  onRefresh,
  isPending,
}: {
  customers: CRMCustomerWithProfile[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  lifecycleFilter: string;
  setLifecycleFilter: (f: string) => void;
  onSelectCustomer: (c: CRMCustomerWithProfile) => void;
  onRefresh: () => void;
  isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="p-5 space-y-4"
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-background/50"
          />
        </div>
        <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
          <SelectTrigger className="w-36 h-9 bg-background/50">
            <SelectValue placeholder="Lifecycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="lead">Leads</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="champion">Champions</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2"
          onClick={onRefresh}
          disabled={isPending}
        >
          <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
          Refresh
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Customer List */}
      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr className="text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left py-3 px-4">Customer</th>
              <th className="text-left py-3 px-4">Stage</th>
              <th className="text-center py-3 px-4">Engagement</th>
              <th className="text-center py-3 px-4">Churn Risk</th>
              <th className="text-left py-3 px-4">Last Active</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onSelectCustomer(customer)}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={customer.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {customer.full_name?.slice(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {customer.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <LifecycleBadge stage={customer.lifecycle_stage || "lead"} />
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Progress value={customer.engagement_score || 50} className="w-16 h-1.5" />
                    <span className="text-xs text-muted-foreground">
                      {customer.engagement_score || 50}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <ChurnRiskBadge score={customer.churn_risk_score || 0} />
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {customer.last_interaction_at
                    ? new Date(customer.last_interaction_at).toLocaleDateString()
                    : "Never"}
                </td>
                <td className="py-3 px-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add Note
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Tag className="h-4 w-4 mr-2" />
                        Manage Tags
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No customers found</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Segments Tab
// ============================================================================

function SegmentsTab({ stats, tags }: { stats: CRMDashboardStats; tags: CRMCustomerTag[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="p-5 space-y-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Audience Segments</h2>
          <p className="text-sm text-muted-foreground">Group customers for targeted engagement</p>
        </div>
        <Button className="gap-2 h-9">
          <UserPlus className="h-4 w-4" />
          Create Segment
        </Button>
      </div>

      {/* Predefined Segments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SegmentCard
          name="New Users (7 days)"
          description="Users who joined in the last week"
          count={stats.newCustomersThisWeek}
          color="#3b82f6"
          icon={<UserPlus className="h-5 w-5" />}
        />
        <SegmentCard
          name="Active Champions"
          description="Highly engaged power users"
          count={stats.championCount}
          color="#10b981"
          icon={<Award className="h-5 w-5" />}
        />
        <SegmentCard
          name="At Risk Users"
          description="Users showing churn signals"
          count={stats.atRiskCount}
          color="#f59e0b"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <SegmentCard
          name="Food Donors"
          description="Users who share food"
          count={stats.donorCount}
          color="#8b5cf6"
          icon={<Heart className="h-5 w-5" />}
        />
        <SegmentCard
          name="Food Receivers"
          description="Users who receive food"
          count={stats.receiverCount}
          color="#ec4899"
          icon={<Users className="h-5 w-5" />}
        />
        <SegmentCard
          name="Inactive (30+ days)"
          description="Users with no recent activity"
          count={stats.churnedCount}
          color="#6b7280"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {/* Custom Tags */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            <Tag className="h-4 w-4 text-primary" />
            Custom Tags
          </h3>
          <Button variant="outline" size="sm" className="h-8">
            Add Tag
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{tag.name}</p>
                {tag.description && (
                  <p className="text-xs text-muted-foreground truncate">{tag.description}</p>
                )}
              </div>
            </div>
          ))}
          {tags.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-6">
              No custom tags yet
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Engagement Tab
// ============================================================================

function EngagementTab({
  stats,
  customers,
}: {
  stats: CRMDashboardStats;
  customers: CRMCustomerWithProfile[];
}) {
  const avgEngagement = stats.averageEngagementScore;
  const avgChurnRisk = stats.averageChurnRisk;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="p-5 space-y-5"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">Engagement Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Track user engagement and identify opportunities
        </p>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Avg Engagement"
          value={`${avgEngagement}%`}
          icon={<Activity className="h-4 w-4" />}
          color="blue"
        />
        <MetricCard
          label="Avg Churn Risk"
          value={`${avgChurnRisk}%`}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="amber"
        />
        <MetricCard
          label="Total Interactions"
          value={stats.totalInteractions.toLocaleString()}
          icon={<MessageSquare className="h-4 w-4" />}
          color="emerald"
        />
        <MetricCard
          label="Avg LTV Score"
          value={stats.averageLTVScore.toLocaleString()}
          icon={<TrendingUp className="h-4 w-4" />}
          color="violet"
        />
      </div>

      {/* Top Champions */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm">
          <Award className="h-4 w-4 text-primary" />
          Top Champions
        </h3>
        <div className="space-y-2">
          {stats.topChampions.map((champion, index) => (
            <div
              key={champion.customer_id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
            >
              <span className="text-lg font-bold text-muted-foreground w-6">#{index + 1}</span>
              <div className="flex-1">
                <p className="font-medium text-foreground">{champion.full_name}</p>
                <p className="text-xs text-muted-foreground">LTV Score: {champion.ltv_score}</p>
              </div>
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                Champion
              </Badge>
            </div>
          ))}
          {stats.topChampions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No champions yet</p>
          )}
        </div>
      </div>

      {/* Engagement Distribution */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm">
          <Target className="h-4 w-4 text-primary" />
          Engagement Distribution
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {[
            { range: "0-20%", color: "bg-rose-500" },
            { range: "21-40%", color: "bg-orange-500" },
            { range: "41-60%", color: "bg-amber-500" },
            { range: "61-80%", color: "bg-emerald-500" },
            { range: "81-100%", color: "bg-blue-500" },
          ].map((bucket, i) => {
            const count = customers.filter((c) => {
              const score = c.engagement_score || 50;
              const min = i * 20;
              const max = (i + 1) * 20;
              return score >= min && score < max;
            }).length;
            return (
              <div key={bucket.range} className="text-center">
                <div
                  className={cn("h-20 rounded-lg mb-2", bucket.color)}
                  style={{ opacity: 0.2 + (count / Math.max(customers.length, 1)) * 0.8 }}
                />
                <p className="text-xs font-medium text-foreground">{count}</p>
                <p className="text-[10px] text-muted-foreground">{bucket.range}</p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Customer Detail Modal
// ============================================================================

function CustomerDetailModal({
  customer,
  open,
  onClose,
}: {
  customer: CRMCustomerWithProfile | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={customer.avatar_url || undefined} />
              <AvatarFallback>
                {customer.full_name?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{customer.full_name || "Unknown"}</p>
              <p className="text-sm text-muted-foreground font-normal">{customer.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {customer.engagement_score || 50}%
              </p>
              <p className="text-xs text-muted-foreground">Engagement</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{customer.items_shared || 0}</p>
              <p className="text-xs text-muted-foreground">Items Shared</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{customer.items_received || 0}</p>
              <p className="text-xs text-muted-foreground">Items Received</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Lifecycle Stage</span>
              <LifecycleBadge stage={customer.lifecycle_stage || "lead"} />
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Customer Type</span>
              <span className="text-sm font-medium capitalize">
                {customer.customer_type || "both"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Churn Risk</span>
              <ChurnRiskBadge score={customer.churn_risk_score || 0} />
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Forum Reputation</span>
              <span className="text-sm font-medium">{customer.forum_reputation || 0}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">Member Since</span>
              <span className="text-sm font-medium">
                {customer.created_at
                  ? new Date(customer.created_at).toLocaleDateString()
                  : "Unknown"}
              </span>
            </div>
          </div>

          {/* Tags */}
          {customer.tags && customer.tags.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {customer.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button className="flex-1 gap-2">
              <Mail className="h-4 w-4" />
              Send Email
            </Button>
            <Button variant="outline" className="flex-1 gap-2">
              <MessageSquare className="h-4 w-4" />
              Add Note
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

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
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          <div className="flex items-center gap-1 mt-1">
            {negative ? (
              <ArrowDownRight className="h-3 w-3 text-amber-500" />
            ) : (
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
            )}
            <span className={cn("text-xs", negative ? "text-amber-500" : "text-emerald-500")}>
              {change} {changeLabel}
            </span>
          </div>
        </div>
        <div className={cn("p-2.5 rounded-lg", colorClasses[color])}>{icon}</div>
      </div>
    </div>
  );
}

function MetricCard({
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
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
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
      <span className="text-sm font-medium text-foreground w-12 text-right">{count}</span>
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
      <span className="text-sm font-semibold text-foreground">{count.toLocaleString()}</span>
    </div>
  );
}

function CustomerRow({
  customer,
  compact = false,
}: {
  customer: CRMCustomerWithProfile;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
      <Avatar className={compact ? "h-8 w-8" : "h-10 w-10"}>
        <AvatarImage src={customer.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {customer.full_name?.slice(0, 2).toUpperCase() || "??"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {customer.full_name || "Unknown"}
        </p>
        <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
      </div>
      <LifecycleBadge stage={customer.lifecycle_stage || "lead"} />
    </div>
  );
}

function LifecycleBadge({ stage }: { stage: string }) {
  const config: Record<string, { label: string; className: string }> = {
    lead: {
      label: "Lead",
      className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    active: {
      label: "Active",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    champion: {
      label: "Champion",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    at_risk: {
      label: "At Risk",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    churned: {
      label: "Churned",
      className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    },
  };

  const { label, className } = config[stage] || config.lead;

  return (
    <Badge variant="secondary" className={cn("text-xs", className)}>
      {label}
    </Badge>
  );
}

function ChurnRiskBadge({ score }: { score: number }) {
  let className = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  let label = "Low";

  if (score >= 70) {
    className = "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
    label = "High";
  } else if (score >= 40) {
    className = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    label = "Medium";
  }

  return (
    <Badge variant="secondary" className={cn("text-xs", className)}>
      {label} ({score}%)
    </Badge>
  );
}

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
    <div className="rounded-xl border border-border/50 bg-card/50 p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${color}15`, color }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          <p className="text-lg font-bold text-foreground mt-2">{count.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
