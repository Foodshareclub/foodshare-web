'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
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
 * Get products filtered by type
 */
export async function getProducts(productType: string): Promise<InitialProductStateType[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('post_type', productType.toLowerCase())
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Get all products
 */
export async function getAllProducts(): Promise<InitialProductStateType[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Get a single product by ID with reviews
 */
export async function getProductById(productId: number): Promise<InitialProductStateType | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts_with_location')
    .select('*, reviews(*)')
    .eq('id', productId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(error.message);
  }
  return data;
}

/**
 * Get product locations for map display
 */
export async function getProductLocations(productType: string): Promise<LocationType[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts_with_location')
    .select('id, location_json, post_name, post_type, images')
    .eq('post_type', productType.toLowerCase())
    .eq('is_active', true);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Get products created by a specific user
 */
export async function getUserProducts(userId: string): Promise<InitialProductStateType[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Search products by name with optional type filter
 */
export async function searchProducts(
  searchWord: string,
  productSearchType?: string
): Promise<InitialProductStateType[]> {
  const supabase = await createClient();

  let query = supabase
    .from('posts')
    .select('*, reviews(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (productSearchType && productSearchType !== 'all') {
    query = query.eq('post_type', productSearchType.toLowerCase());
  }

  query = query.textSearch('post_name', searchWord, { type: 'websearch' });

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return data ?? [];
}

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

    revalidatePath('/');
    revalidatePath('/food');
    revalidatePath('/map/[type]', 'page');

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

    revalidatePath('/');
    revalidatePath('/food');
    revalidatePath(`/food/${id}`);
    revalidatePath('/map/[type]', 'page');

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

    revalidatePath('/');
    revalidatePath('/food');
    revalidatePath('/map/[type]', 'page');

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
