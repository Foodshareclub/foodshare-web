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

// Lazy-load AnalyticsDashboard (includes Recharts ~290KB) - only loads on this route
const AnalyticsDashboard = dynamic(
  () =>
    import("@/components/admin/analytics/AnalyticsDashboard").then((m) => ({
      default: m.AnalyticsDashboard,
    })),
  {
    ssr: false,
    loading: AnalyticsLoadingFallback,
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
    </div>
  );
}
