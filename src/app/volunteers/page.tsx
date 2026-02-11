import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getProducts } from "@/lib/data/products";
import { VolunteerHero, BecomeVolunteerCTA, VolunteerGrid } from "@/components/volunteers";
import { isDatabaseHealthy } from "@/lib/data/health";

interface PageProps {
  searchParams: Promise<{
    submitted?: string;
  }>;
}

/**
 * Volunteers Page - Server Component
 *
 * Displays approved volunteer postcards with hero section and CTA
 */
export default async function VolunteersPage({ searchParams }: PageProps) {
  // Check DB health first
  const dbHealthy = await isDatabaseHealthy();

  if (!dbHealthy) {
    redirect("/maintenance");
  }

  const params = await searchParams;
  const showSubmissionMessage = params.submitted === "true";

  // Fetch approved volunteers (is_active = true)
  let volunteers: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    volunteers = await getProducts("volunteer");
  } catch {
    redirect("/maintenance");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <VolunteerHero showSubmissionMessage={showSubmissionMessage} />

      {/* Volunteers Grid */}
      <section className="py-8">
        <Suspense fallback={<VolunteersPageSkeleton />}>
          <VolunteerGrid volunteers={volunteers} />
        </Suspense>
      </section>

      {/* Bottom CTA */}
      <BecomeVolunteerCTA />
    </div>
  );
}

function VolunteersPageSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 page-px py-7">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="glass rounded-2xl p-5 animate-pulse">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-muted" />
          </div>
          <div className="flex justify-center mb-2">
            <div className="h-5 w-32 bg-muted rounded" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="h-4 w-40 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
