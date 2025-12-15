import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PersonalInfoClient } from "./PersonalInfoClient";
import { getUser } from "@/app/actions/auth";
import { generateNoIndexMetadata } from "@/lib/metadata";

export const metadata = generateNoIndexMetadata(
  "Personal Info",
  "Update your personal information"
);

/**
 * Personal Info Settings Page - Server Component
 * Manage user profile information
 * Requires authentication
 */
export default async function PersonalInfoPage() {
  const user = await getUser();

  // Redirect if not authenticated
  if (!user) {
    redirect("/auth/login?from=/settings/personal-info");
  }

  return (
    <Suspense fallback={<PersonalInfoSkeleton />}>
      <PersonalInfoClient user={user} />
    </Suspense>
  );
}

/**
 * Skeleton loader for personal info page
 */
function PersonalInfoSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background pb-10">
      <div className="container mx-auto max-w-3xl px-4 py-6 lg:py-10">
        {/* Back navigation skeleton */}
        <div className="mb-6">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>

        {/* Header Skeleton */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-muted animate-pulse" />
          <div>
            <div className="h-8 w-40 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-56 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          {/* Avatar card */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
              <div className="flex-1">
                <div className="h-5 w-28 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 w-64 bg-muted rounded animate-pulse mb-3" />
                <div className="h-8 w-28 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Info cards */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
                <div className="flex-1">
                  <div className="h-5 w-28 bg-muted rounded animate-pulse mb-3" />
                  <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
