/**
 * Email Automation Types and Constants
 * Shared between client and server components
 */

export interface AutomationFlow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  status: "draft" | "active" | "paused" | "archived";
  steps: AutomationStep[];
  total_enrolled: number;
  total_completed: number;
  total_converted: number;
  conversion_goal: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationStep {
  type: "email" | "delay" | "condition" | "action";
  delay_minutes?: number;
  template_slug?: string;
  subject?: string;
  content?: string;
  condition?: {
    field: string;
    operator: string;
    value: unknown;
  };
}

export interface AutomationEnrollment {
  id: string;
  flow_id: string;
  profile_id: string;
  status: "active" | "completed" | "exited" | "paused";
  current_step: number;
  enrolled_at: string;
  completed_at: string | null;
  exited_at: string | null;
  exit_reason: string | null;
  converted: boolean;
  converted_at: string | null;
  step_history: Array<{
    step: number;
    processed_at: string;
    status: string;
  }>;
  profile?: {
    email: string;
    first_name: string;
    nickname: string;
    avatar_url: string;
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  html_content: string;
  plain_text_content: string | null;
  category: "automation" | "transactional" | "marketing" | "system";
  variables: string[];
  is_active: boolean;
  created_at: string;
}

export interface AutomationQueueItem {
  id: string;
  enrollment_id: string;
  flow_id: string;
  profile_id: string;
  step_index: number;
  scheduled_for: string;
  status: "pending" | "processing" | "sent" | "failed" | "cancelled";
  attempts: number;
  sent_at: string | null;
  error_message: string | null;
  email_data: Record<string, unknown>;
}

// Trigger type labels and descriptions
export const TRIGGER_TYPES = {
  user_signup: { label: "User Signup", description: "When a new user registers", icon: "UserPlus" },
  first_listing: {
    label: "First Listing",
    description: "When user creates first food listing",
    icon: "Package",
  },
  first_share: {
    label: "First Share",
    description: "When user completes first share",
    icon: "Heart",
  },
  inactivity: {
    label: "Inactivity",
    description: "When user is inactive for X days",
    icon: "Clock",
  },
  food_listed_nearby: {
    label: "Food Alert",
    description: "When food is listed near user",
    icon: "MapPin",
  },
  food_reserved: {
    label: "Food Reserved",
    description: "When user reserves food",
    icon: "CheckCircle",
  },
  food_collected: {
    label: "Food Collected",
    description: "When pickup is completed",
    icon: "Star",
  },
  message_received: {
    label: "New Message",
    description: "When user receives a chat message",
    icon: "MessageCircle",
  },
  profile_incomplete: {
    label: "Profile Incomplete",
    description: "When profile is missing info",
    icon: "AlertCircle",
  },
  milestone_reached: {
    label: "Milestone",
    description: "When user reaches a milestone",
    icon: "Trophy",
  },
  segment_entry: {
    label: "Segment Entry",
    description: "When user enters a segment",
    icon: "Users",
  },
  manual: { label: "Manual", description: "Manually triggered", icon: "Hand" },
  scheduled: { label: "Scheduled", description: "Run on a schedule", icon: "Calendar" },
} as const;
