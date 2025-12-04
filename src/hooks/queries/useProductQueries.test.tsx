/**
 * useProductQueries Unit Tests
 * Tests for TanStack Query product hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useProducts,
  useProductsLocation,
  useProduct,
  useUserProducts,
  useSearchProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  productKeys,
} from './useProductQueries';
import type { InitialProductStateType } from '@/types/product.types';
import * as productActions from '@/app/actions/products';

// Mock Server Actions
jest.mock('@/app/actions/products', () => ({
  getProducts: jest.fn(),
  getProductsLocation: jest.fn(),
  getAllProducts: jest.fn(),
  getProductById: jest.fn(),
  getUserProducts: jest.fn(),
  searchProducts: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
}));

// Mock storageAPI
jest.mock('@/api/storageAPI', () => ({
  storageAPI: {
    downloadImage: jest.fn(),
    uploadImage: jest.fn(),
  },
}));

// Mock product data
const mockProduct: InitialProductStateType = {
  id: 1,
  post_name: 'Test Product',
  post_description: 'A test product description',
  post_type: 'food',
  post_address: '123 Test Street',
  post_stripped_address: 'Test Street',
  images: ['image1.jpg', 'image2.jpg'],
  available_hours: '9am-5pm',
  transportation: 'pickup',
  is_active: true,
  is_arranged: false,
  post_views: 10,
  post_like_counter: 5,
  profile_id: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  five_star: null,
  four_star: null,
  location: null as unknown as string, // PostGIS format
  reviews: [],
};

const mockProducts: InitialProductStateType[] = [
  mockProduct,
  { ...mockProduct, id: 2, post_name: 'Second Product' },
  { ...mockProduct, id: 3, post_name: 'Third Product' },
];

// Test wrapper
function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('productKeys', () => {
  it('should generate correct query keys', () => {
    expect(productKeys.all).toEqual(['products']);
    expect(productKeys.lists()).toEqual(['products', 'list']);
    expect(productKeys.list('food')).toEqual(['products', 'list', 'food']);
    expect(productKeys.locations()).toEqual(['products', 'locations']);
    expect(productKeys.location('food')).toEqual(['products', 'locations', 'food']);
    expect(productKeys.details()).toEqual(['products', 'detail']);
    expect(productKeys.detail(123)).toEqual(['products', 'detail', 123]);
    expect(productKeys.userProducts('user-123')).toEqual(['products', 'user', 'user-123']);
    expect(productKeys.search('pizza', 'food')).toEqual(['products', 'search', 'pizza', 'food']);
    expect(productKeys.image('path/to/image.jpg')).toEqual(['products', 'image', 'path/to/image.jpg']);
  });
});

describe('useProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch products by type successfully', async () => {
    (productActions.getProducts as jest.Mock).mockResolvedValueOnce(mockProducts);

    const { result } = renderHook(() => useProducts('food'), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProducts);
    expect(productActions.getProducts).toHaveBeenCalledWith('food');
  });

  it('should return empty array when no products', async () => {
    (productActions.getProducts as jest.Mock).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useProducts('food'), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should handle fetch error', async () => {
    const error = new Error('Failed to fetch products');
    (productActions.getProducts as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useProducts('food'), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});

describe('useProductsLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch product locations successfully', async () => {
    const mockLocations = [
      { id: 1, location_json: { lat: 50.0, lng: 14.0 }, post_name: 'Test', post_type: 'food', images: [] },
    ];

    (productActions.getProductLocations as jest.Mock).mockResolvedValueOnce(mockLocations);

    const { result } = renderHook(() => useProductsLocation('food'), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockLocations);
    expect(productActions.getProductLocations).toHaveBeenCalledWith('food');
  });
});

describe('useProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch single product by ID', async () => {
    (productActions.getProductById as jest.Mock).mockResolvedValueOnce(mockProduct);

    const { result } = renderHook(() => useProduct(1), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProduct);
    expect(productActions.getProductById).toHaveBeenCalledWith(1);
  });

  it('should not fetch when productId is undefined', async () => {
    const { result } = renderHook(() => useProduct(undefined), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(productActions.getProductById).not.toHaveBeenCalled();
  });

  it('should return null when product not found', async () => {
    (productActions.getProductById as jest.Mock).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useProduct(999), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });
});

describe('useUserProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch user products successfully', async () => {
    (productActions.getUserProducts as jest.Mock).mockResolvedValueOnce(mockProducts);

    const { result } = renderHook(() => useUserProducts('user-123'), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProducts);
    expect(productActions.getUserProducts).toHaveBeenCalledWith('user-123');
  });

  it('should not fetch when userId is undefined', async () => {
    const { result } = renderHook(() => useUserProducts(undefined), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(productActions.getUserProducts).not.toHaveBeenCalled();
  });
});

describe('useSearchProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should search products successfully', async () => {
    (productActions.searchProducts as jest.Mock).mockResolvedValueOnce([mockProduct]);

    const { result } = renderHook(() => useSearchProducts('pizza', 'food'), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([mockProduct]);
    expect(productActions.searchProducts).toHaveBeenCalledWith('pizza', 'food');
  });

  it('should not search when query is empty', async () => {
    const { result } = renderHook(() => useSearchProducts('', 'food'), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(productActions.searchProducts).not.toHaveBeenCalled();
  });

  it('should not search when query is whitespace only', async () => {
    const { result } = renderHook(() => useSearchProducts('   ', 'food'), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(productActions.searchProducts).not.toHaveBeenCalled();
  });
});

describe('useCreateProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create product successfully', async () => {
    (productActions.createProduct as jest.Mock).mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createTestWrapper(),
    });

    await result.current.mutateAsync(mockProduct);

    expect(productActions.createProduct).toHaveBeenCalledWith(mockProduct);
  });

  it('should handle create error', async () => {
    const error = new Error('Failed to create product');
    (productActions.createProduct as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createTestWrapper(),
    });

    await expect(result.current.mutateAsync(mockProduct)).rejects.toThrow('Failed to create product');
  });
});

describe('useUpdateProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update product successfully', async () => {
    (productActions.updateProduct as jest.Mock).mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useUpdateProduct(), {
      wrapper: createTestWrapper(),
    });

    const updatedProduct = { ...mockProduct, post_name: 'Updated Name' };
    await result.current.mutateAsync(updatedProduct);

    expect(productActions.updateProduct).toHaveBeenCalledWith(updatedProduct);
  });

  it('should handle update error', async () => {
    const error = new Error('Failed to update product');
    (productActions.updateProduct as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useUpdateProduct(), {
      wrapper: createTestWrapper(),
    });

    await expect(result.current.mutateAsync(mockProduct)).rejects.toThrow('Failed to update product');
  });
});

describe('useDeleteProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete product successfully', async () => {
    (productActions.deleteProduct as jest.Mock).mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useDeleteProduct(), {
      wrapper: createTestWrapper(),
    });

    await result.current.mutateAsync(1);

    expect(productActions.deleteProduct).toHaveBeenCalledWith(1);
  });

  it('should handle delete error', async () => {
    const error = new Error('Failed to delete product');
    (productActions.deleteProduct as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useDeleteProduct(), {
      wrapper: createTestWrapper(),
    });

    await expect(result.current.mutateAsync(1)).rejects.toThrow('Failed to delete product');
  });
});
