/**
 * CRM Campaign Type Definitions
 * Types for campaign management, automation, and analytics
 */

// =============================================================================
// ENUM TYPES
// =============================================================================

/**
 * Campaign type
 */
export type CampaignType = "email" | "push" | "in_app" | "multi_channel";

/**
 * Campaign status
 */
export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

/**
 * Campaign trigger type
 */
export type CampaignTriggerType = "immediate" | "scheduled" | "lifecycle_event" | "score_threshold";

/**
 * Campaign send frequency
 */
export type CampaignSendFrequency = "once" | "daily" | "weekly" | "monthly";

/**
 * Campaign send status
 */
export type CampaignSendStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "converted"
  | "bounced"
  | "failed";

/**
 * Campaign goal type
 */
export type CampaignGoalType = "engagement" | "conversion" | "retention" | "revenue";

/**
 * Workflow trigger type
 */
export type WorkflowTriggerType =
  | "lifecycle_change"
  | "score_threshold"
  | "inactivity"
  | "milestone"
  | "manual";

/**
 * Workflow execution status
 */
export type WorkflowExecutionStatus = "running" | "paused" | "completed" | "failed" | "cancelled";

/**
 * Email template category
 */
export type EmailTemplateCategory =
  | "welcome"
  | "engagement"
  | "reengagement"
  | "milestone"
  | "transactional"
  | "educational"
  | "seasonal";

// =============================================================================
// CAMPAIGN TYPES
// =============================================================================

/**
 * Campaign definition
 */
export interface Campaign {
  id: string;
  name: string;
  description: string | null;

  campaign_type: CampaignType;
  status: CampaignStatus;

  // Audience targeting
  audience_filters: Record<string, unknown>;
  estimated_audience_size: number;

  // Email content
  email_template_id: string | null;
  email_subject: string | null;
  email_content: {
    html: string;
    text?: string;
    variables?: Record<string, unknown>;
  } | null;

  // Push notification content
  push_title: string | null;
  push_body: string | null;
  push_image_url: string | null;
  push_deep_link: string | null;

  // Scheduling
  trigger_type: CampaignTriggerType;
  scheduled_at: string | null;
  lifecycle_trigger: string | null;
  score_threshold: {
    field: string;
    operator: ">=" | "<=" | ">" | "<" | "=";
    value: number;
  } | null;

  // Execution settings
  send_frequency: CampaignSendFrequency | null;
  max_sends_per_user: number;
  respect_quiet_hours: boolean;
  respect_digest_preferences: boolean;

  // Performance tracking
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_converted: number;
  total_bounced: number;
  total_failed: number;

  // A/B Testing
  is_ab_test: boolean;
  ab_test_variants: ABTestVariant[] | null;
  ab_test_winner: string | null;

  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * A/B test variant definition
 */
export interface ABTestVariant {
  id: string;
  name: string;
  subject?: string;
  content?: Record<string, unknown>;
  weight: number; // Percentage (0-100)
}

/**
 * Campaign send tracking
 */
export interface CampaignSend {
  id: string;
  campaign_id: string;
  customer_id: string;

  status: CampaignSendStatus;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  converted_at: string | null;
  bounced_at: string | null;
  failed_at: string | null;

  error_message: string | null;
  retry_count: number;

  email_queue_id: string | null;
  notification_id: number | null;

  variant_id: string | null;

  user_agent: string | null;
  ip_address: string | null;

  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Campaign goal
 */
export interface CampaignGoal {
  id: string;
  campaign_id: string;

  goal_type: CampaignGoalType;
  goal_metric: string;
  target_value: number;
  current_value: number;
  is_met: boolean;

  created_at: string;
  updated_at: string;
}

// =============================================================================
// SEGMENT TYPES
// =============================================================================

/**
 * Customer segment definition
 */
export interface Segment {
  id: string;
  name: string;
  description: string | null;

  filters: SegmentFilters;
  is_dynamic: boolean;

  last_calculated_at: string | null;
  member_count: number;

  times_used: number;
  last_used_at: string | null;

  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Segment filters (flexible structure)
 */
export interface SegmentFilters {
  // Customer type
  customer_type?: "donor" | "receiver" | "both" | "all";

  // Lifecycle stage
  lifecycle_stage?: "lead" | "active" | "champion" | "at_risk" | "churned" | "all";

  // Score ranges
  engagement_score?: {
    min?: number;
    max?: number;
  };
  churn_risk_score?: {
    min?: number;
    max?: number;
  };
  ltv_score?: {
    min?: number;
    max?: number;
  };

  // Activity
  items_shared?: {
    min?: number;
    max?: number;
  };
  items_received?: {
    min?: number;
    max?: number;
  };
  last_interaction?: {
    days_ago_min?: number;
    days_ago_max?: number;
  };

  // Tags
  tags?: string[]; // Tag IDs
  tags_operator?: "AND" | "OR"; // All tags or any tag

  // Forum metrics
  reputation_score?: {
    min?: number;
    max?: number;
  };
  trust_level?: number[];

  // Time-based
  created_after?: string;
  created_before?: string;

  // Custom SQL (advanced)
  custom_sql?: string;
}

/**
 * Segment membership
 */
export interface SegmentMember {
  segment_id: string;
  customer_id: string;
  added_at: string;
}

/**
 * Segment with preview data
 */
export interface SegmentWithPreview extends Segment {
  sample_members: Array<{
    customer_id: string;
    full_name: string;
    email: string;
    lifecycle_stage: string;
    engagement_score: number;
  }>;
}

// =============================================================================
// EMAIL TEMPLATE TYPES
// =============================================================================

/**
 * Email template
 */
export interface EmailTemplate {
  id: string;
  name: string;
  category: EmailTemplateCategory;

  subject_template: string;
  html_template: string;
  text_template: string | null;

  required_variables: string[];
  optional_variables: string[];

  preview_image_url: string | null;
  preview_text: string | null;

  times_used: number;
  avg_open_rate: number | null;
  avg_click_rate: number | null;

  is_system_template: boolean;
  is_active: boolean;

  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Template variable definition
 */
export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
  required: boolean;
}

/**
 * Rendered template preview
 */
export interface TemplatePreview {
  subject: string;
  html: string;
  text: string;
}

// =============================================================================
// WORKFLOW TYPES
// =============================================================================

/**
 * Workflow template
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;

  trigger_type: WorkflowTriggerType;
  trigger_config: Record<string, unknown>;

  steps: WorkflowStep[];

  is_active: boolean;
  times_executed: number;
  success_rate: number | null;

  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  step_number: number;
  delay_days: number;
  campaign_id: string | null;
  action_type: "send_email" | "send_push" | "award_badge" | "update_tag" | "wait";
  action_config: Record<string, unknown>;
}

/**
 * Workflow execution
 */
export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  customer_id: string;

  current_step: number;
  status: WorkflowExecutionStatus;

  started_at: string;
  paused_at: string | null;
  completed_at: string | null;
  failed_at: string | null;

  error_message: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Workflow execution with details
 */
export interface WorkflowExecutionWithDetails extends WorkflowExecution {
  workflow_name: string;
  customer_name: string;
  customer_email: string;
  total_steps: number;
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

/**
 * Campaign analytics snapshot
 */
export interface CampaignAnalytics {
  id: string;
  campaign_id: string;
  snapshot_date: string;

  // Volume metrics
  sent_count: number;
  delivered_count: number;
  bounced_count: number;
  failed_count: number;

  // Engagement metrics
  opened_count: number;
  clicked_count: number;
  converted_count: number;
  unsubscribed_count: number;

  // Calculated rates
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;

  // Business impact
  ltv_change_total: number;
  items_shared_increase: number;
  engagement_score_avg_change: number;

  created_at: string;
}

/**
 * Campaign performance summary
 */
export interface CampaignPerformanceSummary {
  campaign_id: string;
  campaign_name: string;
  campaign_type: CampaignType;
  status: CampaignStatus;

  // Aggregate metrics
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_converted: number;

  // Rates
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;

  // ROI metrics
  estimated_roi: number;
  ltv_impact: number;

  // Time metrics
  started_at: string | null;
  completed_at: string | null;
  duration_days: number | null;
}

/**
 * Campaign comparison data
 */
export interface CampaignComparison {
  campaigns: Array<{
    id: string;
    name: string;
    open_rate: number;
    click_rate: number;
    conversion_rate: number;
  }>;
  best_performer: {
    campaign_id: string;
    metric: string;
    value: number;
  };
}

/**
 * Time series analytics data
 */
export interface TimeSeriesAnalytics {
  dates: string[];
  metrics: {
    sent: number[];
    opened: number[];
    clicked: number[];
    converted: number[];
  };
}

// =============================================================================
// PAYLOAD TYPES (for API requests)
// =============================================================================

/**
 * Create campaign payload
 */
export interface CreateCampaignPayload {
  name: string;
  description?: string;
  campaign_type: CampaignType;

  // Audience
  audience_filters: SegmentFilters;

  // Content
  email_template_id?: string;
  email_subject?: string;
  email_content?: {
    html: string;
    text?: string;
    variables?: Record<string, unknown>;
  };
  push_title?: string;
  push_body?: string;
  push_image_url?: string;

  // Scheduling
  trigger_type: CampaignTriggerType;
  scheduled_at?: string;
  lifecycle_trigger?: string;
  score_threshold?: {
    field: string;
    operator: string;
    value: number;
  };

  // Settings
  send_frequency?: CampaignSendFrequency;
  max_sends_per_user?: number;
  respect_quiet_hours?: boolean;
  respect_digest_preferences?: boolean;

  // A/B testing
  is_ab_test?: boolean;
  ab_test_variants?: ABTestVariant[];
}

/**
 * Update campaign payload
 */
export interface UpdateCampaignPayload {
  name?: string;
  description?: string;
  status?: CampaignStatus;
  audience_filters?: SegmentFilters;
  email_subject?: string;
  email_content?: Record<string, unknown>;
  scheduled_at?: string;
}

/**
 * Create segment payload
 */
export interface CreateSegmentPayload {
  name: string;
  description?: string;
  filters: SegmentFilters;
  is_dynamic?: boolean;
}

/**
 * Update segment payload
 */
export interface UpdateSegmentPayload {
  name?: string;
  description?: string;
  filters?: SegmentFilters;
  is_dynamic?: boolean;
}

/**
 * Create template payload
 */
export interface CreateTemplatePayload {
  name: string;
  category: EmailTemplateCategory;
  subject_template: string;
  html_template: string;
  text_template?: string;
  required_variables?: string[];
  optional_variables?: string[];
}

/**
 * Launch campaign payload
 */
export interface LaunchCampaignPayload {
  campaign_id: string;
  immediate?: boolean;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/**
 * Campaign launch result
 */
export interface CampaignLaunchResult {
  campaign_id: string;
  status: "launched" | "scheduled" | "failed";
  queued_count: number;
  skipped_count: number;
  error_count: number;
  estimated_completion: string | null;
}

/**
 * Segment preview result
 */
export interface SegmentPreviewResult {
  estimated_size: number;
  sample_members: Array<{
    customer_id: string;
    full_name: string;
    email: string;
    lifecycle_stage: string;
    engagement_score: number;
    items_shared: number;
  }>;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  success_count: number;
  failed_count: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

// =============================================================================
// FILTER & PAGINATION TYPES
// =============================================================================

/**
 * Campaign list filters
 */
export interface CampaignListFilters {
  status?: CampaignStatus;
  campaign_type?: CampaignType;
  created_by?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

/**
 * Campaign builder state
 */
export interface CampaignBuilderState {
  step: "setup" | "audience" | "content" | "schedule" | "review";
  campaign: Partial<Campaign>;
  validation_errors: Record<string, string>;
  is_saving: boolean;
}

/**
 * Campaign calendar event
 */
export interface CampaignCalendarEvent {
  id: string;
  title: string;
  type: CampaignType;
  status: CampaignStatus;
  scheduled_at: string;
  estimated_sends: number;
  color: string;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for CampaignType
 */
export function isCampaignType(value: unknown): value is CampaignType {
  return typeof value === "string" && ["email", "push", "in_app", "multi_channel"].includes(value);
}

/**
 * Type guard for CampaignStatus
 */
export function isCampaignStatus(value: unknown): value is CampaignStatus {
  return (
    typeof value === "string" &&
    ["draft", "scheduled", "active", "paused", "completed", "cancelled"].includes(value)
  );
}

/**
 * Type guard for CampaignTriggerType
 */
export function isCampaignTriggerType(value: unknown): value is CampaignTriggerType {
  return (
    typeof value === "string" &&
    ["immediate", "scheduled", "lifecycle_event", "score_threshold"].includes(value)
  );
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate campaign performance score (0-100)
 */
export function calculateCampaignScore(analytics: CampaignAnalytics): number {
  const openWeight = 0.3;
  const clickWeight = 0.4;
  const conversionWeight = 0.3;

  const score =
    analytics.open_rate * openWeight +
    analytics.click_rate * clickWeight +
    analytics.conversion_rate * conversionWeight;

  return Math.min(Math.round(score), 100);
}

/**
 * Format campaign status for display
 */
export function formatCampaignStatus(status: CampaignStatus): string {
  const statusMap: Record<CampaignStatus, string> = {
    draft: "Draft",
    scheduled: "Scheduled",
    active: "Active",
    paused: "Paused",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return statusMap[status];
}

/**
 * Get campaign type icon
 */
export function getCampaignTypeIcon(type: CampaignType): string {
  const iconMap: Record<CampaignType, string> = {
    email: "📧",
    push: "🔔",
    in_app: "📱",
    multi_channel: "🌐",
  };
  return iconMap[type];
}

// =============================================================================
// EXPORTS
// =============================================================================

// No default export - use named exports only
