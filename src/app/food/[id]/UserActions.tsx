import { PostDetailClient } from "./PostDetailClient";
import type { InitialProductStateType } from "@/types/product.types";

/**
 * Safely get user - only if DB is healthy
 */
async function safeGetUser() {
  try {
    const { getUser } = await import("@/app/actions/auth");
    return await getUser();
  } catch {
    return null;
  }
}

/**
 * Safely check if user is admin
 */
async function safeCheckIsAdmin() {
  try {
    const { checkIsAdmin } = await import("@/app/actions/auth");
    return await checkIsAdmin();
  } catch {
    return false;
  }
}

interface UserActionsProps {
  product: InitialProductStateType;
}

/**
 * Async Server Component that fetches user/admin data independently
 * and renders the PostDetailClient with full auth context.
 *
 * This streams separately from the product data fetch, so the page
 * shell (JSON-LD, layout) can render before auth resolves.
 */
export async function UserActions({ product }: UserActionsProps) {
  const [user, isAdmin] = await Promise.all([safeGetUser(), safeCheckIsAdmin()]);

  return <PostDetailClient post={product} user={user} isAdmin={isAdmin} />;
}
