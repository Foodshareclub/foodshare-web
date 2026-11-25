export type FilterStatus = "all" | "active" | "inactive";
export type SortOption = "newest" | "oldest" | "name" | "views";

export const STATUS_OPTIONS = [
  { value: "all" as const, label: "All Status", icon: "🔘" },
  { value: "active" as const, label: "Active", icon: "✅" },
  { value: "inactive" as const, label: "Inactive", icon: "⏸️" },
] as const;

export const SORT_OPTIONS = [
  { value: "newest" as const, label: "Newest First", icon: "🕐" },
  { value: "oldest" as const, label: "Oldest First", icon: "📅" },
  { value: "name" as const, label: "Name (A-Z)", icon: "🔤" },
  { value: "views" as const, label: "Most Popular", icon: "👁️" },
] as const;

export const USER_LISTINGS_COPY = {
  title: "My Listings",
  subtitle: "Manage your shared items and food",
  mobileSubtitle: "Manage your shared items",
  refreshTitle: "Refresh listings",
  statsTotal: "Total",
  statsActive: "Active",
  statsInactive: "Inactive",
  totalSuffix: "total",
  searchPlaceholder: "Search your listings...",
  clearSearchLabel: "Clear search",
  filtersLabel: "Filters",
  filterSortTitle: "Filter & Sort",
  typeLabel: "Type",
  allLabel: "All",
  allTypesBadge: "📋 All Types",
  allTypesItem: "All Types",
  allTypesIcon: "📋",
  filterByType: "Filter by type",
  statusLabel: "Status",
  filterByStatus: "Filter by status",
  sortByLabel: "Sort by",
  sortListingsLabel: "Sort listings",
  clearAllFilters: "Clear all filters",
  clearShort: "Clear",
  ofConnector: "of",
  emptyNoListingsEmoji: "📦",
  emptyNoListingsTitle: "No listings yet",
  emptyNoListingsBody: "Start sharing food or items with your community and make a difference!",
  emptyNoListingsCta: "Create Your First Listing",
  emptyNoMatchesEmoji: "🔍",
  emptyNoMatchesTitle: "No matches found",
  emptyNoMatchesBody: "Try adjusting your filters to find what you're looking for.",
  inactiveBadge: "⏸️ Inactive",
} as const;
