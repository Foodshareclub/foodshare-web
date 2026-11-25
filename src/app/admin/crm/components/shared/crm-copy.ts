export type ViewType = "overview" | "customers" | "segments" | "campaigns" | "automation";

export interface CRMCustomer {
  id: string;
  profile_id: string;
  status: string;
  lifecycle_stage: string;
  engagement_score: number;
  churn_risk_score: number;
  total_transactions: number;
  last_interaction_at: string | null;
  created_at: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export interface CRMTag {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

export interface CRMStats {
  totalCustomers: number;
  activeCustomers: number;
  atRiskCustomers: number;
  newThisWeek: number;
}

export interface CRMCampaign {
  id: string;
  name: string;
  subject: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "paused" | "cancelled";
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
}

export interface CRMSegment {
  id: string;
  name: string;
  description: string | null;
  cached_count: number;
  color: string;
  icon_name: string;
  is_system: boolean;
}

export interface CRMAutomationFlow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  status: "draft" | "active" | "paused" | "archived";
  total_enrolled: number;
  total_completed: number;
  total_converted: number;
}

export interface CRMNewsletterStats {
  totalCampaigns: number;
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  totalSubscribers: number;
  activeAutomations: number;
}

export interface CRMDashboardProps {
  customers: CRMCustomer[];
  tags: CRMTag[];
  stats: CRMStats;
  campaigns?: CRMCampaign[];
  segments?: CRMSegment[];
  automations?: CRMAutomationFlow[];
  newsletterStats?: CRMNewsletterStats;
}

export const TRIGGER_TYPE_LABELS: Record<string, string> = {
  user_signup: "User signs up",
  first_listing: "First listing created",
  first_share: "First share completed",
  inactivity: "User inactive",
  milestone: "Milestone reached",
  segment_entry: "Enters segment",
  manual: "Manual trigger",
  scheduled: "Scheduled",
};

export const SEGMENT_IDEAS = [
  { name: "High Engagement", desc: "Users with 70+ engagement score" },
  { name: "Dormant Champions", desc: "Champions inactive for 14+ days" },
  { name: "First-time Sharers", desc: "Users who shared their first item" },
  { name: "Power Users", desc: "5+ transactions in last 30 days" },
] as const;

export const RECOMMENDED_AUTOMATIONS = [
  { name: "Review Request", trigger: "After successful food share", desc: "Ask for feedback 24h after pickup" },
  { name: "Milestone Celebration", trigger: "User reaches 10 shares", desc: "Celebrate achievements with badges" },
  { name: "Inactivity Alert", trigger: "No activity for 14 days", desc: "Gentle reminder to stay engaged" },
  { name: "New Listing Nearby", trigger: "Listing within 5km", desc: "Notify users of nearby food" },
] as const;

export const ENGAGEMENT_BUCKETS = [
  { range: "0-20%", color: "bg-rose-500" },
  { range: "21-40%", color: "bg-orange-500" },
  { range: "41-60%", color: "bg-amber-500" },
  { range: "61-80%", color: "bg-emerald-500" },
  { range: "81-100%", color: "bg-blue-500" },
] as const;

export const CRM_COPY = {
  title: "Customer Engagement",
  subtitle: "Manage relationships and drive engagement",
  importingLabel: "Importing...",
  syncProfilesLabel: "Sync Profiles",
  newCampaignLabel: "New Campaign",
  totalCustomers: "Total Customers",
  activeLabel: "Active",
  atRiskLabel: "At Risk",
  newThisWeekLabel: "New This Week",
  quickSegments: "Quick Segments",
  viewAll: "View All",
  recentCampaigns: "Recent Campaigns",
  activeAutomations: "Active Automations",
  topCustomers: "Top Customers",
  searchPlaceholder: "Search customers...",
  lifecyclePlaceholder: "Lifecycle",
  allStages: "All Stages",
  stageLead: "Lead",
  stageActive: "Active",
  stageChampion: "Champion",
  stageAtRisk: "At Risk",
  stageChurned: "Churned",
  customersSuffix: "customers",
  ofConnector: "of",
  noCustomersYetImport: "No customers yet. Import profiles to get started.",
  noCustomersMatch: "No customers match your filters.",
  viewProfile: "View Profile",
  sendEmail: "Send Email",
  addNote: "Add Note",
  manageTags: "Manage Tags",
  viewSegment: "View Segment",
  sentLabel: "Sent",
  openedLabel: "Opened",
  clickedLabel: "Clicked",
  enrolledSuffix: "enrolled",
  completedSuffix: "completed",
  conversionSuffix: "conversion",
  segmentsSubtitle: "Create targeted segments for personalized engagement",
  createSegment: "Create Segment",
  createNewSegment: "Create New Segment",
  createNewSegmentDesc: "Define custom criteria to target specific users",
  suggestedSegments: "Suggested Segments",
  createButton: "Create",
  campaignsSubtitle: "Create and manage email campaigns",
  totalSent30d: "Total Sent (30d)",
  avgOpenRate: "Avg Open Rate",
  avgClickRate: "Avg Click Rate",
  subscribersLabel: "Subscribers",
  createCampaign: "Create Campaign",
  createCampaignDesc: "Send newsletters, announcements, or promotions",
  quickTemplatesTitle: "Quick Start Templates",
  automationSubtitle: "Set up automated workflows to engage users at the right time",
  createAutomation: "Create Automation",
  activeFlows: "Active Flows",
  totalEnrolled: "Total Enrolled",
  avgConversion: "Avg Conversion",
  recommendedAutomations: "Recommended Automations",
  setupButton: "Setup",
  riskSuffix: "% risk",
  unknownUser: "Unknown",
  neverLabel: "Never",
  lowLabel: "Low",
  mediumLabel: "Medium",
  highLabel: "High",
} as const;
