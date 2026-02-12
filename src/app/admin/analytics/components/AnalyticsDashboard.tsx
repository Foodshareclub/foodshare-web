"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Users,
  ShoppingBag,
  Activity,
  MapPin,
  Leaf,
  Heart,
  Award,
  Utensils,
  Package,
} from "lucide-react";
import { motion } from "framer-motion";
import { InsightCard } from "./InsightCard";
import { ChartCard, EmptyState } from "./ChartCard";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { GlassPanel } from "@/components/ui/glass";
import { FeatureErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";

import {
  fetchAnalyticsSummary,
  fetchMonthlyGrowth,
  fetchDailyActiveUsers,
  fetchConversionFunnel,
  fetchUserRetentionCohorts,
  fetchInventoryAging,
  fetchListingTypeDistribution,
  fetchTopSharers,
} from "@/app/actions/analytics-data";
import type {
  AnalyticsSummary,
  MonthlyGrowth,
  DailyActiveUsers,
  FunnelStep,
  RetentionCohort,
  InventoryAge,
  ListingTypeDistribution,
  TopSharer,
} from "@/lib/data/analytics";

// Dynamic import for Leaflet-based component (client-side only)
const GeoHeatMap = dynamic(() => import("./GeoHeatMap").then((mod) => mod.GeoHeatMap), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground">
        <MapPin className="h-5 w-5 animate-pulse" />
        <span>Loading map...</span>
      </div>
    </div>
  ),
});

const CHART_COLORS = {
  primary: "#FF2D55",
  secondary: "#00A699",
  tertiary: "#FC642D",
  quaternary: "#8B5CF6",
  quinary: "#0EA5E9",
};

const PIE_COLORS = ["#FF2D55", "#00A699", "#FC642D", "#8B5CF6", "#0EA5E9", "#F59E0B", "#10B981"];

const TYPE_LABELS: Record<string, string> = {
  food: "Food",
  thing: "Things",
  borrow: "Borrow",
  wanted: "Wanted",
  fridge: "Fridges",
  foodbank: "Food Banks",
  business: "Businesses",
  volunteer: "Volunteer",
  challenge: "Challenges",
  zerowaste: "Zero Waste",
  vegan: "Vegan",
  community: "Community",
};

function ImpactBanner({
  foodSavedKg,
  co2Prevented,
  mealsShared,
  successfulShares,
}: {
  foodSavedKg: number;
  co2Prevented: number;
  mealsShared: number;
  successfulShares: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <GlassPanel className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-emerald-500/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-emerald-500/20">
              <Leaf className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Community Impact</h3>
              <p className="text-sm text-muted-foreground">Making a difference together</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 md:gap-8">
            <ImpactStat
              icon={Package}
              value={`${foodSavedKg.toLocaleString()}kg`}
              label="Food Saved"
            />
            <ImpactStat
              icon={Leaf}
              value={`${co2Prevented.toLocaleString()}kg`}
              label="CO₂ Prevented"
            />
            <ImpactStat icon={Utensils} value={mealsShared.toLocaleString()} label="Meals Shared" />
            <ImpactStat
              icon={Heart}
              value={successfulShares.toLocaleString()}
              label="Successful Shares"
            />
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function ImpactStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Package;
  value: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Icon className="w-4 h-4 text-emerald-500" />
        <span className="text-xl font-bold">{value}</span>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-24 bg-muted/30 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted/30 rounded-xl" />
        ))}
      </div>
      <div className="h-[350px] bg-muted/30 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[350px] bg-muted/30 rounded-xl" />
        <div className="h-[350px] bg-muted/30 rounded-xl" />
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [growthData, setGrowthData] = useState<MonthlyGrowth[]>([]);
  const [dauData, setDauData] = useState<DailyActiveUsers[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([]);
  const [cohortData, setCohortData] = useState<RetentionCohort[]>([]);
  const [ageData, setAgeData] = useState<InventoryAge[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<ListingTypeDistribution[]>([]);
  const [topSharers, setTopSharers] = useState<TopSharer[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const results = await Promise.all([
        fetchAnalyticsSummary(),
        fetchMonthlyGrowth(),
        fetchDailyActiveUsers(),
        fetchConversionFunnel(),
        fetchUserRetentionCohorts(),
        fetchInventoryAging(),
        fetchListingTypeDistribution(),
        fetchTopSharers(5),
      ]);

      if (results[0].success && results[0].data) setSummary(results[0].data);
      if (results[1].success && results[1].data) setGrowthData(results[1].data);
      if (results[2].success && results[2].data) setDauData(results[2].data);
      if (results[3].success && results[3].data) setFunnelData(results[3].data);
      if (results[4].success && results[4].data) setCohortData(results[4].data);
      if (results[5].success && results[5].data) setAgeData(results[5].data);
      if (results[6].success && results[6].data) setTypeDistribution(results[6].data);
      if (results[7].success && results[7].data) setTopSharers(results[7].data);

      setLastSyncAt(new Date().toISOString());
    } catch (err) {
      console.error("Failed to load analytics", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const foodSavedKg = summary?.foodSavedKg || 0;
  const co2Prevented = Math.round(foodSavedKg * 2.5);
  const mealsShared = Math.round(foodSavedKg / 0.4);
  const arrangedCount = funnelData.find((s) => s.step === "Arranged")?.count || 0;

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <FeatureErrorBoundary featureName="Analytics Dashboard">
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header with Sync Status */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Real-time insights from your community</p>
        <SyncStatusBadge lastSyncAt={lastSyncAt} onSyncComplete={fetchData} />
      </div>

      {/* Impact Banner */}
      <ImpactBanner
        foodSavedKg={foodSavedKg}
        co2Prevented={co2Prevented}
        mealsShared={mealsShared}
        successfulShares={arrangedCount}
      />

      {/* Key Metrics - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InsightCard
          title="Total Users"
          value={summary?.totalUsers || 0}
          change={summary?.usersChange}
          icon={Users}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
          subtitle={`${summary?.newUsersThisMonth || 0} new this month`}
          delay={0}
        />
        <InsightCard
          title="Active Users"
          value={summary?.activeUsers || 0}
          change={summary?.activeUsersChange}
          icon={Activity}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
          subtitle={`${summary?.activeUsers7d || 0} in last 7 days`}
          delay={1}
        />
        <InsightCard
          title="Total Listings"
          value={summary?.totalListings || 0}
          change={summary?.listingsChange}
          icon={ShoppingBag}
          iconColor="text-orange-500"
          iconBgColor="bg-orange-500/10"
          subtitle={`${summary?.activeListings || 0} active`}
          delay={2}
        />
        <InsightCard
          title="Food Saved"
          value={`${summary?.arrangedListings || 0} items`}
          change={summary?.arrangedChange}
          icon={Heart}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-500/10"
          subtitle="Successfully arranged"
          delay={3}
        />
      </div>

      {/* Engagement Metrics - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InsightCard
          title="Conversations"
          value={summary?.totalConversations || 0}
          icon={Users}
          iconColor="text-purple-500"
          iconBgColor="bg-purple-500/10"
          subtitle="Total chat rooms"
          delay={4}
        />
        <InsightCard
          title="Total Views"
          value={summary?.totalViews || 0}
          icon={Activity}
          iconColor="text-cyan-500"
          iconBgColor="bg-cyan-500/10"
          subtitle="Listing impressions"
          delay={5}
        />
        <InsightCard
          title="Total Likes"
          value={summary?.totalLikes || 0}
          icon={Heart}
          iconColor="text-pink-500"
          iconBgColor="bg-pink-500/10"
          subtitle="Community engagement"
          delay={6}
        />
        <InsightCard
          title="Active Sharers"
          value={summary?.usersWithPosts || 0}
          icon={Award}
          iconColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
          subtitle="Users with listings"
          delay={7}
        />
      </div>

      {/* Conversion Funnel */}
      <ChartCard
        title="Value Loop Funnel"
        subtitle="Track the journey from listing to successful share"
        delay={8}
        minHeight="350px"
      >
        {funnelData.length === 0 ? (
          <EmptyState message="No funnel data yet" />
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 60, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal stroke="hsl(var(--border))" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="step"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 14, fontWeight: 500 }}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  formatter={(value, name) => {
                    if (name === "dropoff" && typeof value === "number")
                      return [(value * 100).toFixed(1) + "%", "Drop-off"];
                    return [value ?? 0, "Count"];
                  }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={36}>
                  {funnelData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.tertiary][
                          index % 3
                        ]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      {/* Geographic Heat Map */}
      <ChartCard
        title="Geographic Activity"
        subtitle="Where food sharing is happening"
        delay={9}
        minHeight="450px"
      >
        <GeoHeatMap />
      </ChartCard>

      {/* Growth Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Monthly Growth" subtitle="Users and listings over time" delay={10}>
          {growthData.length === 0 ? (
            <EmptyState message="No growth data yet" />
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorListings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                  />
                  <Area
                    type="monotone"
                    dataKey="listings"
                    stroke={CHART_COLORS.secondary}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorListings)"
                  />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Daily Active Users" subtitle="Last 30 days" delay={11}>
          {dauData.length === 0 ? (
            <EmptyState message="No activity data yet" />
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dauData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickFormatter={(v) => v.split("-").slice(1).join("/")}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar dataKey="count" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Listings & Distribution Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Listing Activity"
          subtitle="Monthly new listings"
          delay={12}
          className="lg:col-span-2"
        >
          {growthData.length === 0 ? (
            <EmptyState message="No listing data yet" />
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="listings"
                    stroke={CHART_COLORS.tertiary}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.tertiary, strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Listing Types" subtitle="Distribution by category" delay={13}>
          {typeDistribution.length === 0 ? (
            <EmptyState message="No type data yet" />
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistribution.map((d) => ({
                      name: TYPE_LABELS[d.type] || d.type,
                      value: d.count,
                      percentage: d.percentage,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {typeDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Top Sharers & Inventory Age */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Food Heroes" subtitle="Most active community members" delay={14}>
          {topSharers.length === 0 ? (
            <EmptyState message="No sharer data yet" />
          ) : (
            <div className="space-y-4">
              {topSharers.map((sharer, index) => (
                <div key={sharer.userId} className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 && "bg-yellow-500/20 text-yellow-600",
                      index === 1 && "bg-gray-400/20 text-gray-600",
                      index === 2 && "bg-orange-500/20 text-orange-600",
                      index > 2 && "bg-muted text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{sharer.nickname || "Anonymous"}</p>
                    <p className="text-sm text-muted-foreground">
                      {sharer.arrangedCount} successful shares
                    </p>
                  </div>
                  <Award
                    className={cn(
                      "w-5 h-5",
                      index === 0 && "text-yellow-500",
                      index === 1 && "text-gray-400",
                      index === 2 && "text-orange-500",
                      index > 2 && "text-muted-foreground/50"
                    )}
                  />
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Inventory Aging" subtitle="How long listings stay active" delay={15}>
          {ageData.length === 0 ? (
            <EmptyState message="No inventory data yet" />
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="bucket"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                    {ageData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={["#10B981", "#F59E0B", "#EF4444"][index % 3]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Retention Cohorts */}
      <ChartCard title="User Retention" subtitle="Monthly cohort analysis" delay={16}>
        {cohortData.length === 0 ? (
          <EmptyState message="No retention data yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Cohort</th>
                  <th className="text-center py-3 px-4 font-medium">Users</th>
                  <th className="text-center py-3 px-4 font-medium">Month 1</th>
                  <th className="text-center py-3 px-4 font-medium">Month 2</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.slice(0, 6).map((cohort) => {
                  const month1Pct = cohort.size > 0 ? (cohort.month1 / cohort.size) * 100 : 0;
                  const month2Pct = cohort.size > 0 ? (cohort.month2 / cohort.size) * 100 : 0;
                  return (
                    <tr key={cohort.cohort} className="border-b border-border/50">
                      <td className="py-3 px-4 font-medium">{cohort.cohort}</td>
                      <td className="text-center py-3 px-4">{cohort.size}</td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={cn(
                            "inline-block px-2 py-1 rounded text-xs font-medium",
                            month1Pct >= 50 && "bg-emerald-500/20 text-emerald-600",
                            month1Pct >= 25 && month1Pct < 50 && "bg-yellow-500/20 text-yellow-600",
                            month1Pct < 25 && "bg-muted text-muted-foreground"
                          )}
                        >
                          {month1Pct.toFixed(0)}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={cn(
                            "inline-block px-2 py-1 rounded text-xs font-medium",
                            month2Pct >= 50 && "bg-emerald-500/20 text-emerald-600",
                            month2Pct >= 25 && month2Pct < 50 && "bg-yellow-500/20 text-yellow-600",
                            month2Pct < 25 && "bg-muted text-muted-foreground"
                          )}
                        >
                          {month2Pct.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
    </FeatureErrorBoundary>
  );
}
