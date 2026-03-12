import { ProductDetailModal } from "./ProductDetailModal";
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
    const { checkUserIsAdmin } = await import("@/app/actions/auth");
    return await checkUserIsAdmin();
  } catch {
    return false;
  }
}

interface InterceptingUserActionsProps {
  product: InitialProductStateType;
}

/**
 * Async Server Component that fetches user/admin data independently
 * and renders the ProductDetailModal with full auth context.
 */
export async function InterceptingUserActions({ product }: InterceptingUserActionsProps) {
  const [user, isAdmin] = await Promise.all([safeGetUser(), safeCheckIsAdmin()]);

  return <ProductDetailModal post={product} user={user} isAdmin={isAdmin} />;
}
