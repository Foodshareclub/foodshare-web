/**
 * Email System Constants
 * Centralized configuration for email management
 */

import type { EmailProvider, EmailType } from "./types";

// Provider Configuration
export const PROVIDER_LIMITS: Record<EmailProvider, number> = {
  resend: 100,
  brevo: 300,
  mailersend: 400,
  aws_ses: 100,
} as const;

export const TOTAL_DAILY_CAPACITY = 900;

// Provider Display Names
export const PROVIDER_NAMES: Record<EmailProvider, string> = {
  resend: "Resend",
  brevo: "Brevo",
  mailersend: "MailerSend",
  aws_ses: "AWS SES",
} as const;

// Provider Colors (for UI)
export const PROVIDER_COLORS: Record<EmailProvider, string> = {
  resend: "blue",
  brevo: "purple",
  mailersend: "green",
  aws_ses: "orange",
} as const;

// Email Type Display Names
export const EMAIL_TYPE_NAMES: Record<EmailType, string> = {
  auth: "Authentication",
  chat: "Chat Notification",
  food_listing: "Food Listing",
  feedback: "Feedback",
  review_reminder: "Review Reminder",
  newsletter: "Newsletter",
  announcement: "Announcement",
} as const;

// Quota Thresholds
export const QUOTA_THRESHOLDS = {
  WARNING: 0.8, // 80%
  CRITICAL: 1.0, // 100%
} as const;

// Refresh Intervals (milliseconds)
export const REFRESH_INTERVALS = {
  QUOTA_DASHBOARD: 30000, // 30 seconds
  EMAIL_STATS: 60000, // 1 minute
  EMAIL_HISTORY: 15000, // 15 seconds
} as const;

// Pagination
export const PAGE_SIZES = {
  EMAIL_LOGS: 50,
  QUEUE_ITEMS: 50,
  HISTORY_DEFAULT: 100,
} as const;

// Status Colors
export const STATUS_COLORS = {
  sent: "green",
  delivered: "green",
  failed: "red",
  bounced: "red",
  queued: "blue",
  processing: "yellow",
} as const;

// Provider Priority by Email Type
export const PROVIDER_PRIORITY: Record<EmailType, EmailProvider[]> = {
  auth: ["resend", "brevo", "mailersend", "aws_ses"],
  chat: ["brevo", "mailersend", "aws_ses", "resend"],
  food_listing: ["brevo", "mailersend", "aws_ses", "resend"],
  feedback: ["brevo", "mailersend", "aws_ses", "resend"],
  review_reminder: ["brevo", "mailersend", "aws_ses", "resend"],
  newsletter: ["brevo", "mailersend", "aws_ses", "resend"],
  announcement: ["brevo", "mailersend", "aws_ses", "resend"],
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  QUOTA_FETCH_FAILED: "Failed to fetch provider quotas",
  STATS_FETCH_FAILED: "Failed to fetch email statistics",
  LOGS_FETCH_FAILED: "Failed to fetch email logs",
  QUEUE_FETCH_FAILED: "Failed to fetch queue items",
  SEND_FAILED: "Failed to send email",
  RETRY_FAILED: "Failed to retry email",
  DELETE_FAILED: "Failed to delete email",
  ALL_PROVIDERS_EXHAUSTED: "All email providers have reached their daily quota",
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  EMAIL_SENT: "Email queued successfully!",
  EMAIL_RETRIED: "Email re-queued for retry",
  EMAIL_DELETED: "Email deleted from queue",
  QUOTA_RESET: "Provider quota reset",
} as const;

// Time Formats
export const TIME_FORMATS = {
  FULL: "MMM dd, yyyy HH:mm:ss",
  SHORT: "HH:mm:ss",
  DATE_ONLY: "MMM dd, yyyy",
} as const;
