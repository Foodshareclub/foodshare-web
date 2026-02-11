import { redirect } from "next/navigation";
import { NewProductForm } from "./NewProductForm";
import { getAuthSession } from "@/lib/data/auth";
import { generateNoIndexMetadata } from "@/lib/metadata";

export const metadata = generateNoIndexMetadata(
  "Create New Listing",
  "Share food or items with your community"
);

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

/**
 * New Product Page - Server Component
 * Handles authentication check server-side with redirect
 * Accepts ?type= query param to pre-select category (e.g., ?type=volunteer)
 */
export default async function NewProductPage({ searchParams }: PageProps) {
  // Use getAuthSession() for consistent auth handling (same as admin layout)
  const session = await getAuthSession();

  const params = await searchParams;
  const initialType = params.type || "food";

  // Server-side auth check with redirect (no flash of content)
  if (!session.isAuthenticated || !session.user) {
    const redirectPath = params.type ? `/new?type=${params.type}` : "/food/new";
    redirect(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  // Pass all required props including profile
  return (
    <NewProductForm
      userId={session.user.id}
      isAdmin={session.isAdmin}
      initialType={initialType}
      profile={session.user.profile}
    />
  );
}
