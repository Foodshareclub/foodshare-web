/**
 * Subscription (Apple/StoreKit) utilities barrel.
 *
 * Note: `apple-notifications.ts` re-declares `SubscriptionStatus`,
 * `hasPremiumAccess`, and `shouldUpdateSubscription` with Apple-specific
 * shapes — canonical re-exports are `types.ts`; import
 * `apple-notifications.ts` deep for its variants.
 */

export * from "./types.ts";
export * from "./apple-jws.ts";
export {
  type Environment,
  type ExternalPurchaseTokenData,
  getNotificationDescription,
  type JWSRenewalInfoDecodedPayload,
  type JWSTransactionDecodedPayload,
  mapNotificationToStatus,
  type NotificationData,
  type NotificationSubtype,
  type NotificationType,
  parseAppAccountToken,
  type ResponseBodyV2DecodedPayload,
  type SummaryData,
  type TransactionType,
} from "./apple-notifications.ts";
