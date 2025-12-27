/**
 * Email CRM Dashboard Types
 * Shared type definitions for the email CRM dashboard components
 */

import type {
  EmailCRMData,
  EmailDashboardStats,
  ProviderHealth,
  RecentCampaign,
  ActiveAutomation,
  AudienceSegment,
} from "@/lib/data/admin-email";

// Re-export data types for convenience
export type {
  EmailCRMData,
  EmailDashboardStats,
  ProviderHealth,
  RecentCampaign,
  ActiveAutomation,
  AudienceSegment,
};

/**
 * Tab type for the main dashboard navigation
 */
export type TabType =
  | "dashboard"
  | "overview"
  | "campaigns"
  | "automation"
  | "audience"
  | "compose"
  | "providers";

/**
 * Form data for composing emails
 */
export interface EmailFormData {
  to: string;
  subject: string;
  message: string;
  emailType: string;
  provider: string;
  useHtml: boolean;
}

/**
 * Props for the main EmailCRMDashboard component
 */
export interface EmailCRMDashboardProps {
  initialData?: EmailCRMData;
}

/**
 * Props for EmailCRMClient component
 */
export interface Props {
  initialData?: EmailCRMData;
}

/**
 * Props for the OverviewTab component
 */
export interface OverviewTabProps {
  stats: EmailDashboardStats;
  campaigns: RecentCampaign[];
  automations: ActiveAutomation[];
  providerHealth: ProviderHealth[];
}

/**
 * Props for the CampaignsTab component
 */
export interface CampaignsTabProps {
  campaigns: RecentCampaign[];
}

/**
 * Props for the AutomationTab component
 */
export interface AutomationTabProps {
  automations: ActiveAutomation[];
}

/**
 * Props for the AudienceTab component
 */
export interface AudienceTabProps {
  segments: AudienceSegment[];
  stats: EmailDashboardStats;
}

/**
 * Props for the ProvidersTab component
 */
export interface ProvidersTabProps {
  providerHealth: ProviderHealth[];
}

/**
 * Props for MetricCard component
 */
export interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: "up" | "down";
  color?: "blue" | "emerald" | "violet" | "amber" | "rose";
}

/**
 * Props for ProviderPill component
 */
export interface ProviderPillProps {
  provider: ProviderHealth;
}

/**
 * Props for EmptyState component
 */
export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

/**
 * Provider status configuration
 */
export interface ProviderStatusConfig {
  bg: string;
  text: string;
  dot: string;
}

/**
 * Campaign status type
 */
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "paused" | "cancelled";

/**
 * Automation status type
 */
export type AutomationStatus = "active" | "paused" | "draft";

/**
 * View mode for list/grid toggle
 */
export type ViewMode = "grid" | "list";

/**
 * Tab configuration type
 */
export interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

/**
 * Email type option configuration
 */
export interface EmailTypeOption {
  value: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * Provider option configuration
 */
export interface ProviderOption {
  value: string;
  label: string;
  description: string;
  color: string;
}
