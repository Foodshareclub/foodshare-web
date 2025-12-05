/**
 * Segment Builder API
 * Advanced segment calculation and query building for dynamic customer segmentation
 */

import { supabase } from "@/lib/supabase/client";
import type { SegmentFilters } from "@/types/campaign.types";

// =============================================================================
// SEGMENT BUILDER FUNCTIONS
// =============================================================================

/**
 * Calculate segment size in real-time
 * Returns the number of customers that match the given filters
 */
export async function calculateSegmentSize(filters: SegmentFilters) {
  try {
    let query = supabase
      .from("crm_customers")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false);

    // Apply filters
    query = applySegmentFilters(query, filters);

    const { count, error } = await query;

    if (error) {
      console.error("Error calculating segment size:", error);
      return { data: null, error };
    }

    return { data: count || 0, error: null };
  } catch (error) {
    console.error("Error calculating segment size:", error);
    return { data: null, error };
  }
}

/**
 * Get sample members from a segment
 * Returns a preview of customers matching the filters
 */
export async function getSampleMembers(filters: SegmentFilters, limit: number = 10) {
  try {
    let query = supabase
      .from("crm_customers")
      .select(
        `
        id,
        profile_id,
        customer_type,
        lifecycle_stage,
        engagement_score,
        churn_risk_score,
        ltv_score,
        total_interactions,
        last_interaction_at,
        profiles:profile_id (
          full_name,
          email,
          avatar_url
        ),
        profile_stats:profile_id (
          items_shared,
          items_received,
          rating_average
        ),
        crm_customer_tag_assignments (
          tag:tag_id (
            id,
            name,
            color
          )
        )
      `
      )
      .eq("is_archived", false);

    // Apply filters
    query = applySegmentFilters(query, filters);

    // Limit results
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching sample members:", error);
      return { data: null, error };
    }

    // Transform data
    interface RawCustomerData {
      id: string;
      profile_id: string;
      customer_type: string;
      lifecycle_stage: string;
      engagement_score: number | null;
      churn_risk_score: number | null;
      ltv_score: number | null;
      total_interactions: number | null;
      last_interaction_at: string | null;
      profiles: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
      profile_stats: { items_shared: number | null; items_received: number | null; rating_average: number | null } | null;
      crm_customer_tag_assignments: Array<{ tag: { id: string; name: string; color: string } | null }> | null;
    }

    const members =
      (data as RawCustomerData[] | null)?.map((customer) => ({
        customer_id: customer.id,
        profile_id: customer.profile_id,
        full_name: customer.profiles?.full_name || "Unknown",
        email: customer.profiles?.email || "",
        avatar_url: customer.profiles?.avatar_url || null,
        customer_type: customer.customer_type,
        lifecycle_stage: customer.lifecycle_stage,
        engagement_score: customer.engagement_score || 0,
        churn_risk_score: customer.churn_risk_score || 0,
        ltv_score: customer.ltv_score || 0,
        items_shared: customer.profile_stats?.items_shared || 0,
        items_received: customer.profile_stats?.items_received || 0,
        rating_average: customer.profile_stats?.rating_average || null,
        tags: customer.crm_customer_tag_assignments?.map((assignment) => assignment.tag).filter(Boolean) || [],
        total_interactions: customer.total_interactions || 0,
        last_interaction_at: customer.last_interaction_at,
      })) || [];

    return { data: members, error: null };
  } catch (error) {
    console.error("Error fetching sample members:", error);
    return { data: null, error };
  }
}

/**
 * Build SQL query from segment filters
 * Generates a human-readable SQL WHERE clause for debugging/display
 */
export function buildSegmentQuery(filters: SegmentFilters): string {
  const conditions: string[] = ["is_archived = false"];

  // Customer type
  if (filters.customer_type && filters.customer_type !== "all") {
    conditions.push(`customer_type = '${filters.customer_type}'`);
  }

  // Lifecycle stage
  if (filters.lifecycle_stage && filters.lifecycle_stage !== "all") {
    conditions.push(`lifecycle_stage = '${filters.lifecycle_stage}'`);
  }

  // Engagement score
  if (filters.engagement_score?.min !== undefined) {
    conditions.push(`engagement_score >= ${filters.engagement_score.min}`);
  }
  if (filters.engagement_score?.max !== undefined) {
    conditions.push(`engagement_score <= ${filters.engagement_score.max}`);
  }

  // Churn risk score
  if (filters.churn_risk_score?.min !== undefined) {
    conditions.push(`churn_risk_score >= ${filters.churn_risk_score.min}`);
  }
  if (filters.churn_risk_score?.max !== undefined) {
    conditions.push(`churn_risk_score <= ${filters.churn_risk_score.max}`);
  }

  // LTV score
  if (filters.ltv_score?.min !== undefined) {
    conditions.push(`ltv_score >= ${filters.ltv_score.min}`);
  }
  if (filters.ltv_score?.max !== undefined) {
    conditions.push(`ltv_score <= ${filters.ltv_score.max}`);
  }

  // Items shared
  if (filters.items_shared?.min !== undefined || filters.items_shared?.max !== undefined) {
    conditions.push("/* Items shared filter (requires JOIN with profile_stats) */");
  }

  // Items received
  if (filters.items_received?.min !== undefined || filters.items_received?.max !== undefined) {
    conditions.push("/* Items received filter (requires JOIN with profile_stats) */");
  }

  // Last interaction
  if (filters.last_interaction?.days_ago_min !== undefined) {
    conditions.push(
      `last_interaction_at <= NOW() - INTERVAL '${filters.last_interaction.days_ago_min} days'`
    );
  }
  if (filters.last_interaction?.days_ago_max !== undefined) {
    conditions.push(
      `last_interaction_at >= NOW() - INTERVAL '${filters.last_interaction.days_ago_max} days'`
    );
  }

  // Tags
  if (filters.tags && filters.tags.length > 0) {
    const operator = filters.tags_operator || "OR";
    conditions.push(
      `/* Tag filter (${operator}): ${filters.tags.join(", ")} (requires JOIN with crm_customer_tag_assignments) */`
    );
  }

  // Reputation score
  if (filters.reputation_score?.min !== undefined || filters.reputation_score?.max !== undefined) {
    conditions.push("/* Reputation score filter (requires JOIN with forum_user_stats) */");
  }

  // Trust level
  if (filters.trust_level && filters.trust_level.length > 0) {
    conditions.push(
      `/* Trust level filter: ${filters.trust_level.join(", ")} (requires JOIN with forum_user_stats) */`
    );
  }

  // Created date range
  if (filters.created_after) {
    conditions.push(`created_at >= '${filters.created_after}'`);
  }
  if (filters.created_before) {
    conditions.push(`created_at <= '${filters.created_before}'`);
  }

  // Custom SQL
  if (filters.custom_sql) {
    conditions.push(`/* Custom SQL: ${filters.custom_sql} */`);
  }

  return `SELECT * FROM crm_customers WHERE ${conditions.join(" AND ")}`;
}

/**
 * Validate segment filters structure
 * Checks if the filters are valid and can be applied
 */
export function validateSegmentFilters(filters: SegmentFilters): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate customer type
  if (filters.customer_type) {
    const validTypes = ["donor", "receiver", "both", "all"];
    if (!validTypes.includes(filters.customer_type)) {
      errors.push(
        `Invalid customer_type: ${filters.customer_type}. Must be one of: ${validTypes.join(", ")}`
      );
    }
  }

  // Validate lifecycle stage
  if (filters.lifecycle_stage) {
    const validStages = ["lead", "active", "champion", "at_risk", "churned", "all"];
    if (!validStages.includes(filters.lifecycle_stage)) {
      errors.push(
        `Invalid lifecycle_stage: ${filters.lifecycle_stage}. Must be one of: ${validStages.join(", ")}`
      );
    }
  }

  // Validate score ranges
  if (filters.engagement_score) {
    if (
      filters.engagement_score.min !== undefined &&
      (filters.engagement_score.min < 0 || filters.engagement_score.min > 100)
    ) {
      errors.push("engagement_score.min must be between 0 and 100");
    }
    if (
      filters.engagement_score.max !== undefined &&
      (filters.engagement_score.max < 0 || filters.engagement_score.max > 100)
    ) {
      errors.push("engagement_score.max must be between 0 and 100");
    }
    if (
      filters.engagement_score.min !== undefined &&
      filters.engagement_score.max !== undefined &&
      filters.engagement_score.min > filters.engagement_score.max
    ) {
      errors.push("engagement_score.min cannot be greater than engagement_score.max");
    }
  }

  // Validate churn risk score
  if (filters.churn_risk_score) {
    if (
      filters.churn_risk_score.min !== undefined &&
      (filters.churn_risk_score.min < 0 || filters.churn_risk_score.min > 100)
    ) {
      errors.push("churn_risk_score.min must be between 0 and 100");
    }
    if (
      filters.churn_risk_score.max !== undefined &&
      (filters.churn_risk_score.max < 0 || filters.churn_risk_score.max > 100)
    ) {
      errors.push("churn_risk_score.max must be between 0 and 100");
    }
    if (
      filters.churn_risk_score.min !== undefined &&
      filters.churn_risk_score.max !== undefined &&
      filters.churn_risk_score.min > filters.churn_risk_score.max
    ) {
      errors.push("churn_risk_score.min cannot be greater than churn_risk_score.max");
    }
  }

  // Validate LTV score
  if (filters.ltv_score) {
    if (
      filters.ltv_score.min !== undefined &&
      (filters.ltv_score.min < 0 || filters.ltv_score.min > 100)
    ) {
      errors.push("ltv_score.min must be between 0 and 100");
    }
    if (
      filters.ltv_score.max !== undefined &&
      (filters.ltv_score.max < 0 || filters.ltv_score.max > 100)
    ) {
      errors.push("ltv_score.max must be between 0 and 100");
    }
    if (
      filters.ltv_score.min !== undefined &&
      filters.ltv_score.max !== undefined &&
      filters.ltv_score.min > filters.ltv_score.max
    ) {
      errors.push("ltv_score.min cannot be greater than ltv_score.max");
    }
  }

  // Validate items shared
  if (filters.items_shared) {
    if (filters.items_shared.min !== undefined && filters.items_shared.min < 0) {
      errors.push("items_shared.min must be >= 0");
    }
    if (filters.items_shared.max !== undefined && filters.items_shared.max < 0) {
      errors.push("items_shared.max must be >= 0");
    }
    if (
      filters.items_shared.min !== undefined &&
      filters.items_shared.max !== undefined &&
      filters.items_shared.min > filters.items_shared.max
    ) {
      errors.push("items_shared.min cannot be greater than items_shared.max");
    }
  }

  // Validate items received
  if (filters.items_received) {
    if (filters.items_received.min !== undefined && filters.items_received.min < 0) {
      errors.push("items_received.min must be >= 0");
    }
    if (filters.items_received.max !== undefined && filters.items_received.max < 0) {
      errors.push("items_received.max must be >= 0");
    }
    if (
      filters.items_received.min !== undefined &&
      filters.items_received.max !== undefined &&
      filters.items_received.min > filters.items_received.max
    ) {
      errors.push("items_received.min cannot be greater than items_received.max");
    }
  }

  // Validate last interaction
  if (filters.last_interaction) {
    if (
      filters.last_interaction.days_ago_min !== undefined &&
      filters.last_interaction.days_ago_min < 0
    ) {
      errors.push("last_interaction.days_ago_min must be >= 0");
    }
    if (
      filters.last_interaction.days_ago_max !== undefined &&
      filters.last_interaction.days_ago_max < 0
    ) {
      errors.push("last_interaction.days_ago_max must be >= 0");
    }
    if (
      filters.last_interaction.days_ago_min !== undefined &&
      filters.last_interaction.days_ago_max !== undefined &&
      filters.last_interaction.days_ago_min < filters.last_interaction.days_ago_max
    ) {
      errors.push(
        "last_interaction.days_ago_min should be >= days_ago_max (more recent is smaller number)"
      );
    }
  }

  // Validate tags operator
  if (filters.tags_operator) {
    const validOperators = ["AND", "OR"];
    if (!validOperators.includes(filters.tags_operator)) {
      errors.push(
        `Invalid tags_operator: ${filters.tags_operator}. Must be one of: ${validOperators.join(", ")}`
      );
    }
  }

  // Validate date ranges
  if (filters.created_after && filters.created_before) {
    const after = new Date(filters.created_after);
    const before = new Date(filters.created_before);
    if (after > before) {
      errors.push("created_after cannot be later than created_before");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Apply segment filters to a Supabase query
 * Internal helper function to consistently apply filters across all queries
 */
function applySegmentFilters<T>(
  query: ReturnType<typeof supabase.from<"crm_customers">>,
  filters: SegmentFilters
): ReturnType<typeof supabase.from<"crm_customers">> {
  // Customer type
  if (filters.customer_type && filters.customer_type !== "all") {
    query = query.eq("customer_type", filters.customer_type);
  }

  // Lifecycle stage
  if (filters.lifecycle_stage && filters.lifecycle_stage !== "all") {
    query = query.eq("lifecycle_stage", filters.lifecycle_stage);
  }

  // Engagement score
  if (filters.engagement_score?.min !== undefined) {
    query = query.gte("engagement_score", filters.engagement_score.min);
  }
  if (filters.engagement_score?.max !== undefined) {
    query = query.lte("engagement_score", filters.engagement_score.max);
  }

  // Churn risk score
  if (filters.churn_risk_score?.min !== undefined) {
    query = query.gte("churn_risk_score", filters.churn_risk_score.min);
  }
  if (filters.churn_risk_score?.max !== undefined) {
    query = query.lte("churn_risk_score", filters.churn_risk_score.max);
  }

  // LTV score
  if (filters.ltv_score?.min !== undefined) {
    query = query.gte("ltv_score", filters.ltv_score.min);
  }
  if (filters.ltv_score?.max !== undefined) {
    query = query.lte("ltv_score", filters.ltv_score.max);
  }

  // Total interactions
  if (filters.items_shared?.min !== undefined || filters.items_shared?.max !== undefined) {
    // Note: items_shared requires JOIN with profile_stats
    // For now, we'll skip this filter in the direct query
    // This should be handled by a more sophisticated query builder
  }

  if (filters.items_received?.min !== undefined || filters.items_received?.max !== undefined) {
    // Note: items_received requires JOIN with profile_stats
    // For now, we'll skip this filter in the direct query
  }

  // Last interaction
  if (filters.last_interaction?.days_ago_min !== undefined) {
    const date = new Date();
    date.setDate(date.getDate() - filters.last_interaction.days_ago_min);
    query = query.lte("last_interaction_at", date.toISOString());
  }
  if (filters.last_interaction?.days_ago_max !== undefined) {
    const date = new Date();
    date.setDate(date.getDate() - filters.last_interaction.days_ago_max);
    query = query.gte("last_interaction_at", date.toISOString());
  }

  // Created date range
  if (filters.created_after) {
    query = query.gte("created_at", filters.created_after);
  }
  if (filters.created_before) {
    query = query.lte("created_at", filters.created_before);
  }

  // Note: Tags, reputation_score, trust_level require JOINs
  // These are handled separately in the getSampleMembers function

  return query;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const segmentBuilderAPI = {
  calculateSegmentSize,
  getSampleMembers,
  buildSegmentQuery,
  validateSegmentFilters,
};
