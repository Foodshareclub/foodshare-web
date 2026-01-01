/**
 * Product API Client
 *
 * Transforms between web app schema (snake_case) and Edge Function schema (camelCase).
 * All product mutations should use these functions.
 */

import { apiPost, apiPut, apiDelete } from "./client";
import type { ActionResult } from "@/lib/errors";
import type {
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
} from "./types";

// =============================================================================
// Types for Web App (matches existing form data)
// =============================================================================

export interface WebCreateProductInput {
  post_name: string;
  post_description: string;
  post_type: string;
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
    postType: input.post_type as "food" | "non-food" | "request",
    latitude: input.latitude ?? 0,
    longitude: input.longitude ?? 0,
    pickupAddress: input.post_address || undefined,
    pickupTime: input.available_hours || undefined,
  };
}

/**
 * Transform web app update input to Edge Function schema
 */
function toUpdateRequest(input: WebUpdateProductInput): UpdateProductRequest {
  return {
    title: input.post_name,
    description: input.post_description,
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
} {
  return {
    id: product.id,
    post_name: product.title,
    post_description: product.description,
    post_type: product.postType,
    post_address: product.location.address,
    images: product.images,
    is_active: product.isActive,
    profile_id: product.userId,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
    version: product.version,
  };
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Create a product via Edge Function
 */
export async function createProductAPI(
  input: WebCreateProductInput
): Promise<ActionResult<{ id: number }>> {
  const request = toCreateRequest(input);

  const result = await apiPost<ProductResponse, CreateProductRequest>(
    "api-v1-products",
    request
  );

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: { id: result.data.id },
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

  const result = await apiPut<ProductResponse, UpdateProductRequest>(
    "api-v1-products",
    request,
    { id: productId }
  );

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
export async function deleteProductAPI(
  productId: number
): Promise<ActionResult<undefined>> {
  const result = await apiDelete(
    "api-v1-products",
    { id: productId }
  );

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: undefined,
  };
}
