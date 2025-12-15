import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginSecurityClient } from "./LoginSecurityClient";
import { getUser, checkIsAdmin } from "@/app/actions/auth";
import { generateNoIndexMetadata } from "@/lib/metadata";

export const metadata = generateNoIndexMetadata(
  "Login & Security",
  "Manage your password and security settings"
);

/**
 * Login & Security Settings Page - Server Component
 * Manage password, MFA, and account security
 * Requires authentication
 */
export default async function LoginAndSecurityPage() {
  const [user, isAdmin] = await Promise.all([getUser(), checkIsAdmin()]);

  // Redirect if not authenticated
  if (!user) {
    redirect("/auth/login?from=/settings/login-and-security");
  }

  return (
    <Suspense fallback={<LoginSecuritySkeleton />}>
      <LoginSecurityClient user={user} isAdmin={isAdmin} />
    </Suspense>
  );
}

/**
 * Skeleton loader for login & security page
 */
function LoginSecuritySkeleton() {
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
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          {/* Password card */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
              <div className="flex-1">
                <div className="h-5 w-24 bg-muted rounded animate-pulse mb-3" />
                <div className="h-4 w-64 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Security tips card */}
          <div className="rounded-xl border border-border/50 bg-card/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
              <div className="h-5 w-28 bg-muted rounded animate-pulse" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted animate-pulse" />
                  <div className="h-4 w-full max-w-sm bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
