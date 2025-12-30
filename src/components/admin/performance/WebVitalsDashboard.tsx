"use client";

/**
 * Web Vitals Dashboard
 * Real-time Core Web Vitals monitoring for admin users
 * Part of Phase 5: Observability & Architecture Hardening
 */

import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WEB_VITALS_THRESHOLDS } from "@/lib/config";

// Lazy load Recharts for code splitting
const LazyLineChart = lazy(() => import("recharts").then((mod) => ({ default: mod.LineChart })));
const LazyLine = lazy(() => import("recharts").then((mod) => ({ default: mod.Line })));
const LazyXAxis = lazy(() => import("recharts").then((mod) => ({ default: mod.XAxis })));
const LazyYAxis = lazy(() => import("recharts").then((mod) => ({ default: mod.YAxis })));
const LazyTooltip = lazy(() => import("recharts").then((mod) => ({ default: mod.Tooltip })));
const LazyResponsiveContainer = lazy(() =>
  import("recharts").then((mod) => ({ default: mod.ResponsiveContainer }))
);

interface WebVitalsSummary {
  metric_name: string;
  sample_count: number;
  p50: number;
  p75: number;
  p95: number;
  good_pct: number;
  needs_improvement_pct: number;
  poor_pct: number;
}

interface PageMetrics {
  page_url: string;
  lcp_p75: number | null;
  fid_p75: number | null;
  cls_p75: number | null;
  inp_p75: number | null;
  sample_count: number;
}

interface TrendData {
  hour: string;
  p50: number;
  p75: number;
  p95: number;
  sample_count: number;
}

// Metric descriptions for tooltips
const METRIC_INFO: Record<string, { name: string; unit: string; description: string }> = {
  LCP: { name: "Largest Contentful Paint", unit: "ms", description: "Loading performance" },
  FID: { name: "First Input Delay", unit: "ms", description: "Interactivity" },
  CLS: { name: "Cumulative Layout Shift", unit: "", description: "Visual stability" },
  INP: { name: "Interaction to Next Paint", unit: "ms", description: "Responsiveness" },
  TTFB: { name: "Time to First Byte", unit: "ms", description: "Server response" },
  FCP: { name: "First Contentful Paint", unit: "ms", description: "Initial render" },
};

function getRatingColor(rating: "good" | "needs-improvement" | "poor"): string {
  switch (rating) {
    case "good":
      return "text-green-600 bg-green-100";
    case "needs-improvement":
      return "text-yellow-600 bg-yellow-100";
    case "poor":
      return "text-red-600 bg-red-100";
  }
}

function getMetricRating(name: string, value: number): "good" | "needs-improvement" | "poor" {
  const thresholds = WEB_VITALS_THRESHOLDS[name as keyof typeof WEB_VITALS_THRESHOLDS];
  if (!thresholds) return "good";

  if (value <= thresholds.good) return "good";
  if (value <= thresholds.poor) return "needs-improvement";
  return "poor";
}

function formatValue(name: string, value: number): string {
  if (name === "CLS") return value.toFixed(3);
  return `${Math.round(value)}ms`;
}

// =============================================================================
// Data Fetching Hooks
// =============================================================================

function useWebVitalsSummary(hours: number = 24) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["admin", "web-vitals", "summary", hours],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_web_vitals_summary", {
        p_hours: hours,
      });
      if (error) throw error;
      return data as WebVitalsSummary[];
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

function useWebVitalsByPage(hours: number = 24) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["admin", "web-vitals", "by-page", hours],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_web_vitals_by_page", {
        p_hours: hours,
        p_limit: 10,
      });
      if (error) throw error;
      return data as PageMetrics[];
    },
    staleTime: 60 * 1000,
  });
}

function useWebVitalsTrend(metric: string, hours: number = 24) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["admin", "web-vitals", "trend", metric, hours],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_web_vitals_trend", {
        p_metric: metric,
        p_hours: hours,
      });
      if (error) throw error;
      return data as TrendData[];
    },
    staleTime: 60 * 1000,
  });
}

// =============================================================================
// Components
// =============================================================================

function MetricCard({ metric }: { metric: WebVitalsSummary }) {
  const info = METRIC_INFO[metric.metric_name];
  const rating = getMetricRating(metric.metric_name, metric.p75);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{metric.metric_name}</CardTitle>
          <Badge className={getRatingColor(rating)} variant="secondary">
            {rating}
          </Badge>
        </div>
        <CardDescription>{info?.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main metric value */}
          <div className="text-center">
            <div className="text-3xl font-bold">{formatValue(metric.metric_name, metric.p75)}</div>
            <div className="text-sm text-muted-foreground">P75</div>
          </div>

          {/* Percentile breakdown */}
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <div className="font-medium">{formatValue(metric.metric_name, metric.p50)}</div>
              <div className="text-muted-foreground">P50</div>
            </div>
            <div>
              <div className="font-medium">{formatValue(metric.metric_name, metric.p75)}</div>
              <div className="text-muted-foreground">P75</div>
            </div>
            <div>
              <div className="font-medium">{formatValue(metric.metric_name, metric.p95)}</div>
              <div className="text-muted-foreground">P95</div>
            </div>
          </div>

          {/* Rating distribution */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-green-600">Good</span>
              <span>{metric.good_pct?.toFixed(1) ?? 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden flex">
              <div className="bg-green-500 h-full" style={{ width: `${metric.good_pct ?? 0}%` }} />
              <div
                className="bg-yellow-500 h-full"
                style={{ width: `${metric.needs_improvement_pct ?? 0}%` }}
              />
              <div className="bg-red-500 h-full" style={{ width: `${metric.poor_pct ?? 0}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{metric.sample_count} samples</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendChart({ metric, hours }: { metric: string; hours: number }) {
  const { data, isLoading } = useWebVitalsTrend(metric, hours);

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        No trend data available
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map((d) => ({
    ...d,
    hour: new Date(d.hour).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }));

  return (
    <Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
      <LazyResponsiveContainer width="100%" height={200}>
        <LazyLineChart data={chartData}>
          <LazyXAxis dataKey="hour" tick={{ fontSize: 12 }} />
          <LazyYAxis tick={{ fontSize: 12 }} />
          <LazyTooltip />
          <LazyLine type="monotone" dataKey="p75" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <LazyLine type="monotone" dataKey="p50" stroke="#22c55e" strokeWidth={1} dot={false} />
        </LazyLineChart>
      </LazyResponsiveContainer>
    </Suspense>
  );
}

function PageMetricsTable() {
  const { data, isLoading } = useWebVitalsByPage(24);

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">No page-level metrics available</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-2">Page</th>
            <th className="text-right py-2 px-2">LCP</th>
            <th className="text-right py-2 px-2">CLS</th>
            <th className="text-right py-2 px-2">INP</th>
            <th className="text-right py-2 px-2">Samples</th>
          </tr>
        </thead>
        <tbody>
          {data.map((page) => (
            <tr key={page.page_url} className="border-b hover:bg-muted/50">
              <td className="py-2 px-2 font-mono text-xs truncate max-w-[200px]">
                {page.page_url}
              </td>
              <td className="text-right py-2 px-2">
                {page.lcp_p75 ? (
                  <Badge
                    variant="secondary"
                    className={getRatingColor(getMetricRating("LCP", page.lcp_p75))}
                  >
                    {Math.round(page.lcp_p75)}ms
                  </Badge>
                ) : (
                  "-"
                )}
              </td>
              <td className="text-right py-2 px-2">
                {page.cls_p75 ? (
                  <Badge
                    variant="secondary"
                    className={getRatingColor(getMetricRating("CLS", page.cls_p75))}
                  >
                    {page.cls_p75.toFixed(3)}
                  </Badge>
                ) : (
                  "-"
                )}
              </td>
              <td className="text-right py-2 px-2">
                {page.inp_p75 ? (
                  <Badge
                    variant="secondary"
                    className={getRatingColor(getMetricRating("INP", page.inp_p75))}
                  >
                    {Math.round(page.inp_p75)}ms
                  </Badge>
                ) : (
                  "-"
                )}
              </td>
              <td className="text-right py-2 px-2 text-muted-foreground">{page.sample_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// Main Dashboard
// =============================================================================

export function WebVitalsDashboard() {
  const { data: summary, isLoading, error } = useWebVitalsSummary(24);

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Web Vitals</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[250px]" />
          ))}
        </div>
      </div>
    );
  }

  // Order metrics by importance
  const orderedMetrics = ["LCP", "INP", "CLS", "FCP", "TTFB"];
  const sortedSummary = orderedMetrics
    .map((name) => summary?.find((m) => m.metric_name === name))
    .filter(Boolean) as WebVitalsSummary[];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedSummary.map((metric) => (
          <MetricCard key={metric.metric_name} metric={metric} />
        ))}
      </div>

      {/* Trends and Details */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="pages">By Page</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">LCP Trend (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart metric="LCP" hours={24} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">INP Trend (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart metric="INP" hours={24} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Page-Level Performance</CardTitle>
              <CardDescription>
                P75 metrics for top pages by sample count (last 24 hours)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PageMetricsTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WebVitalsDashboard;
