/**
 * Category definitions for navigation and filtering
 * IDs match URL paths (plural form where applicable)
 */

import {
  Apple,
  HandHelping,
  LampDesk,
  PackageSearch,
  Warehouse,
  Refrigerator,
  Recycle,
  BarChart3,
  Sprout,
  Landmark,
  HeartHandshake,
  Trophy,
  MessageSquare,
  type LucideIcon,
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
