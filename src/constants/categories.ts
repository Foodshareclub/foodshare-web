/**
 * Category definitions for navigation and filtering
 * IDs match URL paths (plural form where applicable)
 */

import {
  Apple,
  BarChart3,
  HandHelping,
  HeartHandshake,
  LampDesk,
  Landmark,
  type LucideIcon,
  MessageSquare,
  PackageSearch,
  Recycle,
  Refrigerator,
  Sprout,
  Trophy,
  Warehouse,
} from "lucide-react";

// Order: Food basics → Community resources → Lifestyle → Engagement → Forum
export const CATEGORIES = [
  { id: "food", labelKey: "categories.food", icon: Apple },
  { id: "thing", labelKey: "categories.things", icon: LampDesk },
  { id: "borrow", labelKey: "categories.borrow", icon: HandHelping },
  { id: "wanted", labelKey: "categories.wanted", icon: PackageSearch },
  { id: "foodbank", labelKey: "categories.foodbanks", icon: Warehouse },
  { id: "fridge", labelKey: "categories.fridges", icon: Refrigerator },
  { id: "zerowaste", labelKey: "categories.zerowaste", icon: Recycle },
  { id: "vegan", labelKey: "categories.vegan", icon: Sprout },
  { id: "organisation", labelKey: "categories.organisations", icon: Landmark },
  { id: "volunteer", labelKey: "categories.volunteers", icon: HeartHandshake },
  { id: "challenge", labelKey: "categories.challenges", icon: Trophy },
  { id: "forum", labelKey: "categories.forum", icon: MessageSquare },
  { id: "foodlytics", labelKey: "categories.foodlytics", icon: BarChart3 },
] as const;

export type CategoryIcon = LucideIcon;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export interface Category {
  id: CategoryId;
  labelKey: string;
  icon: LucideIcon;
}

/** Get category by ID */
export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.id === id);
}

/** Default category */
export const DEFAULT_CATEGORY: CategoryId = "food";

/**
 * Canonical post_type options with display labels and semantic badge classes
 * for admin tables, edit modals, and chat room filters.
 */
export const LISTING_CATEGORY_OPTIONS = [
  { value: "food", label: "Food", badgeClass: "bg-emerald-100 text-emerald-700" },
  { value: "thing", label: "Things", badgeClass: "bg-blue-100 text-blue-700" },
  { value: "borrow", label: "Borrow", badgeClass: "bg-violet-100 text-violet-700" },
  { value: "wanted", label: "Wanted", badgeClass: "bg-amber-100 text-amber-700" },
  { value: "fridge", label: "Community Fridge", badgeClass: "bg-cyan-100 text-cyan-700" },
  { value: "foodbank", label: "Food Bank", badgeClass: "bg-rose-100 text-rose-700" },
  { value: "volunteer", label: "Volunteer", badgeClass: "bg-pink-100 text-pink-700" },
  { value: "zerowaste", label: "Zero Waste", badgeClass: "bg-lime-100 text-lime-700" },
  { value: "vegan", label: "Vegan", badgeClass: "bg-green-100 text-green-700" },
  { value: "organisation", label: "Organisation", badgeClass: "bg-indigo-100 text-indigo-700" },
] as const;
