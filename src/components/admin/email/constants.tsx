/**
 * Email CRM Dashboard Constants
 * Shared constants for the email CRM dashboard components
 */

import {
  BarChart3,
  Megaphone,
  Zap,
  Users,
  Send,
  Settings,
  FileText,
  Inbox,
  Heart,
  Star,
  Clock,
  CheckCircle2,
} from "lucide-react";

import type { TabConfig, EmailTypeOption, ProviderOption, ProviderStatusConfig } from "./types";
import type { EmailDashboardStats } from "@/lib/data/admin-email";

/**
 * Dashboard tab configuration
 */
export const TABS: TabConfig[] = [
  {
    id: "overview",
    label: "Overview",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Dashboard & metrics",
  },
  {
    id: "campaigns",
    label: "Campaigns",
    icon: <Megaphone className="h-4 w-4" />,
    description: "Email campaigns",
  },
  {
    id: "automation",
    label: "Automation",
    icon: <Zap className="h-4 w-4" />,
    description: "Automated flows",
  },
  {
    id: "audience",
    label: "Audience",
    icon: <Users className="h-4 w-4" />,
    description: "Segments & subscribers",
  },
  {
    id: "compose",
    label: "Compose",
    icon: <Send className="h-4 w-4" />,
    description: "Send emails",
  },
  {
    id: "providers",
    label: "Providers",
    icon: <Settings className="h-4 w-4" />,
    description: "Email providers",
  },
];

/**
 * Email type options for the compose form
 */
export const EMAIL_TYPES: EmailTypeOption[] = [
  { value: "newsletter", label: "Newsletter", icon: <FileText className="h-4 w-4" /> },
  { value: "announcement", label: "Announcement", icon: <Megaphone className="h-4 w-4" /> },
  { value: "chat", label: "Chat Notification", icon: <Inbox className="h-4 w-4" /> },
  { value: "food_listing", label: "Food Listing", icon: <Heart className="h-4 w-4" /> },
  { value: "feedback", label: "Feedback Request", icon: <Star className="h-4 w-4" /> },
  { value: "review_reminder", label: "Review Reminder", icon: <Clock className="h-4 w-4" /> },
  { value: "auth", label: "Authentication", icon: <CheckCircle2 className="h-4 w-4" /> },
];

/**
 * Email provider options
 */
export const PROVIDERS: ProviderOption[] = [
  {
    value: "auto",
    label: "Smart Routing",
    description: "Auto-select best provider",
    color: "violet",
  },
  { value: "brevo", label: "Brevo", description: "Primary (300/day)", color: "blue" },
  { value: "resend", label: "Resend", description: "Auth emails (100/day)", color: "emerald" },
  {
    value: "mailersend",
    label: "MailerSend",
    description: "High volume (400/day)",
    color: "green",
  },
  { value: "aws_ses", label: "AWS SES", description: "Failover (100/day)", color: "amber" },
];

/**
 * Provider display names
 */
export const PROVIDER_NAMES: Record<string, string> = {
  brevo: "Brevo",
  resend: "Resend",
  mailersend: "MailerSend",
  aws_ses: "AWS SES",
};

/**
 * Provider status configuration for styling
 */
export const PROVIDER_STATUS_CONFIG: Record<string, ProviderStatusConfig> = {
  healthy: {
    bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  degraded: {
    bg: "bg-amber-500/10 hover:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  down: {
    bg: "bg-rose-500/10 hover:bg-rose-500/20",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

/**
 * Campaign status configuration
 */
export const CAMPAIGN_STATUS_CONFIG = {
  draft: {
    label: "Draft",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  scheduled: {
    label: "Scheduled",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  sending: {
    label: "Sending",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  sent: {
    label: "Sent",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  paused: {
    label: "Paused",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  },
};

/**
 * Automation status configuration
 */
export const AUTOMATION_STATUS_CONFIG = {
  active: {
    label: "Active",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  paused: {
    label: "Paused",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  draft: {
    label: "Draft",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

/**
 * Default provider health data for empty state
 */
export const DEFAULT_PROVIDER_HEALTH = [
  {
    provider: "brevo" as const,
    healthScore: 100,
    successRate: 100,
    avgLatencyMs: 0,
    totalRequests: 0,
    status: "healthy" as const,
  },
  {
    provider: "resend" as const,
    healthScore: 100,
    successRate: 100,
    avgLatencyMs: 0,
    totalRequests: 0,
    status: "healthy" as const,
  },
  {
    provider: "mailersend" as const,
    healthScore: 100,
    successRate: 100,
    avgLatencyMs: 0,
    totalRequests: 0,
    status: "healthy" as const,
  },
  {
    provider: "aws_ses" as const,
    healthScore: 100,
    successRate: 100,
    avgLatencyMs: 0,
    totalRequests: 0,
    status: "healthy" as const,
  },
];

/**
 * Get default stats for empty state
 */
export function getDefaultStats(): EmailDashboardStats {
  return {
    totalSubscribers: 0,
    activeSubscribers: 0,
    emailsSent30d: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    unsubscribeRate: 0,
    bounceRate: 0,
    activeCampaigns: 0,
    activeAutomations: 0,
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 500,
    monthlyQuotaUsed: 0,
    monthlyQuotaLimit: 15000,
    suppressedEmails: 0,
  };
}

/**
 * Animation variants for tab panels
 */
export const TAB_PANEL_VARIANTS = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

/**
 * Animation transition for tab panels
 */
export const TAB_PANEL_TRANSITION = {
  duration: 0.15,
  ease: "easeOut" as const,
};
