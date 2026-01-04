"use client";

import React, { useEffect, useState } from "react";
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
import { Users, ShoppingBag, ArrowUpRight, ArrowDownRight, Activity, MapPin } from "lucide-react";
import { GlassCard, GlassPanel } from "@/components/ui/glass";

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
import {
  getAnalyticsSummary,
  getMonthlyGrowth,
  getDailyActiveUsers,
  getEventDistribution,
  getConversionFunnel,
  getUserRetentionCohorts,
  getInventoryAging,
  AnalyticsSummary,
  MonthlyGrowth,
  DailyActiveUsers,
  EventDistribution,
  FunnelStep,
  RetentionCohort,
  InventoryAge,
} from "@/app/actions/analytics";
import { cn } from "@/lib/utils";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export const AnalyticsDashboard = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [growthData, setGrowthData] = useState<MonthlyGrowth[]>([]);
  const [dauData, setDauData] = useState<DailyActiveUsers[]>([]);
  const [eventDistribution, setEventDistribution] = useState<EventDistribution[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([]);
  const [cohortData, setCohortData] = useState<RetentionCohort[]>([]);
  const [ageData, setAgeData] = useState<InventoryAge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          summaryResult,
          growthResult,
          dauResult,
          distResult,
          funnelResult,
          cohortResult,
          ageResult,
        ] = await Promise.all([
          getAnalyticsSummary(),
          getMonthlyGrowth(),
          getDailyActiveUsers(),
          getEventDistribution(),
          getConversionFunnel(),
          getUserRetentionCohorts(),
          getInventoryAging(),
        ]);

        if (summaryResult.success && summaryResult.data) setSummary(summaryResult.data);
        if (growthResult.success && growthResult.data) setGrowthData(growthResult.data);
        if (dauResult.success && dauResult.data) setDauData(dauResult.data);
        if (distResult.success && distResult.data) setEventDistribution(distResult.data);
        if (funnelResult.success && funnelResult.data) setFunnelData(funnelResult.data);
        if (cohortResult.success && cohortResult.data) setCohortData(cohortResult.data);
        if (ageResult.success && ageResult.data) setAgeData(ageResult.data);
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted/20 animate-pulse" />
          ))}
        </div>
        <div className="h-[400px] rounded-xl bg-muted/20 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <GlassCard className="glass-card flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <h3 className="text-2xl font-bold mt-1">{summary?.totalUsers.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 mt-4 text-xs font-medium",
              (summary?.usersChange ?? 0) >= 0 ? "text-green-500" : "text-red-500"
            )}
          >
            {(summary?.usersChange ?? 0) >= 0 ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            <span>
              {(summary?.usersChange ?? 0) >= 0 ? "+" : ""}
              {summary?.usersChange ?? 0}% from last month
            </span>
          </div>
        </GlassCard>

        {/* Active Users */}
        <GlassCard className="glass-card flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Users</p>
              <h3 className="text-2xl font-bold mt-1">{summary?.activeUsers.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 mt-4 text-xs font-medium",
              (summary?.activeUsersChange ?? 0) >= 0 ? "text-green-500" : "text-red-500"
            )}
          >
            {(summary?.activeUsersChange ?? 0) >= 0 ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            <span>
              {(summary?.activeUsersChange ?? 0) >= 0 ? "+" : ""}
              {summary?.activeUsersChange ?? 0}% from last month
            </span>
          </div>
        </GlassCard>

        {/* Listings */}
        <GlassCard className="glass-card flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Listings</p>
              <h3 className="text-2xl font-bold mt-1">{summary?.totalListings.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 mt-4 text-xs font-medium",
              (summary?.listingsChange ?? 0) >= 0 ? "text-green-500" : "text-red-500"
            )}
          >
            {(summary?.listingsChange ?? 0) >= 0 ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            <span>
              {(summary?.listingsChange ?? 0) >= 0 ? "+" : ""}
              {summary?.listingsChange ?? 0}% from last month
            </span>
          </div>
        </GlassCard>

        {/* Food Saved (Now Real-Time from Arranged) */}
        <GlassCard className="glass-card flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Food Saved</p>
              <h3 className="text-2xl font-bold mt-1">
                {funnelData.find((s) => s.step === "Arranged")?.count || 0} items
              </h3>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 mt-4 text-xs font-medium",
              (summary?.arrangedChange ?? 0) >= 0 ? "text-green-500" : "text-red-500"
            )}
          >
            {(summary?.arrangedChange ?? 0) >= 0 ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            <span>
              {(summary?.arrangedChange ?? 0) >= 0 ? "+" : ""}
              {summary?.arrangedChange ?? 0}% from last month
            </span>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassPanel className="min-h-[400px] lg:col-span-2">
          <h3 className="text-lg font-semibold mb-6">Conversion Funnel (Value Loop)</h3>
          <div className="h-[300px] w-full">
            {funnelData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No funnel data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    stroke="hsl(var(--border))"
                  />
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
                        return [(value * 100).toFixed(1) + "%", "Drop-off Rate"];
                      return [value ?? 0, "Count"];
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    barSize={40}
                    radius={[0, 4, 4, 0]}
                  >
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassPanel>
      </div>

      {/* Geographic Activity Heat Map */}
      <GlassPanel className="min-h-[450px]">
        <h3 className="text-lg font-semibold mb-6">Geographic Activity Hotspots</h3>
        <GeoHeatMap />
      </GlassPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassPanel className="min-h-[400px]">
          <h3 className="text-lg font-semibold mb-6">User Growth (Registered)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF2D55" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF2D55" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  dy={10}
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
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel className="min-h-[400px]">
          <h3 className="text-lg font-semibold mb-6">Daily Active Users (DAU)</h3>
          <div className="h-[300px] w-full">
            {dauData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No activity data yet
              </div>
            ) : (
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
                    dy={10}
                    tickFormatter={(v) => v.split("-").slice(1).join("/")}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassPanel className="min-h-[350px] lg:col-span-2">
          <h3 className="text-lg font-semibold mb-6">Listings Activity</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  dy={10}
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
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--chart-2))" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel className="min-h-[350px]">
          <h3 className="text-lg font-semibold mb-6">Top Actions</h3>
          <div className="h-[250px] w-full">
            {eventDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No event data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={eventDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {eventDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
            )}
          </div>
        </GlassPanel>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassPanel className="min-h-[400px]">
          <h3 className="text-lg font-semibold mb-6">Inventory Aging (Availability)</h3>
          {ageData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No active listings
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="bucket"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--orange-500))" radius={[0, 4, 4, 0]}>
                    {ageData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={["#4ade80", "#facc15", "#f87171"][index % 3]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassPanel>

        <GlassPanel className="min-h-[400px]">
          <h3 className="text-lg font-semibold mb-6">User Retention (Cohort Analysis)</h3>
          {cohortData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No cohort data available yet
            </div>
          ) : (
            <div className="overflow-auto max-h-[300px]">
              <table className="w-full text-sm text-left">
                <thead className="text-muted-foreground font-medium bg-muted/20">
                  <tr>
                    <th className="p-3 rounded-l-lg">Cohort</th>
                    <th className="p-3 text-right">Users</th>
                    <th className="p-3 text-center">Month 1</th>
                    <th className="p-3 text-center rounded-r-lg">Month 2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cohortData.map((row) => (
                    <tr key={row.cohort} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-medium">{row.cohort}</td>
                      <td className="p-3 text-right">{row.size}</td>
                      <td className="p-3 text-center">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-bold",
                            row.month1 / row.size > 0.3
                              ? "bg-green-500/20 text-green-500"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {row.size > 0 ? Math.round((row.month1 / row.size) * 100) : 0}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-bold",
                            row.month2 / row.size > 0.3
                              ? "bg-green-500/20 text-green-500"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {row.size > 0 ? Math.round((row.month2 / row.size) * 100) : 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
};
