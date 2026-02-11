/**
 * Shared admin auth guard for email API routes
 * Pattern extracted from sync/route.ts
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkUserIsAdmin } from "@/lib/data/admin-check";

type AdminAuthResult =
  | { authorized: true; userId: string }
  | { authorized: false; response: NextResponse };

export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { isAdmin } = await checkUserIsAdmin(user.id);
  if (!isAdmin) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
    };
  }

  return { authorized: true, userId: user.id };
}
