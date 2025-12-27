/**
 * Constants for Email CRM components
 */

import React from "react";
import { BarChart3, Mail, Zap, Users, Send, Settings } from "lucide-react";
import type { TabType } from "./types";

export const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: React.createElement(BarChart3, { className: "h-4 w-4" }),
  },
  {
    id: "campaigns",
    label: "Campaigns",
    icon: React.createElement(Mail, { className: "h-4 w-4" }),
  },
  {
    id: "automation",
    label: "Automation",
    icon: React.createElement(Zap, { className: "h-4 w-4" }),
  },
  { id: "audience", label: "Audience", icon: React.createElement(Users, { className: "h-4 w-4" }) },
  { id: "compose", label: "Compose", icon: React.createElement(Send, { className: "h-4 w-4" }) },
  {
    id: "providers",
    label: "Providers",
    icon: React.createElement(Settings, { className: "h-4 w-4" }),
  },
];

export const EMAIL_TYPES = [
  { value: "newsletter", label: "Newsletter" },
  { value: "announcement", label: "Announcement" },
  { value: "chat", label: "Chat Notification" },
  { value: "food_listing", label: "Food Listing" },
  { value: "feedback", label: "Feedback Request" },
  { value: "review_reminder", label: "Review Reminder" },
  { value: "auth", label: "Authentication" },
];

export const PROVIDERS = [
  { value: "auto", label: "Smart Routing", description: "Auto-select best provider" },
  { value: "brevo", label: "Brevo", description: "Primary (300/day)" },
  { value: "resend", label: "Resend", description: "Auth emails (100/day)" },
  { value: "aws_ses", label: "AWS SES", description: "Failover (100/day)" },
];

// Provider display names
export const PROVIDER_NAMES: Record<string, string> = {
  brevo: "Brevo",
  resend: "Resend",
  aws_ses: "AWS SES",
  auto: "Smart Routing",
};

// Provider status styling configuration
export const PROVIDER_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  healthy: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  degraded: {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  down: {
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

// Tab panel animation variants
export const TAB_PANEL_VARIANTS = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const TAB_PANEL_TRANSITION = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1] as const, // cubic-bezier easing
};

// Default provider health data for empty state
export const DEFAULT_PROVIDER_HEALTH: Array<{
  provider: "brevo" | "resend" | "aws_ses" | "mailersend";
  healthScore: number;
  successRate: number;
  avgLatencyMs: number;
  totalRequests: number;
  status: "healthy" | "degraded" | "down";
}> = [
  {
    provider: "brevo",
    healthScore: 100,
    successRate: 100,
    avgLatencyMs: 0,
    totalRequests: 0,
    status: "healthy",
  },
  {
    provider: "resend",
    healthScore: 100,
    successRate: 100,
    avgLatencyMs: 0,
    totalRequests: 0,
    status: "healthy",
  },
];

// Default stats for empty state
export function getDefaultStats() {
  return {
    totalSubscribers: 0,
    activeSubscribers: 0,
    emailsSent30d: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 500,
    monthlyQuotaUsed: 0,
    monthlyQuotaLimit: 10000,
    unsubscribeRate: 0,
    bounceRate: 0,
    activeCampaigns: 0,
    activeAutomations: 0,
    suppressedEmails: 0,
  };
}
