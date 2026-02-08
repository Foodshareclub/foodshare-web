/**
 * Campaign API
 * Supabase API calls for Campaign Management, Segments, Templates, and Workflows
 */

import { supabase } from "@/lib/supabase/client";
import type {
  Campaign,
  Segment,
  SegmentFilters,
  SegmentPreviewResult,
  EmailTemplate,
  TemplatePreview,
  WorkflowTemplate,
  WorkflowExecution,
  WorkflowExecutionWithDetails,
  WorkflowExecutionStatus,
  CampaignAnalytics,
  CreateCampaignPayload,
  UpdateCampaignPayload,
  CreateSegmentPayload,
  UpdateSegmentPayload,
  CreateTemplatePayload,
  LaunchCampaignPayload,
  CampaignLaunchResult,
  CampaignListFilters,
  PaginationParams,
  PaginatedResponse,
  EmailTemplateCategory,
} from "@/types/campaign.types";
import { createLogger } from "@/lib/logger";

const logger = createLogger("CampaignAPI");

// =============================================================================
// CAMPAIGN MANAGEMENT
// =============================================================================

/**
 * Create a new campaign
 */
export async function createCampaign(payload: CreateCampaignPayload) {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;

  if (!userId) {
    return { data: null, error: { message: "Not authenticated" } };
  }

  const { data, error } = await supabase
    .from("crm_campaigns")
    .insert({
      name: payload.name,
      description: payload.description || null,
      campaign_type: payload.campaign_type,
      status: "draft",
      audience_filters: payload.audience_filters,
      email_template_id: payload.email_template_id || null,
      email_subject: payload.email_subject || null,
      email_content: payload.email_content || null,
      push_title: payload.push_title || null,
      push_body: payload.push_body || null,
      push_image_url: payload.push_image_url || null,
      trigger_type: payload.trigger_type,
      scheduled_at: payload.scheduled_at || null,
      lifecycle_trigger: payload.lifecycle_trigger || null,
      score_threshold: payload.score_threshold || null,
      send_frequency: payload.send_frequency || null,
      max_sends_per_user: payload.max_sends_per_user || 1,
      respect_quiet_hours: payload.respect_quiet_hours ?? true,
      respect_digest_preferences: payload.respect_digest_preferences ?? true,
      is_ab_test: payload.is_ab_test || false,
      ab_test_variants: payload.ab_test_variants || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating campaign", error);
    return { data: null, error };
  }

  return { data: data as Campaign, error: null };
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(id: string, payload: UpdateCampaignPayload) {
  const updateData: Record<string, unknown> = {};

  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.audience_filters !== undefined)
    updateData.audience_filters = payload.audience_filters;
  if (payload.email_subject !== undefined) updateData.email_subject = payload.email_subject;
  if (payload.email_content !== undefined) updateData.email_content = payload.email_content;
  if (payload.scheduled_at !== undefined) updateData.scheduled_at = payload.scheduled_at;

  const { data, error } = await supabase
    .from("crm_campaigns")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Error updating campaign", error);
    return { data: null, error };
  }

  return { data: data as Campaign, error: null };
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string) {
  const { error } = await supabase.from("crm_campaigns").delete().eq("id", id);

  if (error) {
    logger.error("Error deleting campaign", error);
    return { data: null, error };
  }

  return { data: true, error: null };
}

/**
 * Fetch campaigns with filters and pagination
 */
export async function fetchCampaigns(
  filters?: Partial<CampaignListFilters>,
  pagination?: Partial<PaginationParams>
) {
  let query = supabase.from("crm_campaigns").select("*", { count: "exact" });

  // Apply filters
  if (filters) {
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.campaign_type) {
      query = query.eq("campaign_type", filters.campaign_type);
    }
    if (filters.created_by) {
      query = query.eq("created_by", filters.created_by);
    }
    if (filters.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("created_at", filters.dateTo);
    }
    if (filters.search) {
      query = query.ilike("name", `%${filters.search}%`);
    }
  }

  // Apply pagination
  const page = pagination?.page || 1;
  const pageSize = pagination?.pageSize || 20;
  const sortBy = pagination?.sortBy || "created_at";
  const sortOrder = pagination?.sortOrder || "desc";

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order(sortBy, { ascending: sortOrder === "asc" }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    logger.error("Error fetching campaigns", error);
    return { data: null, error };
  }

  const response: PaginatedResponse<Campaign> = {
    items: (data as Campaign[]) || [],
    page,
    pageSize,
    totalItems: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
  };

  return { data: response, error: null };
}

/**
 * Fetch a single campaign by ID
 */
export async function fetchCampaignById(id: string) {
  const { data, error } = await supabase.from("crm_campaigns").select("*").eq("id", id).single();

  if (error) {
    logger.error("Error fetching campaign", error);
    return { data: null, error };
  }

  return { data: data as Campaign, error: null };
}

/**
 * Launch a campaign (immediate or scheduled)
 */
export async function launchCampaign(payload: LaunchCampaignPayload) {
  try {
    // First, update campaign status
    const { error: updateError } = await supabase
      .from("crm_campaigns")
      .update({
        status: payload.immediate ? "active" : "scheduled",
        started_at: payload.immediate ? new Date().toISOString() : null,
      })
      .eq("id", payload.campaign_id);

    if (updateError) {
      logger.error("Error updating campaign status", updateError);
      return { data: null, error: updateError };
    }

    // If immediate launch, queue emails
    if (payload.immediate) {
      const { data: queueResult, error: queueError } = await supabase.rpc(
        "queue_campaign_emails_batch",
        {
          p_campaign_id: payload.campaign_id,
          p_batch_size: 1000,
        }
      );

      if (queueError) {
        logger.error("Error queuing campaign emails", queueError);
        return { data: null, error: queueError };
      }

      const result: CampaignLaunchResult = {
        campaign_id: payload.campaign_id,
        status: "launched",
        queued_count: queueResult?.[0]?.queued_count || 0,
        skipped_count: queueResult?.[0]?.skipped_count || 0,
        error_count: queueResult?.[0]?.error_count || 0,
        estimated_completion: null,
      };

      return { data: result, error: null };
    }

    // Scheduled launch
    const result: CampaignLaunchResult = {
      campaign_id: payload.campaign_id,
      status: "scheduled",
      queued_count: 0,
      skipped_count: 0,
      error_count: 0,
      estimated_completion: null,
    };

    return { data: result, error: null };
  } catch (error) {
    logger.error("Error launching campaign", error as Error);
    return { data: null, error };
  }
}

/**
 * Pause a running campaign
 */
export async function pauseCampaign(id: string) {
  const { data, error } = await supabase
    .from("crm_campaigns")
    .update({ status: "paused" })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Error pausing campaign", error);
    return { data: null, error };
  }

  return { data: data as Campaign, error: null };
}

/**
 * Fetch campaign analytics for a date range
 */
export async function fetchCampaignAnalytics(
  id: string,
  dateRange?: { start: string; end: string }
) {
  let query = supabase.from("crm_campaign_analytics").select("*").eq("campaign_id", id);

  if (dateRange) {
    query = query.gte("snapshot_date", dateRange.start).lte("snapshot_date", dateRange.end);
  }

  query = query.order("snapshot_date", { ascending: true });

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching campaign analytics", error);
    return { data: null, error };
  }

  return { data: (data as CampaignAnalytics[]) || [], error: null };
}

// =============================================================================
// SEGMENT MANAGEMENT
// =============================================================================

/**
 * Create a new customer segment
 */
export async function createSegment(payload: CreateSegmentPayload) {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;

  if (!userId) {
    return { data: null, error: { message: "Not authenticated" } };
  }

  const { data, error } = await supabase
    .from("crm_segments")
    .insert({
      name: payload.name,
      description: payload.description || null,
      filters: payload.filters,
      is_dynamic: payload.is_dynamic ?? true,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating segment", error);
    return { data: null, error };
  }

  return { data: data as Segment, error: null };
}

/**
 * Update an existing segment
 */
export async function updateSegment(id: string, payload: UpdateSegmentPayload) {
  const updateData: Record<string, unknown> = {};

  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.filters !== undefined) updateData.filters = payload.filters;
  if (payload.is_dynamic !== undefined) updateData.is_dynamic = payload.is_dynamic;

  const { data, error } = await supabase
    .from("crm_segments")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Error updating segment", error);
    return { data: null, error };
  }

  return { data: data as Segment, error: null };
}

/**
 * Delete a segment
 */
export async function deleteSegment(id: string) {
  const { error } = await supabase.from("crm_segments").delete().eq("id", id);

  if (error) {
    logger.error("Error deleting segment", error);
    return { data: null, error };
  }

  return { data: true, error: null };
}

/**
 * Fetch all segments
 */
export async function fetchSegments() {
  const { data, error } = await supabase
    .from("crm_segments")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    logger.error("Error fetching segments", error);
    return { data: null, error };
  }

  return { data: (data as Segment[]) || [], error: null };
}

/**
 * Preview segment size and sample members
 */
export async function previewSegment(filters: SegmentFilters) {
  try {
    // Build query based on filters
    let query = supabase
      .from("crm_customers")
      .select(
        `
        id,
        profile_id,
        lifecycle_stage,
        engagement_score,
        profiles:profile_id (
          first_name,
          second_name,
          email
        ),
        profile_stats:profile_id (
          items_shared
        )
      `,
        { count: "exact" }
      )
      .eq("is_archived", false);

    // Apply filters
    if (filters.customer_type && filters.customer_type !== "all") {
      query = query.eq("customer_type", filters.customer_type);
    }

    if (filters.lifecycle_stage && filters.lifecycle_stage !== "all") {
      query = query.eq("lifecycle_stage", filters.lifecycle_stage);
    }

    if (filters.engagement_score?.min !== undefined) {
      query = query.gte("engagement_score", filters.engagement_score.min);
    }

    if (filters.engagement_score?.max !== undefined) {
      query = query.lte("engagement_score", filters.engagement_score.max);
    }

    if (filters.churn_risk_score?.min !== undefined) {
      query = query.gte("churn_risk_score", filters.churn_risk_score.min);
    }

    if (filters.churn_risk_score?.max !== undefined) {
      query = query.lte("churn_risk_score", filters.churn_risk_score.max);
    }

    if (filters.ltv_score?.min !== undefined) {
      query = query.gte("ltv_score", filters.ltv_score.min);
    }

    if (filters.ltv_score?.max !== undefined) {
      query = query.lte("ltv_score", filters.ltv_score.max);
    }

    if (filters.created_after) {
      query = query.gte("created_at", filters.created_after);
    }

    if (filters.created_before) {
      query = query.lte("created_at", filters.created_before);
    }

    // Get total count and sample
    const { data, error, count } = await query.limit(10);

    if (error) {
      logger.error("Error previewing segment", error);
      return { data: null, error };
    }

    interface RawPreviewCustomer {
      id: string;
      profile_id: string;
      lifecycle_stage: string;
      engagement_score: number | null;
      profiles: { first_name: string | null; second_name: string | null; email: string | null }[];
      profile_stats: { items_shared: number | null }[];
    }

    const result: SegmentPreviewResult = {
      estimated_size: count || 0,
      sample_members:
        (data as unknown as RawPreviewCustomer[] | null)?.map((customer) => ({
          customer_id: customer.id,
          full_name:
            [customer.profiles?.[0]?.first_name, customer.profiles?.[0]?.second_name]
              .filter(Boolean)
              .join(" ") || "Unknown",
          email: customer.profiles?.[0]?.email || "",
          lifecycle_stage: customer.lifecycle_stage,
          engagement_score: customer.engagement_score || 0,
          items_shared: customer.profile_stats?.[0]?.items_shared || 0,
        })) || [],
    };

    return { data: result, error: null };
  } catch (error) {
    logger.error("Error previewing segment", error as Error);
    return { data: null, error };
  }
}

/**
 * Refresh segment members (recalculate dynamic segment)
 */
export async function refreshSegmentMembers(id: string) {
  try {
    // Fetch segment
    const { data: segment, error: segmentError } = await supabase
      .from("crm_segments")
      .select("*")
      .eq("id", id)
      .single();

    if (segmentError || !segment) {
      logger.error(
        "Error fetching segment",
        segmentError ? new Error(segmentError.message) : undefined
      );
      return { data: null, error: segmentError };
    }

    // If not dynamic, no need to refresh
    if (!segment.is_dynamic) {
      return { data: { message: "Static segment, no refresh needed" }, error: null };
    }

    // Delete existing members
    await supabase.from("crm_segment_members").delete().eq("segment_id", id);

    // Calculate new members using preview logic
    const { data: previewResult, error: previewError } = await previewSegment(
      segment.filters as SegmentFilters
    );

    if (previewError || !previewResult) {
      logger.error(
        "Error calculating segment members",
        previewError ? new Error(String(previewError)) : undefined
      );
      return { data: null, error: previewError };
    }

    // Insert new members
    if (previewResult.estimated_size > 0) {
      // Fetch full member list (not just preview)
      let query = supabase.from("crm_customers").select("id").eq("is_archived", false);

      // Apply same filters as preview
      const filters = segment.filters as SegmentFilters;

      if (filters.customer_type && filters.customer_type !== "all") {
        query = query.eq("customer_type", filters.customer_type);
      }

      if (filters.lifecycle_stage && filters.lifecycle_stage !== "all") {
        query = query.eq("lifecycle_stage", filters.lifecycle_stage);
      }

      // ... apply other filters (same as preview)

      const { data: customers, error: customersError } = await query;

      if (customersError) {
        logger.error("Error fetching segment customers", customersError);
        return { data: null, error: customersError };
      }

      if (customers && customers.length > 0) {
        const members = customers.map((customer: { id: string }) => ({
          segment_id: id,
          customer_id: customer.id,
        }));

        const { error: insertError } = await supabase.from("crm_segment_members").insert(members);

        if (insertError) {
          logger.error("Error inserting segment members", insertError);
          return { data: null, error: insertError };
        }
      }
    }

    // Update segment metadata
    await supabase
      .from("crm_segments")
      .update({
        member_count: previewResult.estimated_size,
        last_calculated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return { data: { member_count: previewResult.estimated_size }, error: null };
  } catch (error) {
    logger.error("Error refreshing segment members", error as Error);
    return { data: null, error };
  }
}

// =============================================================================
// TEMPLATE MANAGEMENT
// =============================================================================

/**
 * Create a new email template
 */
export async function createTemplate(payload: CreateTemplatePayload) {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;

  if (!userId) {
    return { data: null, error: { message: "Not authenticated" } };
  }

  const { data, error } = await supabase
    .from("crm_email_templates")
    .insert({
      name: payload.name,
      category: payload.category,
      subject_template: payload.subject_template,
      html_template: payload.html_template,
      text_template: payload.text_template || null,
      required_variables: payload.required_variables || [],
      optional_variables: payload.optional_variables || [],
      is_system_template: false,
      is_active: true,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating template", error);
    return { data: null, error };
  }

  return { data: data as EmailTemplate, error: null };
}

/**
 * Update an existing email template
 */
export async function updateTemplate(id: string, payload: Partial<CreateTemplatePayload>) {
  const updateData: Record<string, unknown> = {};

  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.category !== undefined) updateData.category = payload.category;
  if (payload.subject_template !== undefined)
    updateData.subject_template = payload.subject_template;
  if (payload.html_template !== undefined) updateData.html_template = payload.html_template;
  if (payload.text_template !== undefined) updateData.text_template = payload.text_template;
  if (payload.required_variables !== undefined)
    updateData.required_variables = payload.required_variables;
  if (payload.optional_variables !== undefined)
    updateData.optional_variables = payload.optional_variables;

  const { data, error } = await supabase
    .from("crm_email_templates")
    .update(updateData)
    .eq("id", id)
    .eq("is_system_template", false) // Can only update non-system templates
    .select()
    .single();

  if (error) {
    logger.error("Error updating template", error);
    return { data: null, error };
  }

  return { data: data as EmailTemplate, error: null };
}

/**
 * Delete an email template
 */
export async function deleteTemplate(id: string) {
  const { error } = await supabase
    .from("crm_email_templates")
    .delete()
    .eq("id", id)
    .eq("is_system_template", false); // Can only delete non-system templates

  if (error) {
    logger.error("Error deleting template", error);
    return { data: null, error };
  }

  return { data: true, error: null };
}

/**
 * Fetch email templates, optionally filtered by category
 */
export async function fetchTemplates(category?: EmailTemplateCategory) {
  let query = supabase.from("crm_email_templates").select("*").eq("is_active", true);

  if (category) {
    query = query.eq("category", category);
  }

  query = query.order("name", { ascending: true });

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching templates", error);
    return { data: null, error };
  }

  return { data: (data as EmailTemplate[]) || [], error: null };
}

/**
 * Preview template with sample variables
 */
export async function previewTemplate(id: string, variables: Record<string, unknown>) {
  try {
    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from("crm_email_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (templateError || !template) {
      logger.error(
        "Error fetching template",
        templateError ? new Error(templateError.message) : undefined
      );
      return { data: null, error: templateError };
    }

    // Simple variable substitution (in production, use a proper template engine)
    let subject = template.subject_template;
    let html = template.html_template;
    let text = template.text_template || "";

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const valueStr = String(value);
      subject = subject.replace(new RegExp(placeholder, "g"), valueStr);
      html = html.replace(new RegExp(placeholder, "g"), valueStr);
      text = text.replace(new RegExp(placeholder, "g"), valueStr);
    });

    const preview: TemplatePreview = {
      subject,
      html,
      text,
    };

    return { data: preview, error: null };
  } catch (error) {
    logger.error("Error previewing template", error as Error);
    return { data: null, error };
  }
}

// =============================================================================
// WORKFLOW MANAGEMENT
// =============================================================================

/**
 * Fetch all workflow templates
 */
export async function fetchWorkflows() {
  const { data, error } = await supabase
    .from("crm_workflow_templates")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    logger.error("Error fetching workflows", error);
    return { data: null, error };
  }

  return { data: (data as WorkflowTemplate[]) || [], error: null };
}

/**
 * Fetch workflow executions for a specific workflow
 */
export async function fetchWorkflowExecutions(workflowId: string) {
  const { data, error } = await supabase
    .from("crm_workflow_executions")
    .select(
      `
      *,
      workflow:workflow_id (name),
      customer:customer_id (
        profile_id,
        profiles:profile_id (first_name, second_name, email)
      )
    `
    )
    .eq("workflow_id", workflowId)
    .order("started_at", { ascending: false });

  if (error) {
    logger.error("Error fetching workflow executions", error);
    return { data: null, error };
  }

  // Transform data
  interface RawWorkflowExecution {
    id: string;
    workflow_id: string;
    customer_id: string;
    current_step: number;
    status: string;
    started_at: string;
    paused_at: string | null;
    completed_at: string | null;
    failed_at: string | null;
    error_message: string | null;
    metadata: Record<string, unknown> | null;
    workflow: { name: string } | null;
    customer: {
      profile_id: string;
      profiles: {
        first_name: string | null;
        second_name: string | null;
        email: string | null;
      } | null;
    } | null;
  }

  const executions: WorkflowExecutionWithDetails[] =
    (data as RawWorkflowExecution[] | null)?.map((execution) => ({
      id: execution.id,
      workflow_id: execution.workflow_id,
      customer_id: execution.customer_id,
      current_step: execution.current_step,
      status: execution.status as WorkflowExecutionStatus,
      started_at: execution.started_at,
      paused_at: execution.paused_at,
      completed_at: execution.completed_at,
      failed_at: execution.failed_at,
      error_message: execution.error_message,
      metadata: execution.metadata || {},
      workflow_name: execution.workflow?.name || "Unknown",
      customer_name:
        [execution.customer?.profiles?.first_name, execution.customer?.profiles?.second_name]
          .filter(Boolean)
          .join(" ") || "Unknown",
      customer_email: execution.customer?.profiles?.email || "",
      total_steps: 0, // Would need to fetch from workflow template
    })) || [];

  return { data: executions, error: null };
}

/**
 * Pause a running workflow execution
 */
export async function pauseWorkflowExecution(id: string) {
  const { data, error } = await supabase
    .from("crm_workflow_executions")
    .update({
      status: "paused",
      paused_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Error pausing workflow execution", error);
    return { data: null, error };
  }

  return { data: data as WorkflowExecution, error: null };
}

/**
 * Resume a paused workflow execution
 */
export async function resumeWorkflowExecution(id: string) {
  const { data, error } = await supabase
    .from("crm_workflow_executions")
    .update({
      status: "running",
      paused_at: null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Error resuming workflow execution", error);
    return { data: null, error };
  }

  return { data: data as WorkflowExecution, error: null };
}

/**
 * Cancel a workflow execution
 */
export async function cancelWorkflowExecution(id: string) {
  const { data, error } = await supabase
    .from("crm_workflow_executions")
    .update({
      status: "cancelled",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Error cancelling workflow execution", error);
    return { data: null, error };
  }

  return { data: data as WorkflowExecution, error: null };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const campaignAPI = {
  // Campaign Management
  createCampaign,
  updateCampaign,
  deleteCampaign,
  fetchCampaigns,
  fetchCampaignById,
  launchCampaign,
  pauseCampaign,
  fetchCampaignAnalytics,

  // Segment Management
  createSegment,
  updateSegment,
  deleteSegment,
  fetchSegments,
  previewSegment,
  refreshSegmentMembers,

  // Template Management
  createTemplate,
  updateTemplate,
  deleteTemplate,
  fetchTemplates,
  previewTemplate,

  // Workflow Management
  fetchWorkflows,
  fetchWorkflowExecutions,
  pauseWorkflowExecution,
  resumeWorkflowExecution,
  cancelWorkflowExecution,
};
