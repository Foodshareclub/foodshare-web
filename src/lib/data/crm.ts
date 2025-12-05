/**
 * CRM Data Layer
 * Server-side data fetching functions for Customer Relationship Management
 */

import { createClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';
import { CACHE_DURATIONS, logCacheOperation } from '@/lib/data/cache-keys';
import type {
  CRMCustomer,
  CRMCustomerWithProfile,
  CRMCustomerNote,
  CRMCustomerNoteWithAdmin,
  CRMCustomerTag,
  CRMCustomerSummary,
  CRMDashboardStats,
  CRMCustomersFilter,
} from '@/types/crm.types';

// ============================================================================
// Cache Tags
// ============================================================================

export const CRM_CACHE_TAGS = {
  CUSTOMERS: 'crm-customers',
  CUSTOMER: (id: string) => `crm-customer-${id}`,
  CUSTOMER_NOTES: (customerId: string) => `crm-customer-notes-${customerId}`,
  TAGS: 'crm-tags',
  DASHBOARD: 'crm-dashboard',
} as const;

// ============================================================================
// Raw Types for Supabase Queries
// ============================================================================

interface RawCustomer extends CRMCustomer {
  profiles?: { id: string; full_name: string; email: string; avatar_url: string | null };
  profile_stats?: { items_shared: number; items_received: number; rating_average: number | null };
  forum_user_stats?: { reputation_score: number; trust_level: number };
  crm_customer_tag_assignments?: Array<{ tag: CRMCustomerTag }>;
}

interface RawNote extends CRMCustomerNote {
  admin?: { id: string; full_name: string; email: string; avatar_url: string | null };
}

// ============================================================================
// CUSTOMERS
// ============================================================================

/**
 * Fetch all CRM customers with profile data
 */
export async function getCRMCustomers(
  filters?: Partial<CRMCustomersFilter>
): Promise<CRMCustomerWithProfile[]> {
  const supabase = await createClient();

  let query = supabase.from('crm_customers').select(`
    *,
    profiles:profile_id (
      id,
      full_name,
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
      query = query.eq('is_archived', false);
    }

    if (filters.customerType && filters.customerType !== 'all') {
      query = query.eq('customer_type', filters.customerType);
    }

    if (filters.lifecycleStage && filters.lifecycleStage !== 'all') {
      query = query.eq('lifecycle_stage', filters.lifecycleStage);
    }

    if (filters.engagementScoreMin !== undefined) {
      query = query.gte('engagement_score', filters.engagementScoreMin);
    }

    if (filters.engagementScoreMax !== undefined) {
      query = query.lte('engagement_score', filters.engagementScoreMax);
    }

    if (filters.churnRiskMin !== undefined) {
      query = query.gte('churn_risk_score', filters.churnRiskMin);
    }

    if (filters.churnRiskMax !== undefined) {
      query = query.lte('churn_risk_score', filters.churnRiskMax);
    }

    if (filters.sortBy) {
      query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch CRM customers: ${error.message}`);
  }

  // Transform data to match CRMCustomerWithProfile interface
  const customers: CRMCustomerWithProfile[] =
    data?.map((customer: RawCustomer) => ({
      ...customer,
      full_name: customer.profiles?.full_name || '',
      email: customer.profiles?.email || '',
      avatar_url: customer.profiles?.avatar_url || null,
      items_shared: customer.profile_stats?.items_shared || 0,
      items_received: customer.profile_stats?.items_received || 0,
      rating_average: customer.profile_stats?.rating_average || null,
      forum_reputation: customer.forum_user_stats?.reputation_score || 0,
      trust_level: customer.forum_user_stats?.trust_level || 0,
      tags: customer.crm_customer_tag_assignments?.map((assignment) => assignment.tag) || [],
    })) || [];

  // Apply search filter if provided
  if (filters?.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.full_name?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower)
    );
  }

  return customers;
}

/**
 * Cached version of getCRMCustomers
 */
export const getCRMCustomersCached = unstable_cache(
  async (filters?: Partial<CRMCustomersFilter>) => {
    logCacheOperation('miss', CRM_CACHE_TAGS.CUSTOMERS);
    return getCRMCustomers(filters);
  },
  [CRM_CACHE_TAGS.CUSTOMERS],
  { revalidate: CACHE_DURATIONS.MEDIUM, tags: [CRM_CACHE_TAGS.CUSTOMERS] }
);

/**
 * Fetch single customer summary
 */
export async function getCustomerSummary(customerId: string): Promise<CRMCustomerSummary | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_crm_customer_summary', {
    p_customer_id: customerId,
  });

  if (error) {
    throw new Error(`Failed to fetch customer summary: ${error.message}`);
  }

  return (data?.[0] as CRMCustomerSummary) || null;
}

// ============================================================================
// CUSTOMER NOTES
// ============================================================================

/**
 * Fetch notes for a customer
 */
export async function getCustomerNotes(customerId: string): Promise<CRMCustomerNoteWithAdmin[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('crm_customer_notes')
    .select(`
      *,
      admin:admin_id (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch customer notes: ${error.message}`);
  }

  // Transform data
  return (
    data?.map((note: RawNote) => ({
      ...note,
      admin_name: note.admin?.full_name || '',
      admin_email: note.admin?.email || '',
      admin_avatar_url: note.admin?.avatar_url || null,
    })) || []
  );
}

// ============================================================================
// CUSTOMER TAGS
// ============================================================================

/**
 * Fetch all customer tags
 */
export async function getCustomerTags(): Promise<CRMCustomerTag[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('crm_customer_tags')
    .select('*')
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch customer tags: ${error.message}`);
  }

  return data as CRMCustomerTag[];
}

/**
 * Cached version of getCustomerTags
 */
export const getCustomerTagsCached = unstable_cache(
  async () => {
    logCacheOperation('miss', CRM_CACHE_TAGS.TAGS);
    return getCustomerTags();
  },
  [CRM_CACHE_TAGS.TAGS],
  { revalidate: CACHE_DURATIONS.LONG, tags: [CRM_CACHE_TAGS.TAGS] }
);

// ============================================================================
// DASHBOARD STATS
// ============================================================================

/**
 * Fetch CRM dashboard statistics
 */
export async function getCRMDashboardStats(): Promise<CRMDashboardStats> {
  const supabase = await createClient();

  // Fetch total customers
  const { count: totalCustomers } = await supabase
    .from('crm_customers')
    .select('*', { count: 'exact', head: true })
    .eq('is_archived', false);

  // Fetch lifecycle stage counts
  const { data: lifecycleData } = await supabase
    .from('crm_customers')
    .select('lifecycle_stage')
    .eq('is_archived', false);

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
    .from('crm_customers')
    .select('customer_type')
    .eq('is_archived', false);

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
    .from('crm_customers')
    .select('engagement_score, churn_risk_score, ltv_score, total_interactions')
    .eq('is_archived', false);

  const averages = {
    engagement: 0,
    churnRisk: 0,
    ltv: 0,
    interactions: 0,
  };

  if (metricsData && metricsData.length > 0) {
    interface MetricsItem {
      engagement_score: number | null;
      churn_risk_score: number | null;
      ltv_score: number | null;
      total_interactions: number | null;
    }

    const sum = metricsData.reduce(
      (acc, item: MetricsItem) => ({
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
    .from('crm_customers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneWeekAgo.toISOString());

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const { count: newThisMonth } = await supabase
    .from('crm_customers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneMonthAgo.toISOString());

  // Fetch top tags
  const { data: tagData } = await supabase.from('crm_customer_tag_assignments').select(`
    tag_id,
    tag:tag_id (name)
  `);

  interface TagAssignment {
    tag_id: string;
    tag?: { name: string };
  }

  const tagCounts: Record<string, number> = {};
  tagData?.forEach((item: TagAssignment) => {
    const tagName = item.tag?.name;
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
    .from('crm_customers')
    .select(`
      id,
      profile_id,
      ltv_score,
      profiles:profile_id (full_name)
    `)
    .eq('lifecycle_stage', 'champion')
    .order('ltv_score', { ascending: false })
    .limit(5);

  interface ChampionData {
    id: string;
    profile_id: string;
    ltv_score: number;
    profiles?: { full_name: string };
  }

  const topChampions =
    championsData?.map((item: ChampionData) => ({
      customer_id: item.id,
      full_name: item.profiles?.full_name || 'Unknown',
      ltv_score: item.ltv_score,
    })) || [];

  return {
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
    interactionsThisWeek: 0,
    interactionsThisMonth: 0,
    topTags,
    topChampions,
  };
}

/**
 * Cached version of getCRMDashboardStats
 */
export const getCRMDashboardStatsCached = unstable_cache(
  async () => {
    logCacheOperation('miss', CRM_CACHE_TAGS.DASHBOARD);
    return getCRMDashboardStats();
  },
  [CRM_CACHE_TAGS.DASHBOARD],
  { revalidate: CACHE_DURATIONS.MEDIUM, tags: [CRM_CACHE_TAGS.DASHBOARD] }
);
