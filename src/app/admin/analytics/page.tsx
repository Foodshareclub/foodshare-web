"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function AnalyticsLoadingFallback() {
  return (
    <div className="grid gap-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  );
}

function AIAnalyticsLoadingFallback() {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-10 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  );
}

// Lazy-load AnalyticsDashboard (includes Recharts ~290KB) - only loads on this route
const AnalyticsDashboard = dynamic(
  () =>
    import("@/components/admin/analytics/AnalyticsDashboardV2").then((m) => ({
      default: m.AnalyticsDashboardV2,
    })),
  {
    ssr: false,
    loading: AnalyticsLoadingFallback,
  }
);

// Lazy-load AIAnalyticsPanel
const AIAnalyticsPanel = dynamic(
  () =>
    import("@/components/admin/analytics/AIAnalyticsPanel").then((m) => ({
      default: m.AIAnalyticsPanel,
    })),
  {
    ssr: false,
    loading: AIAnalyticsLoadingFallback,
  }
);

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
            Powered by MotherDuck
          </span>
        </div>
      </div>
      <AnalyticsDashboard />

      {/* AI-Powered Analytics Section */}
      <div className="rounded-lg border bg-card p-6">
        <AIAnalyticsPanel />
      </div>
    </div>
  );
}
