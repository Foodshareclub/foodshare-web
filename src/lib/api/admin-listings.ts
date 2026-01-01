/**
 * Admin Listings API Client
 *
 * Provides functions for calling the api-v1-admin-listings Edge Function.
 * Used for admin listing management operations.
 */

import { apiCall, apiDelete } from "./client";
import type { ActionResult } from "@/lib/errors";

// =============================================================================
// Types
// =============================================================================

export interface UpdateListingRequest {
  postName?: string;
  postDescription?: string;
  postType?: "food" | "produce" | "prepared" | "other";
  pickupTime?: string;
  availableHours?: string;
  postAddress?: string;
  isActive?: boolean;
  adminNotes?: string;
}

export interface DeactivateRequest {
  reason?: string;
}

export interface BulkIdsRequest {
  ids: number[];
}

export interface BulkDeactivateRequest {
  ids: number[];
  reason?: string;
}

export interface UpdateNotesRequest {
  notes: string;
}

export interface ListingActionResponse {
  listingId: number;
  updated?: boolean;
  isActive?: boolean;
  notesUpdated?: boolean;
}

export interface BulkActionResponse {
  activated?: number;
  deactivated?: number;
  deleted?: number;
  ids: number[];
}

// =============================================================================
// API Functions
// =============================================================================

const ENDPOINT = "api-v1-admin-listings";

/**
 * Update a listing
 */
export async function updateListingAPI(
  id: number,
  data: UpdateListingRequest
): Promise<ActionResult<ListingActionResponse>> {
  return apiCall<ListingActionResponse, UpdateListingRequest>(`${ENDPOINT}/${id}`, {
    method: "PUT",
    body: data,
  });
}

/**
 * Activate a listing
 */
export async function activateListingAPI(
  id: number
): Promise<ActionResult<ListingActionResponse>> {
  return apiCall<ListingActionResponse, Record<string, never>>(`${ENDPOINT}/${id}/activate`, {
    method: "PUT",
    body: {},
  });
}

/**
 * Deactivate a listing
 */
export async function deactivateListingAPI(
  id: number,
  reason?: string
): Promise<ActionResult<ListingActionResponse>> {
  return apiCall<ListingActionResponse, DeactivateRequest>(`${ENDPOINT}/${id}/deactivate`, {
    method: "PUT",
    body: { reason },
  });
}

/**
 * Delete a listing
 */
export async function deleteListingAPI(id: number): Promise<ActionResult<void>> {
  return apiDelete<void>(`${ENDPOINT}/${id}`);
}

/**
 * Update admin notes for a listing
 */
export async function updateAdminNotesAPI(
  id: number,
  notes: string
): Promise<ActionResult<ListingActionResponse>> {
  return apiCall<ListingActionResponse, UpdateNotesRequest>(`${ENDPOINT}/${id}/notes`, {
    method: "PUT",
    body: { notes },
  });
}

/**
 * Bulk activate listings
 */
export async function bulkActivateListingsAPI(
  ids: number[]
): Promise<ActionResult<BulkActionResponse>> {
  return apiCall<BulkActionResponse, BulkIdsRequest>(`${ENDPOINT}/bulk/activate`, {
    method: "POST",
    body: { ids },
  });
}

/**
 * Bulk deactivate listings
 */
export async function bulkDeactivateListingsAPI(
  ids: number[],
  reason?: string
): Promise<ActionResult<BulkActionResponse>> {
  return apiCall<BulkActionResponse, BulkDeactivateRequest>(`${ENDPOINT}/bulk/deactivate`, {
    method: "POST",
    body: { ids, reason },
  });
}

/**
 * Bulk delete listings
 */
export async function bulkDeleteListingsAPI(
  ids: number[]
): Promise<ActionResult<BulkActionResponse>> {
  return apiCall<BulkActionResponse, BulkIdsRequest>(`${ENDPOINT}/bulk/delete`, {
    method: "POST",
    body: { ids },
  });
}

// =============================================================================
// Transform Helpers
// =============================================================================

/**
 * Transform web UpdateListingData to API request format
 */
export function toUpdateListingRequest(data: {
  post_name?: string;
  post_description?: string;
  post_type?: string;
  pickup_time?: string;
  available_hours?: string;
  post_address?: string;
  is_active?: boolean;
  admin_notes?: string;
}): UpdateListingRequest {
  return {
    postName: data.post_name,
    postDescription: data.post_description,
    postType: data.post_type as UpdateListingRequest["postType"],
    pickupTime: data.pickup_time,
    availableHours: data.available_hours,
    postAddress: data.post_address,
    isActive: data.is_active,
    adminNotes: data.admin_notes,
  };
}
