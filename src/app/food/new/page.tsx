import { redirect } from "next/navigation";
import { NewProductForm } from "./NewProductForm";
import { createClient } from "@/lib/supabase/server";
import { generateNoIndexMetadata } from "@/lib/metadata";
import { checkIsAdmin } from "@/lib/data/auth";

// Force dynamic rendering - auth-required page
export const dynamic = "force-dynamic";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const initialType = params.type || "food";

  // Server-side auth check with redirect (no flash of content)
  if (!user) {
    const redirectPath = params.type ? `/new?type=${params.type}` : "/food/new";
    redirect(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  // Check admin status from user_roles table
  const { isAdmin } = await checkIsAdmin(user.id);

  return <NewProductForm userId={user.id} isAdmin={isAdmin} initialType={initialType} />;
}
