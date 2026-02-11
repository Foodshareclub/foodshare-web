import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfileSettingsClient } from "./ProfileSettingsClient";
import { getUser } from "@/app/actions/auth";
import { generateNoIndexMetadata } from "@/lib/metadata";

export const metadata = generateNoIndexMetadata(
  "Profile",
  "Manage your FoodShare profile settings"
);

/**
 * Profile Settings Page - Server Component
 * Shows user profile card and settings options
 * Requires authentication
 */
export default async function ProfilePage() {
  const user = await getUser();

  // Redirect if not authenticated
  if (!user) {
    redirect("/auth/login?from=/profile");
  }

  return (
    <Suspense fallback={<ProfileSettingsSkeleton />}>
      <ProfileSettingsClient user={user} />
    </Suspense>
  );
}

/**
 * Skeleton loader for profile settings page
 */
function ProfileSettingsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto max-w-5xl pt-24 pb-12 px-4">
        {/* Page Header Skeleton */}
        <div className="mb-8">
          <div className="h-9 w-56 bg-muted animate-pulse rounded-lg mb-2" />
          <div className="h-5 w-72 bg-muted animate-pulse rounded" />
        </div>

        {/* Profile Header Card Skeleton */}
        <div className="mb-8">
          <div className="rounded-2xl border border-border/40 bg-card/80 p-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Section Title Skeleton */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-5 w-5 bg-muted animate-pulse rounded" />
          <div className="h-5 w-20 bg-muted animate-pulse rounded" />
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Settings Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/40 bg-card/80 p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-muted animate-pulse rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-5 w-5 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
