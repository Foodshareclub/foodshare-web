/**
 * Re-export shared packages for easy migration
 * This file helps transition from local utils to shared packages
 */

// Types
export type { User, Listing, Review, ApiResponse } from "@foodshare/types";

// Validation
export {
  userSchema,
  createUserSchema,
  updateUserSchema,
  listingSchema,
  createListingSchema,
  updateListingSchema,
  reviewSchema,
  createReviewSchema,
  emailSchema,
  uuidSchema,
  paginationSchema,
  coordinatesSchema,
} from "@foodshare/validation";

// Utils
export {
  formatDate,
  formatDateTime,
  timeAgo,
  formatNumber,
  formatCurrency,
  truncate,
  getDistanceInKm,
  formatDistance,
  capitalize,
  slugify,
  randomString,
} from "@foodshare/utils";

// UI Components
export { Button, cn } from "@foodshare/ui";
