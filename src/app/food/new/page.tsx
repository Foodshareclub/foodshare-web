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

/**
 * New Product Page - Server Component
 * Handles authentication check server-side with redirect
 */
export default async function NewProductPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Server-side auth check with redirect (no flash of content)
  if (!user) {
    redirect("/auth/login?redirect=/food/new");
  }

  // Check admin status from user_roles table
  const { isAdmin } = await checkIsAdmin(user.id);

  return <NewProductForm userId={user.id} isAdmin={isAdmin} />;
}
