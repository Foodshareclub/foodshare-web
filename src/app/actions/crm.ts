"use server";

/**
 * CRM Server Actions
 * Mutations for Customer Relationship Management
 */

import { createClient } from "@/lib/supabase/server";
import { invalidateTag } from "@/lib/data/cache-keys";
import { CRM_CACHE_TAGS } from "@/lib/data/crm";

// ============================================================================
// Import Customers from Profiles
// ============================================================================

/**
 * Import profiles as CRM customers
 * Creates CRM customer records for profiles that don't have one
 */
export async function importProfilesAsCRMCustomers(): Promise<{
  success: boolean;
  imported: number;
  error?: string;
}> {
  const supabase = await createClient();

  // Get profiles that don't have a CRM customer record
  const { data: profiles, error: fetchError } = await supabase
    .from("profiles")
    .select("id")
    .not("id", "in", supabase.from("crm_customers").select("profile_id"));

  if (fetchError) {
    return { success: false, imported: 0, error: fetchError.message };
  }

  if (!profiles || profiles.length === 0) {
    return { success: true, imported: 0 };
  }

  // Create CRM customer records
  const customersToInsert = profiles.map((p) => ({
    profile_id: p.id,
    status: "active",
    lifecycle_stage: "lead",
    engagement_score: 50,
    churn_risk_score: 0,
  }));

  const { error: insertError } = await supabase.from("crm_customers").insert(customersToInsert);

  if (insertError) {
    return { success: false, imported: 0, error: insertError.message };
  }

  invalidateTag(CRM_CACHE_TAGS.CUSTOMERS);
  return { success: true, imported: profiles.length };
}

// ============================================================================
// Customer Management
// ============================================================================

/**
 * Update customer lifecycle stage
 */
export async function updateCustomerLifecycle(
  customerId: string,
  stage: "lead" | "active" | "champion" | "at_risk" | "churned"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("crm_customers")
    .update({ lifecycle_stage: stage, updated_at: new Date().toISOString() })
    .eq("id", customerId);

  if (error) {
    return { success: false, error: error.message };
  }

  invalidateTag(CRM_CACHE_TAGS.CUSTOMERS);
  invalidateTag(CRM_CACHE_TAGS.CUSTOMER(customerId));
  return { success: true };
}

/**
 * Update customer engagement score
 */
export async function updateEngagementScore(
  customerId: string,
  score: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const clampedScore = Math.max(0, Math.min(100, score));

  const { error } = await supabase
    .from("crm_customers")
    .update({ engagement_score: clampedScore, updated_at: new Date().toISOString() })
    .eq("id", customerId);

  if (error) {
    return { success: false, error: error.message };
  }

  invalidateTag(CRM_CACHE_TAGS.CUSTOMERS);
  invalidateTag(CRM_CACHE_TAGS.CUSTOMER(customerId));
  return { success: true };
}

/**
 * Archive a customer
 */
export async function archiveCustomer(
  customerId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("crm_customers")
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
      archived_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);

  if (error) {
    return { success: false, error: error.message };
  }

  invalidateTag(CRM_CACHE_TAGS.CUSTOMERS);
  return { success: true };
}

// ============================================================================
// Customer Notes
// ============================================================================

/**
 * Add a note to a customer
 */
export async function addCustomerNote(
  customerId: string,
  content: string,
  noteType: "general" | "call" | "email" | "meeting" | "support" = "general"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase.from("crm_customer_notes").insert({
    customer_id: customerId,
    admin_id: user.id,
    content,
    note_text: content,
    note_type: noteType,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Update last interaction
  await supabase
    .from("crm_customers")
    .update({ last_interaction_at: new Date().toISOString() })
    .eq("id", customerId);

  invalidateTag(CRM_CACHE_TAGS.CUSTOMER_NOTES(customerId));
  return { success: true };
}

// ============================================================================
// Tags
// ============================================================================

/**
 * Assign tag to customer
 */
export async function assignTagToCustomer(
  customerId: string,
  tagId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("crm_customer_tag_assignments").insert({
    customer_id: customerId,
    tag_id: tagId,
  });

  if (error) {
    // Ignore duplicate key errors
    if (error.code === "23505") {
      return { success: true };
    }
    return { success: false, error: error.message };
  }

  invalidateTag(CRM_CACHE_TAGS.CUSTOMER(customerId));
  return { success: true };
}

/**
 * Remove tag from customer
 */
export async function removeTagFromCustomer(
  customerId: string,
  tagId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("crm_customer_tag_assignments")
    .delete()
    .eq("customer_id", customerId)
    .eq("tag_id", tagId);

  if (error) {
    return { success: false, error: error.message };
  }

  invalidateTag(CRM_CACHE_TAGS.CUSTOMER(customerId));
  return { success: true };
}

/**
 * Create a new tag
 */
export async function createTag(
  name: string,
  color: string,
  description?: string
): Promise<{ success: boolean; tagId?: string; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("crm_customer_tags")
    .insert({ name, color, description })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  invalidateTag(CRM_CACHE_TAGS.TAGS);
  return { success: true, tagId: data.id };
}
