import { redirect } from "next/navigation";
import { Suspense } from "react";
import { UserListingsClient } from "./UserListingsClient";
import { getUser } from "@/app/actions/auth";
import { getUserProducts } from "@/lib/data/products";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import { noIndexMetadata } from "@/lib/metadata";

// Route segment config for caching
export const revalidate = 60;

// Private page - should not be indexed
export const metadata = noIndexMetadata;

/**
 * User Listings Page - Server Component
 * Shows all listings created by the current user
 * Requires authentication
 */
export default async function UserListingsPage() {
  const user = await getUser();

  // Redirect if not authenticated
  if (!user) {
    redirect("/auth/login?from=/user-listings");
  }

  // Fetch user's listings
  const listings = await getUserProducts(user.id);

  return (
    <Suspense fallback={<UserListingsSkeleton />}>
      <UserListingsClient listings={listings} user={user} />
    </Suspense>
  );
}

/**
 * Skeleton loader for user listings page
 */
function UserListingsSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <div className="container mx-auto max-w-6xl pt-24 pb-12 px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>

        {/* Grid skeleton */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} isLoaded={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
