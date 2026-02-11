import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LanguageRegionClient } from "./LanguageRegionClient";
import { getUser } from "@/app/actions/auth";
import { generateNoIndexMetadata } from "@/lib/metadata";

export const metadata = generateNoIndexMetadata(
  "Language & Region",
  "Customize your language, location, and search preferences"
);

/**
 * Language & Region Settings Page
 * Elegant UI for language selection and location preferences
 */
export default async function LanguageRegionPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login?from=/settings/language");
  }

  return (
    <Suspense fallback={<LanguageRegionSkeleton />}>
      <LanguageRegionClient />
    </Suspense>
  );
}

function LanguageRegionSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-10 max-w-4xl">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-6">
              <div className="h-5 w-32 bg-muted rounded animate-pulse mb-4" />
              <div className="h-4 w-64 bg-muted rounded animate-pulse mb-6" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-12 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
