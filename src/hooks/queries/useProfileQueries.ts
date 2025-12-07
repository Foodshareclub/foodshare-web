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
import type { UseQueryResult } from "@tanstack/react-query";
import { profileAPI, type ProfileType, type AddressType } from "@/api/profileAPI";
import { storageAPI } from "@/api/storageAPI";
import { useImageBlobUrl } from "@/hooks/useImageBlobUrl";

// ============================================================================
// Constants
// ============================================================================

/** Cache duration constants (in milliseconds) */
const CACHE_TIMES = {
  SHORT: 2 * 60 * 1000,     // 2 minutes - for frequently changing data
  MEDIUM: 5 * 60 * 1000,    // 5 minutes - default for profile data
  LONG: 10 * 60 * 1000,     // 10 minutes - for stable lists
  AVATAR: 30 * 60 * 1000,   // 30 minutes - avatars rarely change
  AVATAR_GC: 60 * 60 * 1000, // 1 hour - garbage collection for avatar blobs
} as const;

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
): UseQueryResult<ProfileType | null, Error> {
  return useQuery({
    queryKey: profileKeys.detail(userId ?? ""),
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await profileAPI.getProfile(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: CACHE_TIMES.MEDIUM,
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

/**
 * Get another user's profile (for viewing)
 */
export function useOtherProfile(userId: string | undefined): UseQueryResult<ProfileType | null, Error> {
  return useQuery({
    queryKey: [...profileKeys.detail(userId ?? ""), "other"],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await profileAPI.getAnotherUserProfile(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: CACHE_TIMES.SHORT,
  });
}

/**
 * Get volunteers list
 */
export function useVolunteers(): UseQueryResult<ProfileType[], Error> {
  return useQuery({
    queryKey: profileKeys.volunteers(),
    queryFn: async () => {
      const { data, error } = await profileAPI.getVolunteers();
      if (error) throw error;
      return data ?? [];
    },
    staleTime: CACHE_TIMES.LONG,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get user address
 */
export function useAddress(userId: string | undefined): UseQueryResult<AddressType | null, Error> {
  return useQuery({
    queryKey: profileKeys.address(userId ?? ""),
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await profileAPI.getUserAddress(userId);
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!userId,
    staleTime: CACHE_TIMES.MEDIUM,
  });
}

/**
 * Check if a string is a full URL (http/https)
 */
function isFullUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Normalize avatar path - handles edge cases like empty strings, quotes, etc.
 * Returns undefined for invalid/empty paths
 */
function normalizeAvatarPath(path: string | undefined): string | undefined {
  if (!path) return undefined;
  
  // Remove whitespace
  let normalized = path.trim();
  
  // Handle escaped empty strings like '""' or "''"
  if (normalized === '""' || normalized === "''") return undefined;
  
  // Handle JSON-escaped empty strings
  if (normalized === '\\"\\"' || normalized === "\\'\\'" ) return undefined;
  
  // Return undefined for empty strings
  if (!normalized) return undefined;
  
  return normalized;
}

/** Avatar query result type */
interface AvatarQueryResult {
  /** The resolved avatar URL (either direct URL or blob URL) */
  data: string | null | undefined;
  /** Whether the avatar is currently loading */
  isLoading: boolean;
  /** Any error that occurred during fetching */
  error: Error | null;
  /** Whether the avatar is a public URL (no blob conversion needed) */
  isPublicUrl: boolean;
}

/**
 * Get avatar URL with proper blob URL cleanup
 * Uses useImageBlobUrl to prevent memory leaks
 * 
 * Handles three cases:
 * 1. Empty/undefined - returns null immediately
 * 2. Full URLs (http/https) - returns directly without downloading
 * 3. Storage paths - downloads from profiles bucket and creates blob URL
 * 
 * @param avatarPath - Either a full URL or a storage path in the profiles bucket
 * @returns Avatar query result with resolved URL
 */
export function useAvatar(avatarPath: string | undefined): AvatarQueryResult {
  // Normalize path - handles empty strings, quotes, whitespace, etc.
  const normalizedPath = normalizeAvatarPath(avatarPath);
  
  // Determine if the path is already a full URL
  const isPublicUrl = normalizedPath ? isFullUrl(normalizedPath) : false;

  // For full URLs, use a simple query that returns the URL directly
  const directUrlQuery = useQuery({
    queryKey: [...profileKeys.avatar(normalizedPath ?? ""), "direct"],
    queryFn: () => normalizedPath ?? null,
    enabled: !!normalizedPath && isPublicUrl,
    staleTime: Infinity, // Public URLs don't change
  });

  // For storage paths, download and create blob URL
  const blobUrlQuery = useImageBlobUrl({
    queryKey: profileKeys.avatar(normalizedPath ?? ""),
    fetchFn: async () => {
      if (!normalizedPath) return null;
      const { data, error } = await storageAPI.downloadImage({ path: normalizedPath, bucket: "profiles" });
      if (error) throw error;
      return data ?? null;
    },
    enabled: !!normalizedPath && !isPublicUrl,
    staleTime: CACHE_TIMES.AVATAR,
    gcTime: CACHE_TIMES.AVATAR_GC,
  });

  // Return the appropriate result based on URL type
  if (isPublicUrl) {
    return {
      data: directUrlQuery.data,
      isLoading: directUrlQuery.isLoading,
      error: directUrlQuery.error,
      isPublicUrl: true,
    };
  }

  return {
    data: blobUrlQuery.data,
    isLoading: blobUrlQuery.isLoading,
    error: blobUrlQuery.error,
    isPublicUrl: false,
  };
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
 * Uploads to profiles bucket with path: {userId}/avatar.{ext}
 * Database trigger automatically updates profiles.avatar_url
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
      // Get file extension from mime type or filename
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      // Use profile ID as directory: {userId}/avatar.{ext}
      const filePath = `${userId}/avatar.${ext}`;
      const { error } = await storageAPI.uploadImage({ 
        file, 
        filePath, 
        bucket: "profiles" // Use profiles bucket (trigger listens to this)
      });
      if (error) throw error;
      return filePath;
    },
    onSuccess: (filePath, { userId }) => {
      // Invalidate avatar query to refetch new image
      queryClient.invalidateQueries({
        queryKey: profileKeys.avatar(filePath),
      });
      // Invalidate profile to get updated avatar_url (set by DB trigger)
      queryClient.invalidateQueries({
        queryKey: profileKeys.detail(userId),
      });
    },
  });
}

// ============================================================================
// Convenience Hook
// ============================================================================

/** Return type for useCurrentProfile hook */
export interface CurrentProfileResult {
  // Data
  profile: ProfileType | null | undefined;
  address: AddressType | null | undefined;
  avatarUrl: string | null | undefined;

  // Loading states
  isLoading: boolean;
  isProfileLoading: boolean;
  isAddressLoading: boolean;
  isAvatarLoading: boolean;

  // Errors
  error: Error | null;

  // Mutations
  updateProfile: (updates: Partial<ProfileType>) => Promise<Partial<ProfileType>>;
  updateAddress: (address: AddressType) => Promise<AddressType>;
  uploadAvatar: (params: { userId: string; file: File }) => Promise<string>;

  // Mutation states
  isUpdating: boolean;
  isUploadingAvatar: boolean;

  // Actions
  refetch: () => void;
}

/**
 * Combined profile hook for current user
 * Aggregates profile, address, and avatar data with mutations
 * 
 * @param userId - The user ID to fetch profile for
 * @returns Combined profile data and mutation functions
 */
export function useCurrentProfile(userId: string | undefined): CurrentProfileResult {
  const profile = useProfile(userId);
  const address = useAddress(userId);
  
  // useAvatar handles both public URLs and storage paths internally
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
    error: profile.error || address.error || avatar.error,

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
