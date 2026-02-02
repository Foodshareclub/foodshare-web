import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/data/auth";
import { generateNoIndexMetadata } from "@/lib/metadata";
import { AdminSidebar, AdminMobileHeader } from "@/components/admin/AdminSidebar";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";

// Force dynamic rendering - never cache admin auth checks
export const dynamic = "force-dynamic";

export const metadata = generateNoIndexMetadata(
  "Admin Dashboard",
  "FoodShare administration panel"
);

/**
 * Admin Layout with Server-Side Protection
 * Defense-in-depth: Even if middleware is bypassed, this check runs on every admin page render
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();

  // Redirect to login if not authenticated
  if (!session.isAuthenticated) {
    redirect("/auth/login?next=/admin");
  }

  // Redirect to home if not admin
  if (!session.isAdmin) {
    redirect("/");
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-muted/30 overflow-hidden">
      {/* Mobile header with drawer */}
      <AdminMobileHeader />

      {/* Desktop sidebar */}
      <AdminSidebar />

      <main className="flex-1 min-h-0 flex flex-col">
        <div className="flex-shrink-0 px-4 md:px-6 pt-4">
          <AdminBreadcrumb />
        </div>
        <div className="flex-1 min-h-0 px-4 md:px-6 pb-6">{children}</div>
      </main>
    </div>
  );
}
