"use client";

/**
 * AdminReportsClient - Analytics and reporting dashboard
 */

import { useTranslations } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Users,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportsData } from "@/lib/data/admin-reports";

interface Props {
  data: ReportsData;
}

export function AdminReportsClient({ data }: Props) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      {/* Overview Stats with Trends */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TrendCard
          label="Total Listings"
          value={data.overview.totalListings}
          growth={data.overview.listingsGrowth}
          icon={Package}
          color="blue"
        />
        <TrendCard
          label="Total Users"
          value={data.overview.totalUsers}
          growth={data.overview.usersGrowth}
          icon={Users}
          color="green"
        />
        <TrendCard
          label="Total Chats"
          value={data.overview.totalChats}
          growth={data.overview.chatsGrowth}
          icon={MessageSquare}
          color="purple"
        />
        <TrendCard
          label="Arranged"
          value={data.overview.totalArranged}
          growth={data.overview.arrangedGrowth}
          icon={CheckCircle}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Listings by Category */}
        <div className="bg-background rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Listings by Category</h3>
          <div className="space-y-3">
            {data.listingsByCategory.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No data available</p>
            ) : (
              data.listingsByCategory.map((item) => (
                <CategoryBar
                  key={item.category}
                  category={item.category}
                  count={item.count}
                  total={data.overview.totalListings}
                />
              ))
            )}
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-background rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Activity (Last 30 Days)</h3>
          <div className="h-64">
            {data.listingsByDay.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No data available</p>
            ) : (
              <SimpleBarChart data={data.listingsByDay} label="Listings" />
            )}
          </div>
        </div>
      </div>

      {/* User Growth */}
      <div className="bg-background rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">User Signups (Last 30 Days)</h3>
        <div className="h-48">
          {data.usersByDay.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No data available</p>
          ) : (
            <SimpleBarChart data={data.usersByDay} label="Users" color="green" />
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Avg Listings/Day"
          value={Math.round(
            data.listingsByDay.reduce((sum, d) => sum + d.count, 0) /
              Math.max(data.listingsByDay.length, 1)
          )}
        />
        <SummaryCard
          label="Avg Users/Day"
          value={Math.round(
            data.usersByDay.reduce((sum, d) => sum + d.count, 0) /
              Math.max(data.usersByDay.length, 1)
          )}
        />
        <SummaryCard
          label="Arrangement Rate"
          value={`${data.overview.totalListings > 0 ? Math.round((data.overview.totalArranged / data.overview.totalListings) * 100) : 0}%`}
        />
        <SummaryCard label="Categories" value={data.listingsByCategory.length} />
      </div>
    </div>
  );
}

// Trend Card Component
function TrendCard({
  label,
  value,
  growth,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  growth: number;
  icon: React.ElementType;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
  };

  const TrendIcon = growth > 0 ? TrendingUp : growth < 0 ? TrendingDown : Minus;
  const trendColor = growth > 0 ? "text-green-600" : growth < 0 ? "text-red-600" : "text-gray-500";

  return (
    <div className="bg-background rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className={cn("flex items-center gap-1 text-sm font-medium", trendColor)}>
          <TrendIcon className="h-4 w-4" />
          <span>{Math.abs(growth)}%</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// Category Bar Component
function CategoryBar({
  category,
  count,
  total,
}: {
  category: string;
  count: number;
  total: number;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  const categoryColors: Record<string, string> = {
    food: "bg-green-500",
    thing: "bg-blue-500",
    borrow: "bg-purple-500",
    wanted: "bg-orange-500",
    fridge: "bg-cyan-500",
    foodbank: "bg-red-500",
    volunteer: "bg-pink-500",
    zerowaste: "bg-emerald-500",
    vegan: "bg-lime-500",
  };

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm text-muted-foreground capitalize truncate">{category}</span>
      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            categoryColors[category] || "bg-gray-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-12 text-sm font-medium text-right">{count}</span>
    </div>
  );
}

// Simple Bar Chart Component
function SimpleBarChart({
  data,
  label,
  color = "blue",
}: {
  data: { date: string; count: number }[];
  label: string;
  color?: "blue" | "green";
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barColor = color === "green" ? "bg-green-500" : "bg-blue-500";

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-end gap-1">
        {data.slice(-14).map((item, index) => (
          <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={cn("w-full rounded-t transition-all", barColor)}
              style={{
                height: `${(item.count / maxCount) * 100}%`,
                minHeight: item.count > 0 ? "4px" : "0",
              }}
              title={`${item.date}: ${item.count} ${label}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>
          {data.length > 0
            ? new Date(data[Math.max(0, data.length - 14)].date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            : ""}
        </span>
        <span>
          {data.length > 0
            ? new Date(data[data.length - 1].date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            : ""}
        </span>
      </div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-background rounded-lg border border-border p-4 text-center">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
