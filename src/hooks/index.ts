/**
 * Hooks Barrel Export
 */

// Main application hooks (using TanStack Query + Zustand)
export * from "./useTheme";

// TanStack Query hooks (all except useAuth which has a wrapper)
export {
  // Auth queries (individual hooks, not the combined useAuth)
  authKeys,
  useSession,
  useIsAdmin,
  useSignIn,
  useSignUp,
  useSignOut,
  useSignInWithOtp,
  useSignInWithProvider,
  useRequestPasswordReset,
  useUpdatePassword,
  // Profile
  profileKeys,
  useProfile,
  useOtherProfile,
  useVolunteers,
  useAddress,
  useAvatar,
  useUpdateProfile,
  useUpdateAddress,
  useUploadAvatar,
  useCurrentProfile,
  // Products
  productKeys,
  useProducts,
  useProductsLocation,
  useAllProducts,
  useProduct,
  useUserProducts,
  useSearchProducts,
  useProductImage,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useProductsManager,
  // Chat
  chatKeys,
  useRooms,
  useRoom,
  useMessages,
  useRoomAvailability,
  useCreateRoom,
  useSendMessage,
  useUpdateRoom,
  useWriteReview,
  useChatRealtime,
  useChat,
  // Forum
  forumKeys,
  useForumCategories,
  useForumTags,
  useReactionTypes,
  useForumPosts,
  useForumPost,
  useForumPostBySlug,
  useForumComments,
  useForumNotifications,
  useForumUserStats,
  useCreateForumPost,
  useUpdateForumPost,
  useDeleteForumPost,
  useCreateComment,
  useAddReaction,
  useRemoveReaction,
  useMarkNotificationRead,
  useForum,
  // Admin
  adminKeys,
  useDashboardStats,
  useAdminListings,
  useAdminListing,
  useFlaggedListings,
  useAuditLogs,
  useAdminUsers,
  useApproveListing,
  useRejectListing,
  useFlagListing,
  useUpdateListingStatus,
  useDeleteListing,
  useAdmin,
} from "./queries";

// Wrapper useAuth hook with backward-compatible API
export { useAuth } from "./useAuth";

// Utility hooks
export * from "./useDebounce";
export * from "./useMediaQuery";
export * from "./usePosition";
export * from "./useCustomBoolean";
export * from "./useEvent";
export * from "./useLatest";
export * from "./useGridSize";
export * from "./useScrollCompact";
export * from "./useAdvancedScroll";
export * from "./useHighRefreshRate";
export * from "./useRAFThrottle";
export * from "./useDistanceWorker";
export * from "./useProductDistanceCalculation";
export * from "./useSearchSuggestions";
export * from "./getAllCountries";
export * from "./useMarkerIcon";
