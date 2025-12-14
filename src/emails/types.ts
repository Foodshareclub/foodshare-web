/**
 * Email Template Types
 *
 * Type definitions for all email templates.
 */

export type EmailTemplateName =
  | "welcome-confirmation"
  | "password-reset"
  | "magic-link"
  | "new-message"
  | "listing-interest"
  | "pickup-reminder"
  | "review-request"
  | "listing-expired"
  | "weekly-digest";

// Props for each template
export interface WelcomeConfirmationProps {
  confirmationUrl: string;
}

export interface PasswordResetProps {
  confirmationUrl: string;
}

export interface MagicLinkProps {
  confirmationUrl: string;
}

export interface NewMessageProps {
  senderName: string;
  senderAvatar: string;
  messagePreview: string;
  conversationUrl: string;
  listingTitle?: string;
  listingImage?: string;
  listingType?: string;
  unsubscribeUrl?: string;
}

export interface ListingInterestProps {
  interestedUserName: string;
  interestedUserAvatar: string;
  interestedUserRating: string;
  interestedUserShares: string;
  listingTitle: string;
  listingImage: string;
  listingType: string;
  listingLocation: string;
  messageUrl: string;
  listingUrl: string;
}

export interface PickupReminderProps {
  pickupTime: string;
  pickupDate: string;
  listingTitle: string;
  listingImage: string;
  sharerName: string;
  pickupAddress: string;
  pickupInstructions?: string;
  directionsUrl: string;
  messageUrl: string;
}

export interface ReviewRequestProps {
  recipientName: string;
  sharerName: string;
  listingTitle: string;
  listingImage: string;
  pickupDate: string;
  reviewUrl: string;
  review1StarUrl?: string;
  review2StarUrl?: string;
  review3StarUrl?: string;
  review4StarUrl?: string;
  review5StarUrl?: string;
}

export interface ListingExpiredProps {
  userName: string;
  listingTitle: string;
  listingImage: string;
  listingType: string;
  expiryDate: string;
  renewUrl: string;
  editUrl: string;
  markSharedUrl: string;
}

export interface ListingPreview {
  title: string;
  image: string;
  distance: string;
  url: string;
}

export interface WeeklyDigestProps {
  weekRange: string;
  itemsShared: string;
  foodSaved: string;
  co2Saved: string;
  communityFoodSaved: string;
  listings: ListingPreview[];
  exploreUrl: string;
}

// Union type for all template props
export type EmailTemplateProps =
  | { template: "welcome-confirmation"; props: WelcomeConfirmationProps }
  | { template: "password-reset"; props: PasswordResetProps }
  | { template: "magic-link"; props: MagicLinkProps }
  | { template: "new-message"; props: NewMessageProps }
  | { template: "listing-interest"; props: ListingInterestProps }
  | { template: "pickup-reminder"; props: PickupReminderProps }
  | { template: "review-request"; props: ReviewRequestProps }
  | { template: "listing-expired"; props: ListingExpiredProps }
  | { template: "weekly-digest"; props: WeeklyDigestProps };
