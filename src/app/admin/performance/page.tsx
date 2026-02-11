"use client";

import dynamic from "next/dynamic";
import { Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function PerformanceLoadingFallback() {
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-[250px] rounded-xl" />
        <Skeleton className="h-[250px] rounded-xl" />
        <Skeleton className="h-[250px] rounded-xl" />
        <Skeleton className="h-[250px] rounded-xl" />
        <Skeleton className="h-[250px] rounded-xl" />
        <Skeleton className="h-[250px] rounded-xl" />
      </div>
      <Skeleton className="h-[300px] rounded-xl" />
    </div>
  );
}

// Lazy-load WebVitalsDashboard (includes Recharts) - only loads on this route
const WebVitalsDashboard = dynamic(
  () =>
    import("@/app/admin/performance/components/WebVitalsDashboard").then((m) => ({
      default: m.WebVitalsDashboard,
    })),
  {
    ssr: false,
    loading: PerformanceLoadingFallback,
  }
);

export default function AdminPerformancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
            <p className="text-muted-foreground">
              Core Web Vitals monitoring and real user metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
            Real-time RUM
          </span>
        </div>
      </div>
      <WebVitalsDashboard />
    </div>
  );
}
