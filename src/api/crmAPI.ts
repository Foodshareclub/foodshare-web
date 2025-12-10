/**
 * CRM API
 * Supabase API calls for Customer Relationship Management
 */

import { supabase } from "@/lib/supabase/client";
import type {
  CRMCustomer,
  CRMCustomerWithProfile,
  CRMCustomerNote,
  CRMCustomerNoteWithAdmin,
  CRMCustomerTag,
  CRMCustomerSummary,
  CRMDashboardStats,
  CreateCustomerNotePayload,
  UpdateCustomerNotePayload,
  CreateCustomerTagPayload,
  UpdateCustomerTagPayload,
  AssignCustomerTagsPayload,
  ArchiveCustomerPayload,
  UpdateCustomerPreferencesPayload,
  CRMCustomersFilter,
} from "@/types/crm.types";
import { createLogger } from "@/lib/logger";

const logger = createLogger("CRMAPI");

// =============================================================================
// CUSTOMERS
// =============================================================================

/**
 * Fetch all CRM customers with profile data
 */
export async function fetchCRMCustomers(filters?: Partial<CRMCustomersFilter>) {
  let query = supabase.from("crm_customers").select(`
      *,
      profiles:profile_id (
        id,
        first_name,
        second_name,
        email,
        avatar_url
      ),
      profile_stats:profile_id (
        items_shared,
        items_received,
        rating_average
      ),
      forum_user_stats:profile_id (
        reputation_score,
        trust_level
      ),
      crm_customer_tag_assignments (
        tag:tag_id (
          id,
          name,
          color,
          description,
          is_system
        )
      )
    `);

  // Apply filters
  if (filters) {
    if (!filters.includeArchived) {
      query = query.eq("is_archived", false);
    }

    if (filters.customerType && filters.customerType !== "all") {
      query = query.eq("customer_type", filters.customerType);
    }

    if (filters.lifecycleStage && filters.lifecycleStage !== "all") {
      query = query.eq("lifecycle_stage", filters.lifecycleStage);
    }

    if (filters.engagementScoreMin !== undefined) {
      query = query.gte("engagement_score", filters.engagementScoreMin);
    }

    if (filters.engagementScoreMax !== undefined) {
      query = query.lte("engagement_score", filters.engagementScoreMax);
    }

    if (filters.churnRiskMin !== undefined) {
      query = query.gte("churn_risk_score", filters.churnRiskMin);
    }

    if (filters.churnRiskMax !== undefined) {
      query = query.lte("churn_risk_score", filters.churnRiskMax);
    }

    if (filters.searchTerm) {
      // Search is handled by filtering results after fetch
      // because we need to search in joined tables
    }

    if (filters.sortBy) {
      query = query.order(filters.sortBy, { ascending: filters.sortOrder === "asc" });
    }
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching CRM customers", error);
    return { data: null, error };
  }

  // Raw customer type from Supabase query
  interface RawCustomer extends CRMCustomer {
    profiles?: { id: string; first_name: string; second_name: string; email: string; avatar_url: string | null };
    profile_stats?: { items_shared: number; items_received: number; rating_average: number | null };
    forum_user_stats?: { reputation_score: number; trust_level: number };
    crm_customer_tag_assignments?: Array<{ tag: CRMCustomerTag }>;
  }

  // Transform data to match CRMCustomerWithProfile interface
  const customers: CRMCustomerWithProfile[] =
    data?.map((customer: RawCustomer) => ({
      ...customer,
      full_name: [customer.profiles?.first_name, customer.profiles?.second_name].filter(Boolean).join(' ') || "",
      email: customer.profiles?.email || "",
      avatar_url: customer.profiles?.avatar_url || null,
      items_shared: customer.profile_stats?.items_shared || 0,
      items_received: customer.profile_stats?.items_received || 0,
      rating_average: customer.profile_stats?.rating_average || null,
      forum_reputation: customer.forum_user_stats?.reputation_score || 0,
      trust_level: customer.forum_user_stats?.trust_level || 0,
      tags: customer.crm_customer_tag_assignments?.map((assignment) => assignment.tag) || [],
    })) || [];

  // Apply search filter if provided
  let filteredCustomers = customers;
  if (filters?.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase();
    filteredCustomers = customers.filter(
      (customer) =>
        customer.full_name?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower)
    );
  }

  return { data: filteredCustomers, error: null };
}

/**
 * Fetch single customer summary
 */
export async function fetchCustomerSummary(customerId: string) {
  const { data, error } = await supabase.rpc("get_crm_customer_summary", {
    p_customer_id: customerId,
  });

  if (error) {
    logger.error("Error fetching customer summary", error);
    return { data: null, error };
  }

  return { data: (data?.[0] as CRMCustomerSummary) || null, error: null };
}

/**
 * Update customer metrics (recalculate engagement, churn risk, etc.)
 */
export async function updateCustomerMetrics(profileId: string) {
  const { data, error } = await supabase.rpc("update_crm_customer_metrics", {
    p_profile_id: profileId,
  });

  if (error) {
    logger.error("Error updating customer metrics", error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Archive customer
 */
export async function archiveCustomer(payload: ArchiveCustomerPayload) {
  const { data, error } = await supabase.rpc("archive_crm_customer", {
    p_customer_id: payload.customer_id,
    p_reason: payload.reason || null,
  });

  if (error) {
    logger.error("Error archiving customer", error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Unarchive customer
 */
export async function unarchiveCustomer(customerId: string) {
  const { data, error } = await supabase.rpc("unarchive_crm_customer", {
    p_customer_id: customerId,
  });

  if (error) {
    logger.error("Error unarchiving customer", error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Update customer preferences
 */
export async function updateCustomerPreferences(payload: UpdateCustomerPreferencesPayload) {
  const { data, error } = await supabase
    .from("crm_customers")
    .update({
      preferred_contact_method: payload.preferred_contact_method,
    })
    .eq("id", payload.customer_id)
    .select()
    .single();

  if (error) {
    logger.error("Error updating customer preferences", error);
    return { data: null, error };
  }

  return { data, error: null };
}

// =============================================================================
// CUSTOMER NOTES
// =============================================================================

/**
 * Fetch notes for a customer
 */
export async function fetchCustomerNotes(customerId: string) {
  const { data, error } = await supabase
    .from("crm_customer_notes")
    .select(
      `
      *,
      admin:admin_id (
        id,
        first_name,
        second_name,
        email,
        avatar_url
      )
    `
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error fetching customer notes", error);
    return { data: null, error };
  }

  // Raw note type from Supabase query
  interface RawNote extends CRMCustomerNote {
    admin?: { id: string; first_name: string; second_name: string; email: string; avatar_url: string | null };
  }

  // Transform data
  const notes: CRMCustomerNoteWithAdmin[] =
    data?.map((note: RawNote) => ({
      ...note,
      admin_name: [note.admin?.first_name, note.admin?.second_name].filter(Boolean).join(' ') || "",
      admin_email: note.admin?.email || "",
      admin_avatar_url: note.admin?.avatar_url || null,
    })) || [];

  return { data: notes, error: null };
}

/**
 * Create customer note
 */
export async function createCustomerNote(payload: CreateCustomerNotePayload) {
  const { data: session } = await supabase.auth.getSession();
  const adminId = session?.session?.user?.id;

  if (!adminId) {
    return { data: null, error: { message: "Not authenticated" } };
  }

  const { data, error } = await supabase
    .from("crm_customer_notes")
    .insert({
      customer_id: payload.customer_id,
      admin_id: adminId,
      note_text: payload.note_text,
      note_type: payload.note_type,
      is_pinned: payload.is_pinned || false,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating customer note", error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Update customer note
 */
export async function updateCustomerNote(payload: UpdateCustomerNotePayload) {
  const updateData: Partial<Pick<CRMCustomerNote, 'note_text' | 'note_type' | 'is_pinned'>> = {};

  if (payload.note_text !== undefined) updateData.note_text = payload.note_text;
  if (payload.note_type !== undefined) updateData.note_type = payload.note_type;
  if (payload.is_pinned !== undefined) updateData.is_pinned = payload.is_pinned;

  const { data, error } = await supabase
    .from("crm_customer_notes")
    .update(updateData)
    .eq("id", payload.note_id)
    .select()
    .single();

  if (error) {
    logger.error("Error updating customer note", error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Delete customer note
 */
export async function deleteCustomerNote(noteId: string) {
  const { error } = await supabase.from("crm_customer_notes").delete().eq("id", noteId);

  if (error) {
    logger.error("Error deleting customer note", error);
    return { data: null, error };
  }

  return { data: true, error: null };
}

// =============================================================================
// CUSTOMER TAGS
// =============================================================================

/**
 * Fetch all customer tags
 */
export async function fetchCustomerTags() {
  const { data, error } = await supabase.from("crm_customer_tags").select("*").order("name");

  if (error) {
    logger.error("Error fetching customer tags", error);
    return { data: null, error };
  }

  return { data: data as CRMCustomerTag[], error: null };
}

/**
 * Create customer tag
 */
export async function createCustomerTag(payload: CreateCustomerTagPayload) {
  const { data, error } = await supabase
    .from("crm_customer_tags")
    .insert({
      name: payload.name,
      color: payload.color,
      description: payload.description || null,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating customer tag", error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Update customer tag
 */
export async function updateCustomerTag(payload: UpdateCustomerTagPayload) {
  const updateData: Partial<Pick<CRMCustomerTag, 'name' | 'color' | 'description'>> = {};

  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.color !== undefined) updateData.color = payload.color;
  if (payload.description !== undefined) updateData.description = payload.description;

  const { data, error } = await supabase
    .from("crm_customer_tags")
    .update(updateData)
    .eq("id", payload.tag_id)
    .eq("is_system", false) // Can only update non-system tags
    .select()
    .single();

  if (error) {
    logger.error("Error updating customer tag", error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Delete customer tag
 */
export async function deleteCustomerTag(tagId: string) {
  const { error } = await supabase
    .from("crm_customer_tags")
    .delete()
    .eq("id", tagId)
    .eq("is_system", false); // Can only delete non-system tags

  if (error) {
    logger.error("Error deleting customer tag", error);
    return { data: null, error };
  }

  return { data: true, error: null };
}

/**
 * Assign tags to customer
 */
export async function assignCustomerTags(payload: AssignCustomerTagsPayload) {
  const { data: session } = await supabase.auth.getSession();
  const adminId = session?.session?.user?.id;

  if (!adminId) {
    return { data: null, error: { message: "Not authenticated" } };
  }

  // First, remove all existing tag assignments
  await supabase
    .from("crm_customer_tag_assignments")
    .delete()
    .eq("customer_id", payload.customer_id);

  // Then, insert new tag assignments
  if (payload.tag_ids.length > 0) {
    const assignments = payload.tag_ids.map((tagId) => ({
      customer_id: payload.customer_id,
      tag_id: tagId,
      assigned_by: adminId,
    }));

    const { data, error } = await supabase
      .from("crm_customer_tag_assignments")
      .insert(assignments)
      .select();

    if (error) {
      logger.error("Error assigning customer tags", error);
      return { data: null, error };
    }

    return { data, error: null };
  }

  return { data: [], error: null };
}

// =============================================================================
// DASHBOARD STATS
// =============================================================================

/**
 * Fetch CRM dashboard statistics
 */
export async function fetchCRMDashboardStats() {
  try {
    // Fetch total customers
    const { count: totalCustomers } = await supabase
      .from("crm_customers")
      .select("*", { count: "exact", head: true })
      .eq("is_archived", false);

    // Fetch lifecycle stage counts
    const { data: lifecycleData } = await supabase
      .from("crm_customers")
      .select("lifecycle_stage")
      .eq("is_archived", false);

    const lifecycleCounts = {
      lead: 0,
      active: 0,
      champion: 0,
      at_risk: 0,
      churned: 0,
    };

    lifecycleData?.forEach((item: { lifecycle_stage: string }) => {
      if (item.lifecycle_stage in lifecycleCounts) {
        lifecycleCounts[item.lifecycle_stage as keyof typeof lifecycleCounts]++;
      }
    });

    // Fetch customer type counts
    const { data: customerTypeData } = await supabase
      .from("crm_customers")
      .select("customer_type")
      .eq("is_archived", false);

    const customerTypeCounts = {
      donor: 0,
      receiver: 0,
      both: 0,
    };

    customerTypeData?.forEach((item: { customer_type: string }) => {
      if (item.customer_type in customerTypeCounts) {
        customerTypeCounts[item.customer_type as keyof typeof customerTypeCounts]++;
      }
    });

    // Fetch average metrics
    const { data: metricsData } = await supabase
      .from("crm_customers")
      .select("engagement_score, churn_risk_score, ltv_score, total_interactions")
      .eq("is_archived", false);

    const averages = {
      engagement: 0,
      churnRisk: 0,
      ltv: 0,
      interactions: 0,
    };

    if (metricsData && metricsData.length > 0) {
      const sum = metricsData.reduce(
        (
          acc: { engagement: number; churnRisk: number; ltv: number; interactions: number },
          item: {
            engagement_score: number | null;
            churn_risk_score: number | null;
            ltv_score: number | null;
            total_interactions: number | null;
          }
        ) => ({
          engagement: acc.engagement + (item.engagement_score || 0),
          churnRisk: acc.churnRisk + (item.churn_risk_score || 0),
          ltv: acc.ltv + (item.ltv_score || 0),
          interactions: acc.interactions + (item.total_interactions || 0),
        }),
        { engagement: 0, churnRisk: 0, ltv: 0, interactions: 0 }
      );

      averages.engagement = Math.round(sum.engagement / metricsData.length);
      averages.churnRisk = Math.round(sum.churnRisk / metricsData.length);
      averages.ltv = Math.round(sum.ltv / metricsData.length);
      averages.interactions = Math.round(sum.interactions);
    }

    // Fetch new customers counts
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { count: newThisWeek } = await supabase
      .from("crm_customers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneWeekAgo.toISOString());

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { count: newThisMonth } = await supabase
      .from("crm_customers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneMonthAgo.toISOString());

    // Fetch top tags
    const { data: tagData } = await supabase.from("crm_customer_tag_assignments").select(`
        tag_id,
        tag:tag_id (name)
      `);

    interface TagAssignment {
      tag_id: string;
      tag: { name: string }[];
    }

    const tagCounts: Record<string, number> = {};
    (tagData as unknown as TagAssignment[] | null)?.forEach((item) => {
      const tagName = item.tag?.[0]?.name;
      if (tagName) {
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      }
    });

    const topTags = Object.entries(tagCounts)
      .map(([tag_name, customer_count]) => ({ tag_name, customer_count }))
      .sort((a, b) => b.customer_count - a.customer_count)
      .slice(0, 5);

    // Fetch top champions
    const { data: championsData } = await supabase
      .from("crm_customers")
      .select(
        `
        id,
        profile_id,
        ltv_score,
        profiles:profile_id (first_name, second_name)
      `
      )
      .eq("lifecycle_stage", "champion")
      .order("ltv_score", { ascending: false })
      .limit(5);

    interface ChampionData {
      id: string;
      profile_id: string;
      ltv_score: number;
      profiles: { first_name: string; second_name: string }[];
    }

    const topChampions =
      (championsData as unknown as ChampionData[] | null)?.map((item) => ({
        customer_id: item.id,
        full_name: [item.profiles?.[0]?.first_name, item.profiles?.[0]?.second_name].filter(Boolean).join(' ') || "Unknown",
        ltv_score: item.ltv_score,
      })) || [];

    const stats: CRMDashboardStats = {
      totalCustomers: totalCustomers || 0,
      activeCustomers: lifecycleCounts.active + lifecycleCounts.champion,
      newCustomersThisWeek: newThisWeek || 0,
      newCustomersThisMonth: newThisMonth || 0,
      leadCount: lifecycleCounts.lead,
      activeCount: lifecycleCounts.active,
      championCount: lifecycleCounts.champion,
      atRiskCount: lifecycleCounts.at_risk,
      churnedCount: lifecycleCounts.churned,
      donorCount: customerTypeCounts.donor,
      receiverCount: customerTypeCounts.receiver,
      bothCount: customerTypeCounts.both,
      averageEngagementScore: averages.engagement,
      averageChurnRisk: averages.churnRisk,
      averageLTVScore: averages.ltv,
      totalInteractions: averages.interactions,
      interactionsThisWeek: 0, // Would need additional tracking
      interactionsThisMonth: 0, // Would need additional tracking
      topTags,
      topChampions,
    };

    return { data: stats, error: null };
  } catch (error) {
    logger.error("Error fetching CRM dashboard stats", error as Error);
    return { data: null, error };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const crmAPI = {
  // Customers
  fetchCRMCustomers,
  fetchCustomerSummary,
  updateCustomerMetrics,
  archiveCustomer,
  unarchiveCustomer,
  updateCustomerPreferences,

  // Notes
  fetchCustomerNotes,
  createCustomerNote,
  updateCustomerNote,
  deleteCustomerNote,

  // Tags
  fetchCustomerTags,
  createCustomerTag,
  updateCustomerTag,
  deleteCustomerTag,
  assignCustomerTags,

  // Dashboard
  fetchCRMDashboardStats,
};
