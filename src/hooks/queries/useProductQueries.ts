/**
 * Product Queries (TanStack Query)
 * Handles product data fetching and mutations via API routes and Server Actions
 * No direct server imports - all data flows through API routes or Server Actions
 */

'use client';

import {
  useQuery,
  useInfiniteQuery,
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
import { PAGINATION } from '@/lib/constants';
import type { InitialProductStateType, LocationType } from '@/types/product.types';

// Re-export types for consumers
export type { InitialProductStateType, LocationType };

// ============================================================================
// Pagination Types
// ============================================================================

interface PaginatedResponse {
  data: InitialProductStateType[];
  nextCursor: number | null;
  hasMore: boolean;
}

// ============================================================================
// API Fetch Functions (Client-safe)
// ============================================================================

// Request deduplication map - prevents duplicate in-flight requests
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Deduplicated fetch - prevents multiple identical requests
 */
async function deduplicatedFetch<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  const existing = pendingRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  
  const promise = fetchFn().finally(() => {
    pendingRequests.delete(key);
  });
  
  pendingRequests.set(key, promise);
  return promise;
}

async function fetchProducts(type: string): Promise<InitialProductStateType[]> {
  return deduplicatedFetch(`products-${type}`, async () => {
    const res = await fetch(`/api/products?type=${encodeURIComponent(type)}`);
    if (!res.ok) throw new Error('Failed to fetch products');
    const json = await res.json();
    // Handle both paginated and non-paginated responses
    return json.data ?? json;
  });
}

async function fetchProductsPaginated(
  type: string,
  cursor?: number | null,
  limit: number = PAGINATION.DEFAULT_PAGE_SIZE
): Promise<PaginatedResponse> {
  const cacheKey = `products-paginated-${type}-${cursor ?? 'first'}-${limit}`;
  
  return deduplicatedFetch(cacheKey, async () => {
    const params = new URLSearchParams({
      type,
      limit: String(limit),
    });
    if (cursor) {
      params.set('cursor', String(cursor));
    }
    const res = await fetch(`/api/products?${params}`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  });
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
  infinite: (type: string) => [...productKeys.all, 'infinite', type] as const,
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
    placeholderData: (previousData) => previousData, // Show stale data while refetching
    ...options,
  });
}

/**
 * Get products with infinite scroll pagination
 * Uses cursor-based pagination for efficient loading
 * Accepts optional initialData from server-side fetch to avoid refetch on mount
 * 
 * Caching strategy:
 * - staleTime: 2 min - data considered fresh, no refetch
 * - gcTime: 30 min - keep in memory for instant back-navigation
 * - refetchOnMount: false when initialData provided (server already fetched)
 * - placeholderData: keepPreviousData for smooth transitions
 * - Prefetches next page when current page loads
 */
export function useInfiniteProducts(
  productType: string,
  initialData?: InitialProductStateType[]
) {
  const queryClient = useQueryClient();
  const hasInitialData = initialData && initialData.length > 0;
  
  const query = useInfiniteQuery({
    queryKey: productKeys.infinite(productType),
    queryFn: async ({ pageParam }) => {
      const result = await fetchProductsPaginated(productType, pageParam);
      
      // Prefetch next page in background for smoother scrolling
      if (result.hasMore && result.nextCursor) {
        // Use setTimeout to not block current render
        setTimeout(() => {
          fetchProductsPaginated(productType, result.nextCursor).catch(() => {
            // Silently fail prefetch - it's just an optimization
          });
        }, 100);
      }
      
      return result;
    },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    
    // Caching configuration optimized for infinite scroll
    staleTime: 2 * 60 * 1000, // 2 minutes - matches API first page cache
    gcTime: 30 * 60 * 1000, // 30 minutes - keep for back navigation
    
    // Don't refetch on mount if we have server-provided initial data
    refetchOnMount: hasInitialData ? false : true,
    
    // Keep previous data during refetch for smooth UX
    placeholderData: (previousData) => previousData,
    
    // Use server-fetched data as initial page to avoid refetch
    initialData: hasInitialData
      ? {
          pages: [
            {
              data: initialData,
              nextCursor: initialData.length >= PAGINATION.DEFAULT_PAGE_SIZE
                ? initialData[initialData.length - 1].id
                : null,
              hasMore: initialData.length >= PAGINATION.DEFAULT_PAGE_SIZE,
            },
          ],
          pageParams: [null],
        }
      : undefined,
      
    // Mark initial data as fresh to prevent immediate refetch
    initialDataUpdatedAt: hasInitialData ? Date.now() : undefined,
    
    // Structural sharing for better performance with large datasets
    structuralSharing: true,
  });

  return query;
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
    placeholderData: (previousData) => previousData,
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
    placeholderData: (previousData) => previousData,
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
    placeholderData: (previousData) => previousData,
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
 * @deprecated Use Server Components with direct image URLs instead
 */
export function useProductImage(imagePath: string | undefined) {
  return useImageBlobUrl({
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
    deps: [imagePath],
  });
}

// ============================================================================
// Mutations - Using Server Actions with Optimistic Updates
// ============================================================================

/**
 * Create a new product with optimistic updates for infinite scroll
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
      condition?: string;
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
      if (productData.condition) {
        formData.set('condition', productData.condition);
      }
      formData.set('images', JSON.stringify(productData.images ?? []));
      formData.set('profile_id', productData.profile_id);

      const result = await createProduct(formData);
      if (!result.success) {
        throw new Error(result.error.message ?? 'Failed to create product');
      }
      return result;
    },
    onSuccess: (result, variables) => {
      // Optimistically add to infinite scroll cache if we have the new product data
      if (result.data) {
        const newProduct = result.data as InitialProductStateType;
        
        // Update infinite query cache - prepend new item to first page
        queryClient.setQueriesData<{
          pages: PaginatedResponse[];
          pageParams: (number | null)[];
        }>(
          { queryKey: productKeys.infinite(variables.post_type) },
          (oldData) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page, index) => 
                index === 0 
                  ? { ...page, data: [newProduct, ...page.data] }
                  : page
              ),
            };
          }
        );
      }
      
      // Invalidate to ensure consistency
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
      condition?: string;
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
      if (productData.condition) formData.set('condition', productData.condition);
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
      // Invalidate all product queries including infinite scroll
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.locations() });
    },
  });
}

/**
 * Delete a product with optimistic updates for both list and infinite queries
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
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: productKeys.all });

      // Snapshot previous values for rollback
      const previousLists = queryClient.getQueriesData<InitialProductStateType[]>({
        queryKey: productKeys.lists(),
      });
      
      const previousInfinite = queryClient.getQueriesData<{
        pages: PaginatedResponse[];
        pageParams: (number | null)[];
      }>({
        queryKey: ['products', 'infinite'],
      });

      // Optimistically remove from list queries
      queryClient.setQueriesData<InitialProductStateType[]>(
        { queryKey: productKeys.lists() },
        (old) => old?.filter((p) => p.id !== productId) ?? []
      );
      
      // Optimistically remove from infinite queries
      queryClient.setQueriesData<{
        pages: PaginatedResponse[];
        pageParams: (number | null)[];
      }>(
        { queryKey: ['products', 'infinite'] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: page.data.filter((p) => p.id !== productId),
            })),
          };
        }
      );

      return { previousLists, previousInfinite };
    },
    onError: (_err, _productId, context) => {
      // Rollback on error
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      context?.previousInfinite.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: (productId) => {
      if (productId) {
        queryClient.removeQueries({
          queryKey: productKeys.detail(productId),
        });
      }
      // Invalidate to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
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
