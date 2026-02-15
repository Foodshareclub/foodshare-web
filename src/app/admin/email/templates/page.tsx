"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamic import: ~150KB+ saved (25 lucide icons, template hooks, preview logic)
const EmailTemplatesClient = dynamic(
  () => import("./EmailTemplatesClient"),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 space-y-4" aria-busy="true" aria-label="Loading templates">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    ),
  }
);

export default function EmailTemplatesPage() {
  return <EmailTemplatesClient />;
}
