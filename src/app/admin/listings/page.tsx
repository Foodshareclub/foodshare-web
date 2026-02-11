import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getAdminListings, getListingStats } from "@/lib/data/admin-listings";
import { AdminListingsClient } from "@/app/admin/listings/AdminListingsClient";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    category?: string;
    search?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

async function ListingsContent({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters = {
    status: (params.status as "all" | "pending" | "approved") || "all",
    category: params.category || "all",
    search: params.search || "",
    page: parseInt(params.page || "1", 10),
    limit: 20,
    sortBy:
      (params.sortBy as "created_at" | "updated_at" | "post_name" | "post_views") || "created_at",
    sortOrder: (params.sortOrder as "asc" | "desc") || "desc",
  };

  const [listingsResult, stats] = await Promise.all([getAdminListings(filters), getListingStats()]);

  return (
    <AdminListingsClient
      initialListings={listingsResult.listings}
      initialTotal={listingsResult.total}
      initialPage={listingsResult.page}
      totalPages={listingsResult.totalPages}
      stats={stats}
      filters={filters}
    />
  );
}

function ListingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default async function AdminListingsPage({ searchParams }: PageProps) {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("listings_management")}</h1>
        <p className="text-muted-foreground mt-1">{t("review_approve_and_manage_all_listings")}</p>
      </div>

      <Suspense fallback={<ListingsSkeleton />}>
        <ListingsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
