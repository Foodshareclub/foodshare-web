/**
 * Profile Queries (TanStack Query)
 * Handles user profile data fetching and mutations
 * Replaces Redux profile slice
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { profileAPI, type ProfileType, type AddressType } from "@/api/profileAPI";
import { storageAPI } from "@/api/storageAPI";
import { useImageBlobUrl } from "@/hooks/useImageBlobUrl";

// ============================================================================
// Query Keys
// ============================================================================

export const profileKeys = {
  all: ["profiles"] as const,
  lists: () => [...profileKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...profileKeys.lists(), filters] as const,
  details: () => [...profileKeys.all, "detail"] as const,
  detail: (id: string) => [...profileKeys.details(), id] as const,
  address: (userId: string) => [...profileKeys.all, "address", userId] as const,
  volunteers: () => [...profileKeys.all, "volunteers"] as const,
  avatar: (userId: string) => [...profileKeys.all, "avatar", userId] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Get user profile by ID
 */
export function useProfile(
  userId: string | undefined,
  options?: Omit<UseQueryOptions<ProfileType | null, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: profileKeys.detail(userId ?? ""),
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await profileAPI.getProfile(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Get another user's profile (for viewing)
 */
export function useOtherProfile(userId: string | undefined) {
  return useQuery({
    queryKey: [...profileKeys.detail(userId ?? ""), "other"],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await profileAPI.getAnotherUserProfile(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get volunteers list
 */
export function useVolunteers() {
  return useQuery({
    queryKey: profileKeys.volunteers(),
    queryFn: async () => {
      const { data, error } = await profileAPI.getVolunteers();
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get user address
 */
export function useAddress(userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.address(userId ?? ""),
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await profileAPI.getUserAddress(userId);
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get avatar URL with proper blob URL cleanup
 * Uses useImageBlobUrl to prevent memory leaks
 */
export function useAvatar(avatarPath: string | undefined) {
  return useImageBlobUrl({
    queryKey: profileKeys.avatar(avatarPath ?? ""),
    fetchFn: async () => {
      if (!avatarPath) return null;
      const { data, error } = await storageAPI.downloadImage({ path: avatarPath, bucket: "avatars" });
      if (error) throw error;
      return data ?? null;
    },
    enabled: !!avatarPath,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<ProfileType>) => {
      const { error } = await profileAPI.updateProfile(updates);
      if (error) throw error;
      return updates;
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch
      if (variables.id) {
        queryClient.invalidateQueries({
          queryKey: profileKeys.detail(variables.id),
        });
      }
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
    },
  });
}

/**
 * Update user address
 */
export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: AddressType) => {
      const { error } = await profileAPI.updateAddress(address);
      if (error) throw error;
      return address;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: profileKeys.address(variables.profile_id),
      });
    },
  });
}

/**
 * Upload avatar
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      file,
    }: {
      userId: string;
      file: File;
    }) => {
      const filePath = `${userId}/avatar`;
      const { error } = await storageAPI.uploadImage({ file, filePath, bucket: "avatars" });
      if (error) throw error;
      return filePath;
    },
    onSuccess: (filePath, { userId }) => {
      // Invalidate avatar query
      queryClient.invalidateQueries({
        queryKey: profileKeys.avatar(filePath),
      });
      // Update profile with new avatar path
      queryClient.invalidateQueries({
        queryKey: profileKeys.detail(userId),
      });
    },
  });
}

// ============================================================================
// Convenience Hook
// ============================================================================

/**
 * Combined profile hook for current user
 */
export function useCurrentProfile(userId: string | undefined) {
  const profile = useProfile(userId);
  const address = useAddress(userId);
  const avatar = useAvatar(profile.data?.avatar_url);

  const updateProfile = useUpdateProfile();
  const updateAddress = useUpdateAddress();
  const uploadAvatar = useUploadAvatar();

  return {
    // Data
    profile: profile.data,
    address: address.data,
    avatarUrl: avatar.data,

    // Loading states
    isLoading: profile.isLoading || address.isLoading,
    isProfileLoading: profile.isLoading,
    isAddressLoading: address.isLoading,
    isAvatarLoading: avatar.isLoading,

    // Errors
    error: profile.error || address.error,

    // Mutations
    updateProfile: updateProfile.mutateAsync,
    updateAddress: updateAddress.mutateAsync,
    uploadAvatar: uploadAvatar.mutateAsync,

    // Mutation states
    isUpdating: updateProfile.isPending,
    isUploadingAvatar: uploadAvatar.isPending,

    // Refetch
    refetch: () => {
      profile.refetch();
      address.refetch();
    },
  };
}
