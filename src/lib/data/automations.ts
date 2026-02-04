/**
 * Email Automation Data Functions
 * Server-side data fetching for automation flows
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Re-export types and constants from shared types file
export type {
  AutomationFlow,
  AutomationStep,
  AutomationEnrollment,
  EmailTemplate,
  AutomationQueueItem,
} from "@/types/automations.types";
export { TRIGGER_TYPES } from "@/types/automations.types";

import type {
  AutomationFlow,
  AutomationEnrollment,
  EmailTemplate,
  AutomationQueueItem,
} from "@/types/automations.types";

/**
 * Get all automation flows
 */
export async function getAutomationFlows(): Promise<AutomationFlow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_automation_flows")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching automation flows:", error);
    return [];
  }

  return data || [];
}

/**
 * Get a single automation flow by ID
 */
export async function getAutomationFlow(id: string): Promise<AutomationFlow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_automation_flows")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching automation flow:", error);
    return null;
  }

  return data;
}

/**
 * Get enrollments for a flow
 */
export async function getFlowEnrollments(flowId: string): Promise<AutomationEnrollment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("automation_enrollments")
    .select(
      `
      *,
      profile:profiles(email, first_name, nickname, avatar_url)
    `
    )
    .eq("flow_id", flowId)
    .order("enrolled_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching enrollments:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all email templates
 * Uses admin client to bypass RLS (called from admin routes)
 */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching email templates:", error);
    return [];
  }

  return data || [];
}

/**
 * Get automation queue items
 */
export async function getAutomationQueue(
  status?: string,
  limit = 50
): Promise<AutomationQueueItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("email_automation_queue")
    .select("*")
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching automation queue:", error);
    return [];
  }

  return data || [];
}

/**
 * Get automation stats
 */
export async function getAutomationStats(): Promise<{
  totalFlows: number;
  activeFlows: number;
  totalEnrolled: number;
  totalCompleted: number;
  pendingEmails: number;
  sentToday: number;
}> {
  const supabase = await createClient();

  // Get flow counts
  const { data: flows } = await supabase
    .from("email_automation_flows")
    .select("status, total_enrolled, total_completed");

  // Get pending queue count
  const { count: pendingCount } = await supabase
    .from("email_automation_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // Get sent today count
  const today = new Date().toISOString().split("T")[0];
  const { count: sentTodayCount } = await supabase
    .from("email_automation_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", today);

  const activeFlows = flows?.filter((f) => f.status === "active").length || 0;
  const totalEnrolled = flows?.reduce((sum, f) => sum + (f.total_enrolled || 0), 0) || 0;
  const totalCompleted = flows?.reduce((sum, f) => sum + (f.total_completed || 0), 0) || 0;

  return {
    totalFlows: flows?.length || 0,
    activeFlows,
    totalEnrolled,
    totalCompleted,
    pendingEmails: pendingCount || 0,
    sentToday: sentTodayCount || 0,
  };
}
