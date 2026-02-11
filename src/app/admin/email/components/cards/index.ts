/**
 * Email CRM Dashboard Cards
 * Card components for displaying campaigns, automations, providers, etc.
 */

// Local card components
export { CampaignListItem } from "./CampaignListItem";
export { AutomationListItem } from "./AutomationListItem";
export { AutomationCardEnhanced } from "./AutomationCardEnhanced";
export { QueueControlCard } from "./QueueControlCard";
export { ProviderPerformanceCard } from "./ProviderPerformanceCard";
export { RoutingRule } from "./RoutingRule";
export { CampaignTableRow } from "./CampaignTableRow";
export { CampaignForm } from "./CampaignForm";

// Re-export from canonical locations
export { SegmentCard } from "../audience/SegmentCard";
export { SystemSegmentCard } from "../audience/SystemSegmentCard";
export { ProviderDetailCard, ProviderConfigCard } from "../shared/ProviderComponents";
export { CampaignCard } from "../campaign/CampaignCard";
