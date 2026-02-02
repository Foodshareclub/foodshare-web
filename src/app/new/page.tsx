import { redirect } from "next/navigation";
import { NewProductForm } from "@/app/food/new/NewProductForm";
import { createClient } from "@/lib/supabase/server";
import { generateNoIndexMetadata } from "@/lib/metadata";
import { checkIsAdmin } from "@/lib/data/auth";

// Force dynamic rendering - auth-required page
export const dynamic = "force-dynamic";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const initialType = params.type || "food";

  // Server-side auth check with redirect
  if (!user) {
    const redirectPath = params.type ? `/new?type=${params.type}` : "/new";
    redirect(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  // Check admin status from user_roles table
  const { isAdmin } = await checkIsAdmin(user.id);

  // Key forces re-mount when type changes, ensuring fresh form state
  return (
    <NewProductForm
      key={initialType}
      userId={user.id}
      isAdmin={isAdmin}
      initialType={initialType}
    />
  );
}
