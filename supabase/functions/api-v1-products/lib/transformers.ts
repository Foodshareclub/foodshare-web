/**
 * Product API v1 Transformers
 */

import { transformCategory, transformProfileSummary } from "../../_shared/transformers.ts";

export function transformProduct(data: Record<string, unknown>) {
  // Return raw database format (snake_case) for web compatibility
  return data;
}

export function transformProductDetail(data: Record<string, unknown>) {
  const base = transformProduct(data);
  const profile = data.profile as Record<string, unknown> | null;
  const category = data.category as Record<string, unknown> | null;

  const profileSummary = transformProfileSummary(profile);
  return {
    ...base,
    user: profileSummary ? { ...profileSummary, memberSince: profile?.created_at ?? null } : null,
    category: transformCategory(category),
  };
}
