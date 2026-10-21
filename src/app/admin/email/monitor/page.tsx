import { Skeleton } from "@/components/ui/skeleton";
import { getEmailMonitoringData } from "@/lib/data/admin-email";
import { Suspense } from "react";
import { EmailMonitorClient } from "./EmailMonitorClient";

const MONITOR_CARD_SKELETON_KEYS = ["a", "b", "c"] as const;

function MonitorSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MONITOR_CARD_SKELETON_KEYS.map((k) => (
          <Skeleton key={k} className="h-48 rounded-lg" />
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
