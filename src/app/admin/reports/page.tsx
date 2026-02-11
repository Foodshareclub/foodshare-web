import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AdminReportsClient } from "@/app/admin/reports/AdminReportsClient";
import { getReportsData } from "@/lib/data/admin-reports";
import { Skeleton } from "@/components/ui/skeleton";

async function ReportsContent() {
  const data = await getReportsData();
  return <AdminReportsClient data={data} />;
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export default async function AdminReportsPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("reports_analytics")}</h1>
        <p className="text-muted-foreground mt-1">
          Platform insights, trends, and performance metrics
        </p>
      </div>

      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsContent />
      </Suspense>
    </div>
  );
}
