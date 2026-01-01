/**
 * Profile API Client
 *
 * Provides functions for calling the api-v1-profile Edge Function.
 * Used for profile management operations.
 */

import { apiCall, apiGet, apiPut, apiDelete } from "./client";
import type { ActionResult } from "@/lib/errors";

// =============================================================================
// Types (match Edge Function schemas)
// =============================================================================

export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  phone?: string;
  location?: string;
  isVolunteer?: boolean;
}

export interface UpdateAddressRequest {
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  city: string;
  stateProvince?: string;
  postalCode?: string;
  country: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
}

export interface UploadAvatarRequest {
  imageData: string; // Base64-encoded
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  fileName?: string;
}

// Response types
export interface ProfileResponse {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  avatarUrl: string | null;
  isVolunteer: boolean;
  ratingCount: number;
  ratingAverage: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddressResponse {
  profileId: string;
  addressLine1: string;
  addressLine2: string | null;
  addressLine3: string | null;
  city: string;
  stateProvince: string | null;
  postalCode: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  fullAddress: string;
  radiusMeters: number | null;
}

export interface AvatarUploadResponse {
  url: string;
}

// =============================================================================
// API Functions
// =============================================================================

const ENDPOINT = "api-v1-profile";

/**
 * Get current user's profile
 */
export async function getProfileAPI(): Promise<ActionResult<ProfileResponse>> {
  return apiGet<ProfileResponse>(ENDPOINT);
}

/**
 * Update profile
 */
export async function updateProfileAPI(
  input: UpdateProfileRequest
): Promise<ActionResult<ProfileResponse>> {
  return apiPut<ProfileResponse, UpdateProfileRequest>(ENDPOINT, input);
}

/**
 * Upload avatar
 */
export async function uploadAvatarAPI(
  input: UploadAvatarRequest
): Promise<ActionResult<AvatarUploadResponse>> {
  return apiCall<AvatarUploadResponse, UploadAvatarRequest>(ENDPOINT, {
    method: "POST",
    body: input,
    query: { action: "avatar" },
  });
}

/**
 * Delete avatar
 */
export async function deleteAvatarAPI(): Promise<ActionResult<undefined>> {
  return apiDelete(ENDPOINT, { action: "avatar" });
}

/**
 * Get user's address
 */
export async function getAddressAPI(): Promise<ActionResult<AddressResponse | null>> {
  return apiGet<AddressResponse | null>(ENDPOINT, { action: "address" });
}

/**
 * Update address
 */
export async function updateAddressAPI(
  input: UpdateAddressRequest
): Promise<ActionResult<AddressResponse>> {
  return apiPut<AddressResponse, UpdateAddressRequest>(
    ENDPOINT,
    input,
    { action: "address" }
  );
}

// =============================================================================
// Helpers for Server Actions
// =============================================================================

/**
 * Convert FormData to UpdateProfileRequest
 */
export function formDataToProfileInput(formData: FormData): UpdateProfileRequest {
  const input: UpdateProfileRequest = {};

  const name = formData.get("name");
  if (name !== null) input.name = name as string;

  const bio = formData.get("bio");
  if (bio !== null) input.bio = bio as string;

  const phone = formData.get("phone");
  if (phone !== null) input.phone = phone as string;

  const location = formData.get("location");
  if (location !== null) input.location = location as string;

  const isVolunteer = formData.get("is_volunteer");
  if (isVolunteer !== null) input.isVolunteer = isVolunteer === "true";

  return input;
}

/**
 * Convert FormData to UpdateAddressRequest
 */
export function formDataToAddressInput(formData: FormData): UpdateAddressRequest {
  const lat = formData.get("lat");
  const lng = formData.get("long");

  let parsedLat: number | undefined;
  let parsedLng: number | undefined;

  if (lat && lng) {
    parsedLat = parseFloat(lat as string);
    parsedLng = parseFloat(lng as string);
    // Only use if valid numbers
    if (Number.isNaN(parsedLat)) parsedLat = undefined;
    if (Number.isNaN(parsedLng)) parsedLng = undefined;
  }

  return {
    addressLine1: (formData.get("address_line_1") as string) || "",
    addressLine2: (formData.get("address_line_2") as string) || undefined,
    addressLine3: (formData.get("address_line_3") as string) || undefined,
    city: (formData.get("city") as string) || "",
    stateProvince: (formData.get("state_province") as string) || undefined,
    postalCode: (formData.get("postal_code") as string) || undefined,
    country: (formData.get("country") as string) || "",
    lat: parsedLat,
    lng: parsedLng,
    radiusMeters: formData.get("radius_meters")
      ? parseInt(formData.get("radius_meters") as string)
      : undefined,
  };
}

/**
 * Convert File to UploadAvatarRequest (reads file as base64)
 */
export async function fileToAvatarInput(file: File): Promise<UploadAvatarRequest> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const binaryString = uint8Array.reduce(
    (str, byte) => str + String.fromCharCode(byte),
    ""
  );
  const base64 = btoa(binaryString);

  return {
    imageData: base64,
    mimeType: file.type as UploadAvatarRequest["mimeType"],
    fileName: file.name,
  };
}
