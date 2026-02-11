import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AIInsightsClient } from "@/app/admin/ai-insights/AIInsightsClient";
import { getAIInsightsData } from "@/lib/data/admin-ai-insights";
import { Skeleton } from "@/components/ui/skeleton";

async function AIInsightsContent() {
  const data = await getAIInsightsData();
  return <AIInsightsClient initialData={data} />;
}

function AIInsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-[500px] rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default async function AdminAIInsightsPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("ai_insights")}</h1>
        <p className="text-muted-foreground mt-1">
          Powered by AI - Get intelligent insights about your FoodShare platform
        </p>
      </div>

      <Suspense fallback={<AIInsightsSkeleton />}>
        <AIInsightsContent />
      </Suspense>
    </div>
  );
}
