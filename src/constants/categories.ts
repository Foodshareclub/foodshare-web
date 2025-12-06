/**
 * Category definitions for navigation and filtering
 * IDs match URL paths (plural form where applicable)
 */

// Order: Food basics → Community resources → Lifestyle → Engagement → Forum
export const CATEGORIES = [
  { id: 'food', labelKey: 'categories.food', icon: '🍎' },
  { id: 'things', labelKey: 'categories.things', icon: '🎁' },
  { id: 'borrow', labelKey: 'categories.borrow', icon: '🔧' },
  { id: 'wanted', labelKey: 'categories.wanted', icon: '📦' },
  { id: 'foodbanks', labelKey: 'categories.foodbanks', icon: '🏠' },
  { id: 'fridges', labelKey: 'categories.fridges', icon: '❄️' },
  { id: 'zerowaste', labelKey: 'categories.zerowaste', icon: '♻️' },
  { id: 'vegan', labelKey: 'categories.vegan', icon: '🌱' },
  { id: 'organisations', labelKey: 'categories.organisations', icon: '🏛️' },
  { id: 'volunteers', labelKey: 'categories.volunteers', icon: '🙌🏻' },
  { id: 'challenges', labelKey: 'categories.challenges', icon: '🏆' },
  { id: 'community', labelKey: 'categories.community', icon: '💬' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export interface Category {
  id: CategoryId;
  labelKey: string;
  icon: string;
}

/** Get category by ID */
export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.id === id);
}

/** Default category */
export const DEFAULT_CATEGORY: CategoryId = 'food';
