/**
 * Product Queries (TanStack Query)
 * Handles product data fetching and mutations via API routes and Server Actions
 * No direct server imports - all data flows through API routes or Server Actions
 */

'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductFavorite,
} from '@/app/actions/products';
import { useImageBlobUrl } from '@/hooks/useImageBlobUrl';
import type { InitialProductStateType, LocationType } from '@/types/product.types';

// Re-export types for consumers
export type { InitialProductStateType, LocationType };

// ============================================================================
// API Fetch Functions (Client-safe)
// ============================================================================

async function fetchProducts(type: string): Promise<InitialProductStateType[]> {
  const res = await fetch(`/api/products?type=${encodeURIComponent(type)}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

async function fetchAllProducts(): Promise<InitialProductStateType[]> {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

async function fetchProductById(id: number): Promise<InitialProductStateType | null> {
  const res = await fetch(`/api/products?id=${id}`);
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
}

async function fetchProductLocations(type: string): Promise<LocationType[]> {
  const res = await fetch(`/api/products?type=${encodeURIComponent(type)}&locations=true`);
  if (!res.ok) throw new Error('Failed to fetch locations');
  return res.json();
}

async function fetchUserProducts(userId: string): Promise<InitialProductStateType[]> {
  const res = await fetch(`/api/products?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to fetch user products');
  return res.json();
}

async function fetchSearchProducts(query: string, type: string): Promise<InitialProductStateType[]> {
  const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`);
  if (!res.ok) throw new Error('Failed to search products');
  return res.json();
}

// ============================================================================
// Query Keys Factory
// ============================================================================

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (type: string) => [...productKeys.lists(), type] as const,
  locations: () => [...productKeys.all, 'locations'] as const,
  location: (type: string) => [...productKeys.locations(), type] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: number) => [...productKeys.details(), id] as const,
  userProducts: (userId: string) => [...productKeys.all, 'user', userId] as const,
  search: (query: string, type: string) =>
    [...productKeys.all, 'search', query, type] as const,
  image: (path: string) => [...productKeys.all, 'image', path] as const,
};

// ============================================================================
// Queries - Using API Routes
// ============================================================================

/**
 * Get products by type
 */
export function useProducts(
  productType: string,
  options?: Omit<
    UseQueryOptions<InitialProductStateType[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: productKeys.list(productType),
    queryFn: () => fetchProducts(productType),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Get products with location for map view
 */
export function useProductsLocation(productType: string) {
  return useQuery({
    queryKey: productKeys.location(productType),
    queryFn: () => fetchProductLocations(productType),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

/**
 * Get all products (all types)
 */
export function useAllProducts() {
  return useQuery({
    queryKey: [...productKeys.lists(), 'all'],
    queryFn: () => fetchAllProducts(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get single product by ID
 */
export function useProduct(productId: number | undefined) {
  return useQuery({
    queryKey: productKeys.detail(productId ?? 0),
    queryFn: async () => {
      if (!productId) return null;
      return fetchProductById(productId);
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get current user's products
 */
export function useUserProducts(userId: string | undefined) {
  return useQuery({
    queryKey: productKeys.userProducts(userId ?? ''),
    queryFn: async () => {
      if (!userId) return [];
      return fetchUserProducts(userId);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Search products
 */
export function useSearchProducts(searchQuery: string, productType: string = 'all') {
  return useQuery({
    queryKey: productKeys.search(searchQuery, productType),
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      return fetchSearchProducts(searchQuery, productType);
    },
    enabled: !!searchQuery.trim(),
    staleTime: 1 * 60 * 1000, // 1 minute for search results
  });
}

/**
 * Get product image with proper blob URL cleanup
 */
export function useProductImage(imagePath: string | undefined) {
  return useImageBlobUrl({
    queryKey: productKeys.image(imagePath ?? ''),
    fetchFn: async () => {
      if (!imagePath) return null;
      const { storageAPI } = await import('@/api/storageAPI');
      const { data, error } = await storageAPI.downloadImage({
        path: imagePath,
        bucket: 'posts',
      });
      if (error) throw error;
      return data ?? null;
    },
    enabled: !!imagePath,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

// ============================================================================
// Mutations - Using Server Actions with Optimistic Updates
// ============================================================================

/**
 * Create a new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productData: {
      post_name: string;
      post_description: string;
      post_type: string;
      post_address: string;
      available_hours?: string;
      transportation?: string;
      images?: string[];
      profile_id: string;
    }) => {
      const formData = new FormData();
      formData.set('post_name', productData.post_name);
      formData.set('post_description', productData.post_description);
      formData.set('post_type', productData.post_type);
      formData.set('post_address', productData.post_address);
      if (productData.available_hours) {
        formData.set('available_hours', productData.available_hours);
      }
      if (productData.transportation) {
        formData.set('transportation', productData.transportation);
      }
      formData.set('images', JSON.stringify(productData.images ?? []));
      formData.set('profile_id', productData.profile_id);

      const result = await createProduct(formData);
      if (!result.success) {
        throw new Error(result.error.message ?? 'Failed to create product');
      }
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.locations() });
      if (variables.profile_id) {
        queryClient.invalidateQueries({
          queryKey: productKeys.userProducts(variables.profile_id),
        });
      }
    },
  });
}

/**
 * Update a product with optimistic updates
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...productData
    }: {
      id: number;
      post_name?: string;
      post_description?: string;
      post_type?: string;
      post_address?: string;
      available_hours?: string;
      transportation?: string;
      images?: string[];
      is_active?: boolean;
    }) => {
      const formData = new FormData();
      if (productData.post_name) formData.set('post_name', productData.post_name);
      if (productData.post_description) formData.set('post_description', productData.post_description);
      if (productData.post_type) formData.set('post_type', productData.post_type);
      if (productData.post_address) formData.set('post_address', productData.post_address);
      if (productData.available_hours) formData.set('available_hours', productData.available_hours);
      if (productData.transportation) formData.set('transportation', productData.transportation);
      if (productData.images) formData.set('images', JSON.stringify(productData.images));
      if (productData.is_active !== undefined) formData.set('is_active', String(productData.is_active));

      const result = await updateProduct(id, formData);
      if (!result.success) {
        throw new Error(result.error.message ?? 'Failed to update product');
      }
      return { id, ...productData };
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: productKeys.detail(variables.id) });

      const previousProduct = queryClient.getQueryData<InitialProductStateType>(
        productKeys.detail(variables.id)
      );

      if (previousProduct) {
        queryClient.setQueryData(
          productKeys.detail(variables.id),
          { ...previousProduct, ...variables }
        );
      }

      return { previousProduct };
    },
    onError: (_err, variables, context) => {
      if (context?.previousProduct) {
        queryClient.setQueryData(
          productKeys.detail(variables.id),
          context.previousProduct
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.locations() });
    },
  });
}

/**
 * Delete a product with optimistic updates
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: number) => {
      const result = await deleteProduct(productId);
      if (!result.success) {
        throw new Error(result.error.message ?? 'Failed to delete product');
      }
      return productId;
    },
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: productKeys.lists() });

      const previousLists = queryClient.getQueriesData<InitialProductStateType[]>({
        queryKey: productKeys.lists(),
      });

      queryClient.setQueriesData<InitialProductStateType[]>(
        { queryKey: productKeys.lists() },
        (old) => old?.filter((p) => p.id !== productId) ?? []
      );

      return { previousLists };
    },
    onError: (_err, _productId, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: (productId) => {
      if (productId) {
        queryClient.removeQueries({
          queryKey: productKeys.detail(productId),
        });
      }
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.locations() });
    },
  });
}

/**
 * Toggle product favorite with optimistic updates
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, userId }: { productId: number; userId: string }) => {
      const result = await toggleProductFavorite(productId, userId);
      if (!result.success) {
        throw new Error(result.error.message ?? 'Failed to toggle favorite');
      }
      return result;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: productKeys.detail(variables.productId) });

      const previousProduct = queryClient.getQueryData<InitialProductStateType>(
        productKeys.detail(variables.productId)
      );

      if (previousProduct) {
        queryClient.setQueryData(
          productKeys.detail(variables.productId),
          {
            ...previousProduct,
            post_like_counter: (previousProduct.post_like_counter ?? 0) + 1,
          }
        );
      }

      return { previousProduct };
    },
    onError: (_err, variables, context) => {
      if (context?.previousProduct) {
        queryClient.setQueryData(
          productKeys.detail(variables.productId),
          context.previousProduct
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(variables.productId),
      });
    },
  });
}

// ============================================================================
// Convenience Hook
// ============================================================================

/**
 * Combined products hook for common operations
 */
export function useProductsManager(productType: string = 'food') {
  const products = useProducts(productType);
  const locations = useProductsLocation(productType);

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();

  return {
    products: products.data ?? [],
    locations: locations.data ?? [],
    isLoading: products.isLoading,
    isLocationsLoading: locations.isLoading,
    error: products.error,
    create: createProductMutation.mutateAsync,
    update: updateProductMutation.mutateAsync,
    delete: deleteProductMutation.mutateAsync,
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
    refetch: () => {
      products.refetch();
      locations.refetch();
    },
  };
}
