/**
 * useProfile Hook
 * Profile management hook using TanStack Query
 * Following ultrathink principles for clear separation of concerns
 */

import { useCallback } from "react";
import {
  useProfile as useProfileQuery,
  useVolunteers as useVolunteersQuery,
  useAddress as useAddressQuery,
  useAvatar as useAvatarQuery,
  useUpdateProfile as useUpdateProfileMutation,
  useUpdateAddress as useUpdateAddressMutation,
  useUploadAvatar as useUploadAvatarMutation,
} from "@/hooks/queries";
import type { ProfileType, AddressType } from "@/api/profileAPI";

export const useProfile = (userId?: string) => {
  // ========================================================================
  // TanStack Query Hooks
  // ========================================================================

  const profileQuery = useProfileQuery(userId);
  const volunteersQuery = useVolunteersQuery();
  const addressQuery = useAddressQuery(userId);
  const avatarQuery = useAvatarQuery(profileQuery.data?.avatar_url);

  const updateProfileMutation = useUpdateProfileMutation();
  const updateAddressMutation = useUpdateAddressMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();

  // ========================================================================
  // Derived State
  // ========================================================================

  const currentProfile = profileQuery.data ?? null;
  const volunteers = volunteersQuery.data ?? [];
  const address = addressQuery.data ?? null;
  const avatarUrl = avatarQuery.data ?? null;
  const isUpdating = updateProfileMutation.isPending || updateAddressMutation.isPending || uploadAvatarMutation.isPending;
  const updateStatus = updateProfileMutation.isSuccess ? "success" : updateProfileMutation.isError ? "error" : null;
  const updateMessage = updateProfileMutation.error?.message ?? null;

  // ========================================================================
  // Actions
  // ========================================================================

  /**
   * Fetch current user's profile (triggers refetch)
   */
  const loadProfile = useCallback(
    async (profileUserId: string) => {
      // With TanStack Query, just refetch the profile query
      await profileQuery.refetch();
      return true;
    },
    [profileQuery]
  );

  /**
   * Fetch another user's profile
   */
  const loadAnotherProfile = useCallback(
    async (profileUserId: string) => {
      // With TanStack Query, use separate query instance
      // This is handled by calling useProfile(profileUserId) in the component
      return true;
    },
    []
  );

  /**
   * Fetch volunteers list
   */
  const loadVolunteers = useCallback(async () => {
    await volunteersQuery.refetch();
    return true;
  }, [volunteersQuery]);

  /**
   * Update profile
   */
  const updateUserProfile = useCallback(
    async (updates: Partial<ProfileType>) => {
      try {
        await updateProfileMutation.mutateAsync(updates);
        return true;
      } catch {
        return false;
      }
    },
    [updateProfileMutation]
  );

  /**
   * Fetch user address
   */
  const loadAddress = useCallback(
    async (addressUserId: string) => {
      await addressQuery.refetch();
      return true;
    },
    [addressQuery]
  );

  /**
   * Update user address
   */
  const updateUserAddress = useCallback(
    async (addressData: AddressType) => {
      try {
        await updateAddressMutation.mutateAsync(addressData);
        return true;
      } catch {
        return false;
      }
    },
    [updateAddressMutation]
  );

  /**
   * Fetch countries list (deprecated - fetch from API directly)
   */
  const loadCountries = useCallback(async () => {
    // TODO: Implement country fetching from API
    return true;
  }, []);

  /**
   * Download avatar image (handled automatically by useAvatar query)
   */
  const loadAvatar = useCallback(
    async () => {
      await avatarQuery.refetch();
      return true;
    },
    [avatarQuery]
  );

  /**
   * Upload avatar image
   */
  const uploadUserAvatar = useCallback(
    async (imageData: { userId: string; file: File }) => {
      try {
        await uploadAvatarMutation.mutateAsync(imageData);
        return true;
      } catch {
        return false;
      }
    },
    [uploadAvatarMutation]
  );

  /**
   * Clear update status
   */
  const clearStatus = useCallback(() => {
    updateProfileMutation.reset();
    updateAddressMutation.reset();
  }, [updateProfileMutation, updateAddressMutation]);

  /**
   * Clear viewing profile (no-op with TanStack Query - just use different userId)
   */
  const clearViewing = useCallback(() => {
    // With TanStack Query, this is handled by component unmounting
    // or by using a different userId parameter
  }, []);

  // ========================================================================
  // Return Interface
  // ========================================================================

  return {
    // State
    currentProfile,
    viewingProfile: null, // Deprecated - use separate useProfile(userId) call
    volunteers,
    address,
    countries: [], // Deprecated - fetch from API directly
    avatarUrl,
    updateStatus,
    updateMessage,
    isUpdating,

    // Loading states
    isLoading: profileQuery.isLoading,
    isLoadingVolunteers: volunteersQuery.isLoading,
    isLoadingAddress: addressQuery.isLoading,

    // Actions
    loadProfile,
    loadAnotherProfile,
    loadVolunteers,
    updateUserProfile,
    loadAddress,
    updateUserAddress,
    loadCountries,
    loadAvatar,
    uploadUserAvatar,
    clearStatus,
    clearViewing,

    // Query objects for advanced use
    profileQuery,
    addressQuery,
    volunteersQuery,
  };
};
