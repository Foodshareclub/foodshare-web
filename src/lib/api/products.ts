/**
 * Product API Client
 *
 * Maps web form fields to the Edge Function's camelCase requests.
 * Product responses retain the shared snake_case database contract.
 * All product mutations should use these functions.
 */

import type { ActionResult } from "@/lib/errors";
import { apiDelete, apiPost, apiPut } from "./client";
import type {
  CreateProductRequest,
  ListingPostType,
  ProductResponse,
  UpdateProductRequest,
} from "./types";

// =============================================================================
// Types for Web App (matches existing form data)
// =============================================================================

export interface WebCreateProductInput {
  post_name: string;
  post_description: string;
  post_type: string;
  category_mode?: "auto" | "manual";
  post_address?: string;
  available_hours?: string;
  transportation?: string;
  condition?: string;
  images: string[];
  profile_id: string;
  latitude?: number;
  longitude?: number;
}

export interface WebUpdateProductInput {
  post_name?: string;
  post_description?: string;
  post_type?: string;
  post_address?: string;
  available_hours?: string;
  transportation?: string;
  condition?: string;
  images?: string[];
  is_active?: boolean;
  version: number;
}

// =============================================================================
// Transformers (Web ↔ Edge Function)
// =============================================================================

/**
 * Transform web app create input to Edge Function schema
 */
function toCreateRequest(input: WebCreateProductInput): CreateProductRequest {
  return {
    title: input.post_name,
    description: input.post_description || undefined,
    images: input.images,
    postType: input.post_type as ListingPostType,
    categoryMode: input.category_mode,
    latitude: input.latitude,
    longitude: input.longitude,
    pickupAddress: input.post_address || undefined,
    pickupTime: input.available_hours || undefined,
    transportation: input.transportation,
    condition: input.condition,
  };
}

/**
 * Transform web app update input to Edge Function schema
 */
function toUpdateRequest(input: WebUpdateProductInput): UpdateProductRequest {
  return {
    title: input.post_name,
    description: input.post_description,
    postType: input.post_type as ListingPostType | undefined,
    images: input.images,
    pickupAddress: input.post_address,
    pickupTime: input.available_hours,
    isActive: input.is_active,
    version: input.version,
  };
}

/**
 * Transform Edge Function response to web app format
 */
export function fromProductResponse(product: ProductResponse): {
  id: number;
  post_name: string;
  post_description: string | null;
  post_type: string;
  post_address: string | null;
  images: string[];
  is_active: boolean;
  profile_id: string;
  created_at: string;
  updated_at: string | null;
  version: number;
  sync_version: number;
} {
  return {
    id: product.id,
    post_name: product.post_name,
    post_description: product.post_description,
    post_type: product.post_type,
    post_address: product.post_address,
    images: product.images,
    is_active: product.is_active,
    profile_id: product.profile_id,
    created_at: product.created_at,
    updated_at: product.updated_at,
    version: product.version,
    sync_version: product.sync_version,
  };
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Create a product via Edge Function
 */
export async function createProductAPI(input: WebCreateProductInput): Promise<
  ActionResult<{
    id: number;
    post_type: ListingPostType;
    is_active: boolean;
  }>
> {
  const request = toCreateRequest(input);

  const result = await apiPost<ProductResponse, CreateProductRequest>("api-v1-products", request);

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: {
      id: result.data.id,
      post_type: result.data.post_type,
      is_active: result.data.is_active,
    },
  };
}

/**
 * Update a product via Edge Function
 */
export async function updateProductAPI(
  productId: number,
  input: WebUpdateProductInput
): Promise<ActionResult<undefined>> {
  const request = toUpdateRequest(input);

  const result = await apiPut<ProductResponse, UpdateProductRequest>("api-v1-products", request, {
    id: productId,
  });

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: undefined,
  };
}

/**
 * Delete a product via Edge Function (soft delete)
 */
export async function deleteProductAPI(productId: number): Promise<ActionResult<undefined>> {
  const result = await apiDelete("api-v1-products", { id: productId });

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: undefined,
  };
}
