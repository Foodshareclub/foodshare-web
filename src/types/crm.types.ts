/**
 * CRM Type Definitions
 * Types for customer relationship management, engagement tracking, and lifecycle management
 */

// =============================================================================
// ENUM TYPES
// =============================================================================

/**
 * Customer type classification
 * - donor: Primarily shares food items
 * - receiver: Primarily receives food items
 * - both: Both shares and receives items
 */
export type CustomerType = "donor" | "receiver" | "both";

/**
 * Customer lifecycle stage
 * - lead: New user with minimal activity
 * - active: Engaged user with regular activity
 * - champion: Highly engaged power user
 * - at_risk: User showing signs of churn
 * - churned: Inactive user
 */
export type LifecycleStage = "lead" | "active" | "champion" | "at_risk" | "churned";

/**
 * Preferred contact method
 */
export type ContactMethod = "email" | "in_app" | "both";

/**
 * Note type classification
 */
export type NoteType = "general" | "call" | "meeting" | "issue" | "opportunity" | "follow_up";

// =============================================================================
// DATABASE TABLE TYPES
// =============================================================================

/**
 * CRM Customer record (unified customer view)
 * Links to profiles and aggregates data from multiple sources
 */
export interface CRMCustomer {
  id: string; // UUID
  profile_id: string; // UUID - links to profiles table

  // Customer Classification
  customer_type: CustomerType;

  // Engagement Metrics (calculated from existing stats)
  engagement_score: number; // 0-100
  lifecycle_stage: LifecycleStage;

  // Aggregated Interaction Data
  total_interactions: number;
  last_interaction_at: string | null; // ISO timestamp
  first_interaction_at: string | null; // ISO timestamp

  // Value Metrics
  ltv_score: number; // Lifetime value score
  churn_risk_score: number; // 0-100, higher = more at risk

  // Preferences and Status
  preferred_contact_method: ContactMethod;
  is_archived: boolean;
  archived_at: string | null; // ISO timestamp
  archived_reason: string | null;

  // Metadata
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * CRM Customer with profile data (for admin views)
 */
export interface CRMCustomerWithProfile extends CRMCustomer {
  // Profile data
  full_name: string;
  email: string;
  avatar_url: string | null;

  // Stats from profile_stats
  items_shared: number;
  items_received: number;
  rating_average: number | null;

  // Stats from forum_user_stats
  forum_reputation: number;
  trust_level: number;

  // Assigned tags
  tags: CRMCustomerTag[];
}

/**
 * CRM Customer Note
 * Admin notes about customers for relationship management
 */
export interface CRMCustomerNote {
  id: string; // UUID
  customer_id: string; // UUID - links to crm_customers
  admin_id: string; // UUID - links to profiles

  note_text: string;
  note_type: NoteType;

  is_pinned: boolean;

  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * CRM Customer Note with admin data (for admin views)
 */
export interface CRMCustomerNoteWithAdmin extends CRMCustomerNote {
  admin_name: string;
  admin_email: string;
  admin_avatar_url: string | null;
}

/**
 * CRM Customer Tag
 * Predefined tags for customer segmentation
 */
export interface CRMCustomerTag {
  id: string; // UUID
  name: string;
  color: string; // Hex color code
  description: string | null;

  is_system: boolean; // System tags cannot be deleted

  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * CRM Customer Tag Assignment (many-to-many)
 */
export interface CRMCustomerTagAssignment {
  id: string; // UUID
  customer_id: string; // UUID
  tag_id: string; // UUID
  assigned_by: string | null; // UUID - admin who assigned

  created_at: string; // ISO timestamp
}

/**
 * CRM Customer Tag Assignment with tag data
 */
export interface CRMCustomerTagAssignmentWithTag extends CRMCustomerTagAssignment {
  tag: CRMCustomerTag;
}

// =============================================================================
// FUNCTION RETURN TYPES
// =============================================================================

/**
 * Customer summary for admin dashboard
 * Returned by get_crm_customer_summary() function
 */
export interface CRMCustomerSummary {
  customer_id: string;
  profile_id: string;
  full_name: string;
  email: string;
  customer_type: CustomerType;
  engagement_score: number;
  lifecycle_stage: LifecycleStage;
  churn_risk_score: number;
  ltv_score: number;
  total_interactions: number;
  items_shared: number;
  items_received: number;
  forum_reputation: number;
  tags: string[]; // Array of tag names
}

// =============================================================================
// FILTER & SEARCH TYPES
// =============================================================================

/**
 * Filters for CRM customers list
 */
export interface CRMCustomersFilter {
  searchTerm: string;
  customerType: CustomerType | "all";
  lifecycleStage: LifecycleStage | "all";
  tags: string[]; // Tag IDs
  engagementScoreMin: number; // 0-100
  engagementScoreMax: number; // 0-100
  churnRiskMin: number; // 0-100
  churnRiskMax: number; // 0-100
  ltvScoreMin: number;
  ltvScoreMax: number;
  includeArchived: boolean;
  sortBy:
    | "engagement_score"
    | "churn_risk_score"
    | "ltv_score"
    | "last_interaction_at"
    | "created_at";
  sortOrder: "asc" | "desc";
}

/**
 * Pagination state
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// =============================================================================
// ADMIN ACTION PAYLOADS
// =============================================================================

/**
 * Payload for creating a customer note
 */
export interface CreateCustomerNotePayload {
  customer_id: string;
  note_text: string;
  note_type: NoteType;
  is_pinned?: boolean;
}

/**
 * Payload for updating a customer note
 */
export interface UpdateCustomerNotePayload {
  note_id: string;
  note_text?: string;
  note_type?: NoteType;
  is_pinned?: boolean;
}

/**
 * Payload for creating a customer tag
 */
export interface CreateCustomerTagPayload {
  name: string;
  color: string;
  description?: string;
}

/**
 * Payload for updating a customer tag
 */
export interface UpdateCustomerTagPayload {
  tag_id: string;
  name?: string;
  color?: string;
  description?: string;
}

/**
 * Payload for assigning tags to customer
 */
export interface AssignCustomerTagsPayload {
  customer_id: string;
  tag_ids: string[];
}

/**
 * Payload for archiving a customer
 */
export interface ArchiveCustomerPayload {
  customer_id: string;
  reason?: string;
}

/**
 * Payload for updating customer preferences
 */
export interface UpdateCustomerPreferencesPayload {
  customer_id: string;
  preferred_contact_method?: ContactMethod;
}

// =============================================================================
// ANALYTICS & STATS TYPES
// =============================================================================

/**
 * CRM Dashboard statistics
 */
export interface CRMDashboardStats {
  // Total counts
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisWeek: number;
  newCustomersThisMonth: number;

  // Lifecycle distribution
  leadCount: number;
  activeCount: number;
  championCount: number;
  atRiskCount: number;
  churnedCount: number;

  // Customer type distribution
  donorCount: number;
  receiverCount: number;
  bothCount: number;

  // Engagement metrics
  averageEngagementScore: number;
  averageChurnRisk: number;
  averageLTVScore: number;

  // Activity metrics
  totalInteractions: number;
  interactionsThisWeek: number;
  interactionsThisMonth: number;

  // Top segments
  topTags: Array<{
    tag_name: string;
    customer_count: number;
  }>;
  topChampions: Array<{
    customer_id: string;
    full_name: string;
    ltv_score: number;
  }>;
}

/**
 * Engagement score distribution
 */
export interface EngagementScoreDistribution {
  veryHigh: number; // 80-100
  high: number; // 60-79
  medium: number; // 40-59
  low: number; // 20-39
  veryLow: number; // 0-19
}

/**
 * Lifecycle stage transition (for tracking changes)
 */
export interface LifecycleStageTransition {
  customer_id: string;
  from_stage: LifecycleStage;
  to_stage: LifecycleStage;
  transitioned_at: string; // ISO timestamp
}

/**
 * Churn risk analysis
 */
export interface ChurnRiskAnalysis {
  highRiskCount: number; // 70-100
  mediumRiskCount: number; // 40-69
  lowRiskCount: number; // 0-39
  highRiskCustomers: Array<{
    customer_id: string;
    full_name: string;
    churn_risk_score: number;
    last_interaction_at: string;
  }>;
}

// =============================================================================
// REDUX STATE TYPES
// =============================================================================

/**
 * CRM Redux state slice
 */
export interface CRMState {
  // Customers list
  customers: CRMCustomerWithProfile[];
  customersStatus: "idle" | "loading" | "succeeded" | "failed";
  customersError: string | null;

  // Selected customer details
  selectedCustomerId: string | null;
  selectedCustomer: CRMCustomerSummary | null;
  selectedCustomerStatus: "idle" | "loading" | "succeeded" | "failed";

  // Customer notes
  customerNotes: CRMCustomerNoteWithAdmin[];
  notesStatus: "idle" | "loading" | "succeeded" | "failed";

  // Tags
  tags: CRMCustomerTag[];
  tagsStatus: "idle" | "loading" | "succeeded" | "failed";

  // Filters
  filters: CRMCustomersFilter;

  // Pagination
  pagination: PaginationState;

  // Dashboard stats
  dashboardStats: CRMDashboardStats | null;
  statsStatus: "idle" | "loading" | "succeeded" | "failed";

  // Detail modal
  detailModalOpen: boolean;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

/**
 * Error response
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse {
  success_count: number;
  failed_count: number;
  errors: Array<{
    customer_id: string;
    error: string;
  }>;
}

// =============================================================================
// CHART DATA TYPES
// =============================================================================

/**
 * Data for engagement score chart
 */
export interface EngagementChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

/**
 * Data for lifecycle funnel chart
 */
export interface LifecycleFunnelData {
  stage: LifecycleStage;
  count: number;
  percentage: number;
}

/**
 * Data for churn risk timeline
 */
export interface ChurnRiskTimelineData {
  date: string;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Customer activity summary
 */
export interface CustomerActivitySummary {
  posts_created: number;
  items_shared: number;
  items_received: number;
  messages_sent: number;
  forum_posts: number;
  reviews_given: number;
  likes_given: number;
  total_activities: number;
}

/**
 * Customer interaction timeline item
 */
export interface CustomerInteractionTimelineItem {
  id: string;
  type: "post" | "message" | "forum_post" | "review" | "like";
  title: string;
  description: string;
  timestamp: string; // ISO timestamp
  metadata?: Record<string, unknown>;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

/**
 * Default CRM filters
 */
export const DEFAULT_CRM_FILTERS: CRMCustomersFilter = {
  searchTerm: "",
  customerType: "all",
  lifecycleStage: "all",
  tags: [],
  engagementScoreMin: 0,
  engagementScoreMax: 100,
  churnRiskMin: 0,
  churnRiskMax: 100,
  ltvScoreMin: 0,
  ltvScoreMax: 1000,
  includeArchived: false,
  sortBy: "engagement_score",
  sortOrder: "desc",
};

/**
 * Default pagination state
 */
export const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  pageSize: 25,
  totalItems: 0,
  totalPages: 0,
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for CustomerType
 */
export function isCustomerType(value: unknown): value is CustomerType {
  return typeof value === "string" && ["donor", "receiver", "both"].includes(value);
}

/**
 * Type guard for LifecycleStage
 */
export function isLifecycleStage(value: unknown): value is LifecycleStage {
  return (
    typeof value === "string" &&
    ["lead", "active", "champion", "at_risk", "churned"].includes(value)
  );
}

/**
 * Type guard for NoteType
 */
export function isNoteType(value: unknown): value is NoteType {
  return (
    typeof value === "string" &&
    ["general", "call", "meeting", "issue", "opportunity", "follow_up"].includes(value)
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

// No default export - use named exports only
