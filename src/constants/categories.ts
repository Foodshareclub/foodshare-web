/**
 * Category definitions for navigation and filtering
 * IDs match URL paths (plural form where applicable)
 */

import {
  Apple,
  Gift,
  HandHelping,
  PackageSearch,
  Warehouse,
  Refrigerator,
  Recycle,
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
  { id: "things", labelKey: "categories.things", icon: Gift },
  { id: "borrow", labelKey: "categories.borrow", icon: HandHelping },
  { id: "wanted", labelKey: "categories.wanted", icon: PackageSearch },
  { id: "foodbanks", labelKey: "categories.foodbanks", icon: Warehouse },
  { id: "fridges", labelKey: "categories.fridges", icon: Refrigerator },
  { id: "zerowaste", labelKey: "categories.zerowaste", icon: Recycle },
  { id: "vegan", labelKey: "categories.vegan", icon: Sprout },
  { id: "organisations", labelKey: "categories.organisations", icon: Landmark },
  { id: "volunteers", labelKey: "categories.volunteers", icon: HeartHandshake },
  { id: "challenges", labelKey: "categories.challenges", icon: Trophy },
  { id: "forum", labelKey: "categories.forum", icon: MessageSquare },
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
