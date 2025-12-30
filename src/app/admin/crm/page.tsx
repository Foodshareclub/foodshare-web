import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { UserCircle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCRMCustomers, getCRMDashboardStats, getCustomerTags } from "@/lib/data/crm";

// Dynamic import for code-splitting (~150KB saved from initial bundle)
const CRMDashboardClient = dynamic(() =>
  import("@/components/admin/crm/CRMDashboardClient").then((mod) => mod.CRMDashboardClient)
);

function CRMSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

async function CRMContent() {
  const [customers, stats, tags] = await Promise.all([
    getCRMCustomers({ includeArchived: false }),
    getCRMDashboardStats(),
    getCustomerTags(),
  ]);

  return <CRMDashboardClient initialCustomers={customers} stats={stats} tags={tags} />;
}

export default async function AdminCRMPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -mt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <UserCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {t("customer_relationship_management")}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              {t("manage_engage_and_grow_your_community")}
            </p>
          </div>
        </div>
      </div>

      {/* CRM Dashboard */}
      <Suspense fallback={<CRMSkeleton />}>
        <CRMContent />
      </Suspense>
    </div>
  );
}
