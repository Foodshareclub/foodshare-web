import { redirect } from "next/navigation";
import { NewProductForm } from "@/app/food/new/NewProductForm";
import { getAuthSession } from "@/lib/data/auth";
import { generateNoIndexMetadata } from "@/lib/metadata";

export const metadata = generateNoIndexMetadata(
  "Create New Listing",
  "Share food, items, or volunteer with your community"
);

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

/**
 * Agnostic /new route - renders form directly without "food" in URL
 * Use /new?type=volunteer for volunteer applications
 */
export default async function NewPage({ searchParams }: PageProps) {
  // Use getAuthSession() for consistent auth handling (same as admin layout)
  const session = await getAuthSession();

  const params = await searchParams;
  const initialType = params.type || "food";

  // Server-side auth check with redirect
  if (!session.isAuthenticated || !session.user) {
    const redirectPath = params.type ? `/new?type=${params.type}` : "/new";
    redirect(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  // Pass all required props including profile
  // NOTE: Removed key={initialType} - it was forcing remount and causing auth race conditions
  return (
    <NewProductForm
      userId={session.user.id}
      isAdmin={session.isAdmin}
      initialType={initialType}
      profile={session.user.profile}
    />
  );
}
