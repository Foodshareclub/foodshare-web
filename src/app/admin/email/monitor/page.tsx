import { Suspense } from "react";
import { EmailMonitorClient } from "./EmailMonitorClient";
import { getEmailMonitoringData } from "@/lib/data/admin-email";
import { Skeleton } from "@/components/ui/skeleton";

function MonitorSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-80 rounded-lg" />
    </div>
  );
}

async function MonitorContent() {
  const data = await getEmailMonitoringData();
  return <EmailMonitorClient initialData={data} />;
}

export default function EmailMonitoringPage() {
  return (
    <Suspense fallback={<MonitorSkeleton />}>
      <MonitorContent />
    </Suspense>
  );
}
