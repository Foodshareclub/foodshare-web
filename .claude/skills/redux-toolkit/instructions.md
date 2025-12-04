# Redux Toolkit State Management Skill

## Overview
Expert guidance for implementing modern Redux state management using Redux Toolkit (RTK) with React Redux integration.

## Tech Stack Context
- **Redux Toolkit**: 2.10.1 (Modern Redux)
- **React Redux**: 9.2.0 (React bindings)
- **Features**: createSlice, configureStore, createAsyncThunk, RTK Query

## Store Configuration

### Basic Store Setup
```typescript
// src/store/redux-store.ts
import { configureStore } from '@reduxjs/toolkit';
import productsReducer from './slices/productsSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    products: productsReducer,
    user: userReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['products/addProduct'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['products.date']
      }
    })
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Provider Setup
```typescript
// src/index.tsx
import { Provider } from 'react-redux';
import { store } from './store/redux-store';

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
```

## Creating Slices

### Basic Slice
```typescript
// src/store/slices/productsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
}

interface ProductsState {
  items: Product[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  items: [],
  loading: false,
  error: null
};

export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    addProduct: (state, action: PayloadAction<Product>) => {
      state.items.push(action.payload);
    },
    removeProduct: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    updateProduct: (state, action: PayloadAction<Product>) => {
      const index = state.items.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    clearProducts: (state) => {
      state.items = [];
    }
  }
});

export const { addProduct, removeProduct, updateProduct, clearProducts } = productsSlice.actions;
export default productsSlice.reducer;
```

### Slice with Prepare Callback
```typescript
reducers: {
  addProduct: {
    reducer: (state, action: PayloadAction<Product & { timestamp: number }>) => {
      state.items.push(action.payload);
    },
    prepare: (product: Product) => {
      return {
        payload: {
          ...product,
          timestamp: Date.now()
        }
      };
    }
  }
}
```

## Async Thunks

### Basic Async Thunk
```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabase';

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);
```

### Async Thunk with Arguments
```typescript
export const fetchProductById = createAsyncThunk(
  'products/fetchById',
  async (productId: string, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);
```

### Handling Async Thunks in Slice
```typescript
export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    // sync reducers
  },
  extraReducers: (builder) => {
    builder
      // Fetch products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch single product
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        } else {
          state.items.push(action.payload);
        }
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});
```

## React Hooks

### Typed Hooks
```typescript
// src/store/hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './redux-store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Using in Components
```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProducts, addProduct } from '@/store/slices/productsSlice';

export const ProductList = () => {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const handleAddProduct = (product: Product) => {
    dispatch(addProduct(product));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {items.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
```

## Selectors

### Basic Selectors
```typescript
// src/store/slices/productsSlice.ts
export const selectAllProducts = (state: RootState) => state.products.items;
export const selectProductsLoading = (state: RootState) => state.products.loading;
export const selectProductById = (state: RootState, productId: string) =>
  state.products.items.find(item => item.id === productId);
```

### Memoized Selectors with createSelector
```typescript
import { createSelector } from '@reduxjs/toolkit';

export const selectAvailableProducts = createSelector(
  [selectAllProducts],
  (products) => products.filter(product => product.status === 'available')
);

export const selectProductsByCategory = createSelector(
  [selectAllProducts, (state: RootState, category: string) => category],
  (products, category) => products.filter(product => product.category === category)
);

export const selectProductStats = createSelector(
  [selectAllProducts],
  (products) => ({
    total: products.length,
    available: products.filter(p => p.status === 'available').length,
    sold: products.filter(p => p.status === 'sold').length
  })
);
```

### Using Selectors
```typescript
const availableProducts = useAppSelector(selectAvailableProducts);
const stats = useAppSelector(selectProductStats);
const vegetableProducts = useAppSelector((state) =>
  selectProductsByCategory(state, 'vegetables')
);
```

## RTK Query (Optional Advanced Pattern)

### API Slice
```typescript
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/lib/supabase';

export const productsApi = createApi({
  reducerPath: 'productsApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Product'],
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], void>({
      queryFn: async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*');

        if (error) return { error: error.message };
        return { data };
      },
      providesTags: ['Product']
    }),
    getProductById: builder.query<Product, string>({
      queryFn: async (id) => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error) return { error: error.message };
        return { data };
      },
      providesTags: (result, error, id) => [{ type: 'Product', id }]
    }),
    addProduct: builder.mutation<Product, Partial<Product>>({
      queryFn: async (product) => {
        const { data, error } = await supabase
          .from('products')
          .insert(product)
          .select()
          .single();

        if (error) return { error: error.message };
        return { data };
      },
      invalidatesTags: ['Product']
    }),
    updateProduct: builder.mutation<Product, Partial<Product>>({
      queryFn: async ({ id, ...updates }) => {
        const { data, error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) return { error: error.message };
        return { data };
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'Product', id }]
    }),
    deleteProduct: builder.mutation<void, string>({
      queryFn: async (id) => {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (error) return { error: error.message };
        return { data: undefined };
      },
      invalidatesTags: ['Product']
    })
  })
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation
} = productsApi;
```

### Using RTK Query Hooks
```typescript
export const ProductList = () => {
  const { data: products, isLoading, error } = useGetProductsQuery();
  const [addProduct] = useAddProductMutation();

  const handleAdd = async (product: Partial<Product>) => {
    try {
      await addProduct(product).unwrap();
    } catch (err) {
      console.error('Failed to add product:', err);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading products</div>;

  return (
    <div>
      {products?.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
```

## Middleware

### Custom Middleware
```typescript
import { Middleware } from '@reduxjs/toolkit';

const loggerMiddleware: Middleware = (store) => (next) => (action) => {
  console.log('Dispatching:', action);
  const result = next(action);
  console.log('Next State:', store.getState());
  return result;
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(loggerMiddleware)
});
```

## Best Practices

### State Structure
```typescript
// Good - Normalized
interface ProductsState {
  ids: string[];
  entities: Record<string, Product>;
  loading: boolean;
}

// Better for lookups
const product = state.products.entities[productId];

// Avoid - Nested arrays
interface BadState {
  categories: {
    name: string;
    products: Product[];
  }[];
}
```

### Immer Patterns (Built into RTK)
```typescript
// Redux Toolkit uses Immer, so you can write "mutating" code
reducers: {
  addProduct: (state, action) => {
    // This looks like mutation but Immer makes it safe
    state.items.push(action.payload);
  },
  updateProduct: (state, action) => {
    const product = state.items.find(p => p.id === action.payload.id);
    if (product) {
      product.title = action.payload.title; // Safe with Immer
    }
  }
}
```

### Action Naming Conventions
```typescript
// Format: domain/eventName
'products/addProduct'
'products/removeProduct'
'products/fetchProducts'
'user/login'
'user/logout'
```

## Performance Optimization

### Selective Re-rendering
```typescript
// Only re-render when specific slice changes
const productCount = useAppSelector((state) => state.products.items.length);

// Use memoized selectors for derived data
const filteredProducts = useAppSelector(selectAvailableProducts);
```

### Batch Actions
```typescript
import { batch } from 'react-redux';

batch(() => {
  dispatch(action1());
  dispatch(action2());
  dispatch(action3());
});
```

## DevTools

### Redux DevTools Integration
```typescript
export const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production'
});
```

### Time Travel Debugging
- Use Redux DevTools extension
- Jump to any previous state
- Replay actions
- Export/import state

## Testing

### Testing Reducers
```typescript
import { productsSlice, addProduct } from './productsSlice';

describe('productsSlice', () => {
  it('should add product', () => {
    const initialState = { items: [], loading: false, error: null };
    const product = { id: '1', title: 'Test' };

    const nextState = productsSlice.reducer(
      initialState,
      addProduct(product)
    );

    expect(nextState.items).toHaveLength(1);
    expect(nextState.items[0]).toEqual(product);
  });
});
```

### Testing Async Thunks
```typescript
import { fetchProducts } from './productsSlice';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');

it('fetches products successfully', async () => {
  const mockProducts = [{ id: '1', title: 'Test' }];

  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: mockProducts, error: null })
  });

  const dispatch = vi.fn();
  const thunk = fetchProducts();

  await thunk(dispatch, () => ({}), undefined);

  expect(dispatch).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'products/fetchProducts/fulfilled' })
  );
});
```

### Testing with Components
```typescript
import { renderWithProviders } from '@/test/utils';
import { store } from '@/store/redux-store';

it('displays products from store', () => {
  const preloadedState = {
    products: {
      items: [{ id: '1', title: 'Test Product' }],
      loading: false,
      error: null
    }
  };

  renderWithProviders(<ProductList />, { preloadedState });

  expect(screen.getByText('Test Product')).toBeInTheDocument();
});
```

## When to Use This Skill
- Setting up Redux Toolkit store
- Creating slices and reducers
- Implementing async data fetching
- Writing memoized selectors
- Integrating Redux with React components
- Optimizing Redux performance
- Setting up RTK Query for API calls
- Testing Redux logic
- Debugging state management issues
- Migrating from old Redux to Redux Toolkit
