"use client";

/**
 * AIInsightsClient - AI-powered insights dashboard
 */

import { Users, Package, MessageSquare, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GrokAssistant } from "@/components/admin/GrokAssistant";
import type { AIInsightsData } from "@/lib/data/admin-ai-insights";

interface Props {
  initialData: AIInsightsData;
}

export function AIInsightsClient({ initialData }: Props) {
  const data = initialData;

  const activeUserPercent =
    data.totalUsers > 0 ? ((data.activeUsers7d / data.totalUsers) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Users (7d)"
          value={data.activeUsers7d}
          subtitle={`${activeUserPercent}% of total`}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Churn Risk"
          value={`${data.churnRate.toFixed(1)}%`}
          subtitle={`${data.atRiskUsers} users inactive`}
          icon={AlertTriangle}
          color={data.churnRate > 20 ? "red" : "green"}
        />
        <StatCard
          label="Active Listings"
          value={data.activeListings}
          subtitle={`${data.newListings7d} new this week`}
          icon={Package}
          color="purple"
        />
        <StatCard
          label="Total Chats"
          value={data.totalChats}
          subtitle={`${data.newChats7d} new this week`}
          icon={MessageSquare}
          color="green"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2 h-[500px]">
          <GrokAssistant />
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Tips */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-foreground">Pro Tips</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                <span>Ask specific questions for better insights</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                <span>Insights are cached for 1 hour to save credits</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                <span>Request predictions and recommendations</span>
              </li>
            </ul>
          </div>

          {/* Example Questions */}
          <div className="bg-background rounded-lg border border-border p-4">
            <h3 className="font-semibold text-foreground mb-3">Example Questions</h3>
            <ul className="space-y-2 text-sm">
              <li className="p-2 bg-muted rounded hover:bg-muted/80 cursor-pointer text-muted-foreground">
                &quot;What time should I send emails for best engagement?&quot;
              </li>
              <li className="p-2 bg-muted rounded hover:bg-muted/80 cursor-pointer text-muted-foreground">
                &quot;Which food categories are trending?&quot;
              </li>
              <li className="p-2 bg-muted rounded hover:bg-muted/80 cursor-pointer text-muted-foreground">
                &quot;How can I reduce user churn?&quot;
              </li>
              <li className="p-2 bg-muted rounded hover:bg-muted/80 cursor-pointer text-muted-foreground">
                &quot;Predict next week&apos;s listing volume&quot;
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  subtitle: string;
  icon: React.ElementType;
  color: "blue" | "green" | "purple" | "red";
}) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    green:
      "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
    purple:
      "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  };

  return (
    <div className={cn("rounded-lg border p-4", colorClasses[color])}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-80">{label}</span>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-sm opacity-70">{subtitle}</div>
    </div>
  );
}
