'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { InitialProductStateType, LocationType } from '@/types/product.types';
import {
  type ActionResult,
  withErrorHandling,
  validateWithSchema,
  success,
  successVoid,
  failure,
  validationError,
  databaseError,
  notFoundError,
} from '@/lib/errors';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

// Re-export cached data functions for backward compatibility
export {
  getProducts,
  getAllProducts,
  getProductById,
  getProductLocations,
  getUserProducts,
  searchProducts,
} from '@/lib/data/products';

// Re-export types for consumers
export type { InitialProductStateType, LocationType, ActionResult };

// ============================================================================
// Zod Schemas for validation
// ============================================================================

const createProductSchema = z.object({
  post_name: z.string().min(1, 'Name is required').max(200),
  post_description: z.string().min(1, 'Description is required').max(5000),
  post_type: z.string().min(1, 'Type is required'),
  post_address: z.string().min(1, 'Address is required'),
  available_hours: z.string().optional(),
  transportation: z.string().optional(),
  images: z.array(z.string()).optional().default([]),
  profile_id: z.string().uuid('Invalid user ID'),
});

const updateProductSchema = createProductSchema.partial().extend({
  is_active: z.boolean().optional(),
});

/**
 * Create a new product
 */
export async function createProduct(formData: FormData): Promise<ActionResult<{ id: number }>> {
  // Parse form data
  const rawData = {
    post_name: formData.get('post_name') as string,
    post_description: formData.get('post_description') as string,
    post_type: formData.get('post_type') as string,
    post_address: formData.get('post_address') as string,
    available_hours: formData.get('available_hours') as string,
    transportation: formData.get('transportation') as string,
    images: JSON.parse(formData.get('images') as string || '[]'),
    profile_id: formData.get('profile_id') as string,
  };

  // Validate with Zod
  const validation = validateWithSchema(createProductSchema, rawData);
  if (!validation.success) {
    return validation;
  }

  return withErrorHandling(async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('posts')
      .insert({ ...validation.data, is_active: true })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    // Invalidate product caches
    invalidateTag(CACHE_TAGS.PRODUCTS);
    invalidateTag(CACHE_TAGS.PRODUCT_LOCATIONS);
    invalidateTag(CACHE_TAGS.PRODUCTS_BY_TYPE(validation.data.post_type));

    return { id: data.id };
  }, 'createProduct');
}

/**
 * Update an existing product
 */
export async function updateProduct(
  id: number,
  formData: FormData
): Promise<ActionResult<undefined>> {
  // Parse form data
  const rawData: Record<string, unknown> = {};
  const fields = [
    'post_name', 'post_description', 'post_type', 'post_address',
    'available_hours', 'transportation', 'is_active'
  ];

  for (const field of fields) {
    const value = formData.get(field);
    if (value !== null) {
      rawData[field] = field === 'is_active' ? value === 'true' : value;
    }
  }

  const images = formData.get('images');
  if (images) {
    rawData.images = JSON.parse(images as string);
  }

  // Validate with Zod (partial schema for updates)
  const validation = validateWithSchema(updateProductSchema, rawData);
  if (!validation.success) {
    return validation;
  }

  return withErrorHandling(async () => {
    const supabase = await createClient();

    const { error } = await supabase
      .from('posts')
      .update(validation.data)
      .eq('id', id);

    if (error) throw new Error(error.message);

    // Invalidate product caches
    invalidateTag(CACHE_TAGS.PRODUCTS);
    invalidateTag(CACHE_TAGS.PRODUCT_LOCATIONS);
    invalidateTag(CACHE_TAGS.PRODUCT(id));

    return undefined;
  }, 'updateProduct');
}

/**
 * Delete a product
 */
export async function deleteProduct(id: number): Promise<ActionResult<undefined>> {
  return withErrorHandling(async () => {
    const supabase = await createClient();

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    // Invalidate product caches
    invalidateTag(CACHE_TAGS.PRODUCTS);
    invalidateTag(CACHE_TAGS.PRODUCT_LOCATIONS);
    invalidateTag(CACHE_TAGS.PRODUCT(id));

    return undefined;
  }, 'deleteProduct');
}

/**
 * Toggle product favorite status
 */
export async function toggleProductFavorite(
  productId: number,
  userId: string
): Promise<ActionResult<{ isFavorited: boolean }>> {
  return withErrorHandling(async () => {
    const supabase = await createClient();

    // Check if already favorited
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('product_id', productId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Remove favorite
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id);

      if (error) throw new Error(error.message);
      return { isFavorited: false };
    } else {
      // Add favorite
      const { error } = await supabase
        .from('favorites')
        .insert({ product_id: productId, user_id: userId });

      if (error) throw new Error(error.message);
      return { isFavorited: true };
    }
  }, 'toggleProductFavorite');
}
