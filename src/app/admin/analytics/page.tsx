import { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/admin/analytics/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics | FoodShare Admin",
  description: "Platform analytics and insights",
};

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
