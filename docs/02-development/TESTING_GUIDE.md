# FoodShare Testing Quick Start Guide

**Get from 0% to 20% coverage in 1 week**

---

## Day 1: Setup Test Infrastructure (2-3 hours)

### Step 1: Install Dependencies

```bash
cd /Users/organic/dev/work/foodshare/frontend

# Install Vitest and testing utilities
npm install -D vitest@^2.1.0 \
  @vitest/ui@^2.1.0 \
  jsdom@^25.0.0 \
  msw@^2.6.0 \
  @types/testing-library__jest-dom@^6.0.0 \
  c8@^10.1.0 \
  happy-dom@^15.11.0

# Verify installation
npm list vitest
```

### Step 2: Create Vitest Configuration

Create `/Users/organic/dev/work/foodshare/frontend/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { lingui } from "@lingui/vite-plugin";
import path from "path";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["macros"],
      },
    }),
    lingui(),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    css: true,
    coverage: {
      provider: "c8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/setupTests.ts",
        "src/reportWebVitals.ts",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData.ts",
        "src/locales/**",
        "build/",
        "dist/",
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "build", "dist"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Step 3: Update setupTests.ts

Update `/Users/organic/dev/work/foodshare/frontend/src/setupTests.ts`:

```typescript
import "@testing-library/jest-dom";
import { expect, afterEach, vi, beforeAll, afterAll } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(() => 1),
  clearWatch: vi.fn(),
};
Object.defineProperty(global.navigator, "geolocation", {
  value: mockGeolocation,
  writable: true,
});

// Mock Leaflet
vi.mock("leaflet", () => ({
  map: vi.fn(() => ({
    setView: vi.fn().mockReturnThis(),
    addLayer: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  })),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn(),
  })),
  marker: vi.fn(() => ({
    addTo: vi.fn(),
    bindPopup: vi.fn().mockReturnThis(),
  })),
  icon: vi.fn((options) => options),
  DivIcon: vi.fn((options) => options),
}));

// Mock Supabase client
vi.mock("@/supaBase.config", () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({ data: { user: null, session: null }, error: null })
      ),
      signUp: vi.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(() => Promise.resolve("ok")),
  },
}));
```

### Step 4: Update package.json

Update scripts in `/Users/organic/dev/work/foodshare/frontend/package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:ci": "vitest run --coverage --reporter=verbose"
  }
}
```

### Step 5: Verify Setup

```bash
# Run the existing test
npm test -- --run

# Should pass the App.test.tsx
```

---

## Day 2: Create Test Utilities (2 hours)

### Create test-utils.tsx

Create `/Users/organic/dev/work/foodshare/frontend/src/utils/test-utils.tsx`:

```typescript
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { I18nProvider } from '@lingui/react';
import { configureStore, PreloadedState } from '@reduxjs/toolkit';
import { userReducer, productReducer, chatReducer } from '@/store';
import { i18n } from '@/utils/i18n';

// Create a properly typed store setup function
export function setupStore(preloadedState?: any) {
  return configureStore({
    reducer: {
      user: userReducer,
      products: productReducer,
      chat: chatReducer,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
}

export type RootState = ReturnType<ReturnType<typeof setupStore>['getState']>;
export type AppStore = ReturnType<typeof setupStore>;

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: AppStore;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = setupStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          <ChakraProvider>
            <I18nProvider i18n={i18n}>
              {children}
            </I18nProvider>
          </ChakraProvider>
        </BrowserRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

// Mock data factories
export const mockUser = (overrides = {}) => ({
  id: 'test-user-123',
  email: 'test@foodshare.com',
  full_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  phone: '+1234567890',
  bio: 'Test bio',
  address: '123 Test Street, Test City',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

export const mockProduct = (overrides = {}) => ({
  id: 1,
  profile_id: 'test-user-123',
  post_name: 'Fresh Organic Apples',
  post_description: 'Delicious red apples from my garden',
  post_type: 'food',
  post_address: '123 Apple Lane, Fruitville',
  post_stripped_address: 'Fruitville',
  latitude: 40.7128,
  longitude: -74.0060,
  locations: { _latitude: 40.7128, _longitude: -74.0060 },
  gif_url: 'https://example.com/apples.jpg',
  gif_url_2: '',
  gif_url_3: '',
  available_hours: '9AM - 5PM',
  transportation: 'pickup',
  active: true,
  post_arranged: false,
  post_views: 10,
  post_like_counter: 5,
  created_att: '2025-01-01T00:00:00Z',
  five_star: null,
  four_star: null,
  reviews: [],
  ...overrides,
});

export const mockRoom = (overrides = {}) => ({
  id: 'room-123',
  requester: 'requester-user-id',
  sharer: 'sharer-user-id',
  post_id: 1,
  last_message: 'Hello, is this still available?',
  last_message_sent_by: 'requester-user-id',
  last_message_seen_by: 'requester-user-id',
  last_message_time: '2025-01-01T12:00:00Z',
  created_at: '2025-01-01T10:00:00Z',
  ...overrides,
});

export const mockMessage = (overrides = {}) => ({
  id: 'message-123',
  room_id: 'room-123',
  profile_id: 'test-user-123',
  text: 'Test message content',
  image: null,
  timestamp: '2025-01-01T12:00:00Z',
  ...overrides,
});

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
```

---

## Day 3-4: Write First 10 Unit Tests (4 hours)

### Test 1: Utility Function - Distance Calculator

Create `/Users/organic/dev/work/foodshare/frontend/src/utils/__tests__/getDistanceFromLatLonInKm.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import getDistanceFromLatLonInKm from "../getDistanceFromLatLonInKm";

describe("getDistanceFromLatLonInKm", () => {
  it("should calculate distance between NYC and LA correctly", () => {
    const distance = getDistanceFromLatLonInKm(
      40.7128,
      -74.006, // New York
      34.0522,
      -118.2437 // Los Angeles
    );

    // Actual distance is approximately 3936 km
    expect(distance).toBeGreaterThan(3900);
    expect(distance).toBeLessThan(4000);
  });

  it("should return 0 for identical coordinates", () => {
    const distance = getDistanceFromLatLonInKm(40.7128, -74.006, 40.7128, -74.006);

    expect(distance).toBe(0);
  });

  it("should calculate short distances accurately", () => {
    // Two points ~1km apart
    const distance = getDistanceFromLatLonInKm(40.7128, -74.006, 40.7138, -74.007);

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(2);
  });

  it("should handle crossing the equator", () => {
    const distance = getDistanceFromLatLonInKm(10, 0, -10, 0);

    expect(distance).toBeGreaterThan(2200);
    expect(distance).toBeLessThan(2300);
  });
});
```

### Test 2: Custom Hook - useDebounce

Create `/Users/organic/dev/work/foodshare/frontend/src/hook/__tests__/useDebounce.test.ts`:

```typescript
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import useDebounce from "../useDebounce";

describe("useDebounce", () => {
  it("should return initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 500));
    expect(result.current).toBe("initial");
  });

  it("should debounce value changes", () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: "initial", delay: 500 },
    });

    expect(result.current).toBe("initial");

    // Update value
    rerender({ value: "updated", delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe("initial");

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now value should be updated
    expect(result.current).toBe("updated");

    vi.useRealTimers();
  });

  it("should reset timer on rapid value changes", () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
      initialProps: { value: "initial" },
    });

    rerender({ value: "first" });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    rerender({ value: "second" });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // After 600ms total, value should still be 'initial'
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // After 800ms total (500ms since last change), value should be 'second'
    expect(result.current).toBe("second");

    vi.useRealTimers();
  });
});
```

### Test 3: API - productAPI.getProducts

Create `/Users/organic/dev/work/foodshare/frontend/src/api/__tests__/productAPI.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { productAPI } from "../productAPI";
import { supabase } from "@/supaBase.config";

vi.mock("@/supaBase.config");

describe("productAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProducts", () => {
    it("should fetch products by type with reviews", async () => {
      const mockProducts = [
        {
          id: 1,
          post_name: "Fresh Apples",
          post_type: "food",
          reviews: [],
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi
          .fn()
          .mockResolvedValueOnce({ data: mockProducts, error: null })
          .mockResolvedValueOnce({ data: mockProducts, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await productAPI.getProducts("food");

      expect(supabase.from).toHaveBeenCalledWith("posts");
      expect(mockChain.select).toHaveBeenCalledWith("*,reviews(*)");
      expect(mockChain.order).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(mockChain.eq).toHaveBeenCalledWith("post_type", "food");
      expect(mockChain.eq).toHaveBeenCalledWith("active", true);
    });

    it("should handle database errors gracefully", async () => {
      const mockError = { message: "Database connection failed" };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await productAPI.getProducts("food");

      expect(result.error).toEqual(mockError);
      expect(result.data).toBeNull();
    });
  });

  describe("createProduct", () => {
    it("should insert new product", async () => {
      const newProduct = {
        post_name: "Fresh Bread",
        post_type: "food",
        post_description: "Homemade sourdough",
      };

      const mockChain = {
        insert: vi.fn().mockResolvedValue({ data: { id: 123, ...newProduct }, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await productAPI.createProduct(newProduct);

      expect(supabase.from).toHaveBeenCalledWith("posts");
      expect(mockChain.insert).toHaveBeenCalledWith(newProduct);
    });
  });

  describe("searchProducts", () => {
    it("should search products by keyword and type", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      await productAPI.searchProducts("apples", "food");

      expect(mockChain.eq).toHaveBeenCalledWith("post_type", "food");
      expect(mockChain.textSearch).toHaveBeenCalledWith("post_name", "apples", {
        type: "websearch",
      });
    });

    it('should search all types when type is "all"', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      await productAPI.searchProducts("bread", "all");

      expect(mockChain.textSearch).toHaveBeenCalled();
      expect(mockChain.eq).not.toHaveBeenCalled();
    });
  });

  describe("deleteProduct", () => {
    it("should delete product by id", async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      await productAPI.deleteProduct(123);

      expect(supabase.from).toHaveBeenCalledWith("posts");
      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith("id", 123);
    });
  });
});
```

### Run Tests

```bash
# Run all tests
npm test -- --run

# Run with coverage
npm run test:coverage

# Watch mode
npm test
```

---

## Day 5: Test Redux Reducers (3 hours)

### Test 4: userReducer - Login Flow

Create `/Users/organic/dev/work/foodshare/frontend/src/store/slices/__tests__/userReducer.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { userReducer, loginTC, logoutTC, userActions } from "../userReducer";
import { supabase } from "@/supaBase.config";

vi.mock("@/supaBase.config");

describe("userReducer", () => {
  const createTestStore = () =>
    configureStore({
      reducer: { user: userReducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
    });

  describe("loginTC", () => {
    it("should set isAuth to true on successful login", async () => {
      const store = createTestStore();
      const mockUser = {
        id: "123",
        email: "test@example.com",
        created_at: "2025-01-01",
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      } as any);

      await store.dispatch(loginTC({ email: "test@example.com", password: "password123" }));

      const state = store.getState().user;
      expect(state.isAuth).toBe(true);
      expect(state.isRegister).toBe(true);
      expect(state.authError).toBeNull();
    });

    it("should set authError on failed login", async () => {
      const store = createTestStore();

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid credentials" },
      } as any);

      await store.dispatch(loginTC({ email: "wrong@example.com", password: "wrong" }));

      const state = store.getState().user;
      expect(state.isAuth).toBe(false);
      expect(state.authError).toBeTruthy();
    });
  });

  describe("logoutTC", () => {
    it("should clear user state on logout", async () => {
      const store = createTestStore();

      // First login
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: "123" }, session: {} },
        error: null,
      } as any);

      await store.dispatch(loginTC({ email: "test@example.com", password: "password123" }));

      // Then logout
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as any);

      await store.dispatch(logoutTC());

      const state = store.getState().user;
      expect(state.isAuth).toBe(false);
      expect(state.isRegister).toBe(false);
    });
  });

  describe("changeLanguage action", () => {
    it("should update language preference", () => {
      const store = createTestStore();

      store.dispatch(userActions.changeLanguage("fr"));

      const state = store.getState().user;
      expect(state.language).toBe("fr");
    });
  });
});
```

---

## Day 6-7: Component Tests (4 hours)

### Test 5: ProductCard Component

Create `/Users/organic/dev/work/foodshare/frontend/src/components/productCard/__tests__/ProductCard.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderWithProviders, mockProduct, screen } from '@/utils/test-utils';
import ProductCard from '../ProductCard';

describe('ProductCard', () => {
  it('should render product name and description', () => {
    const product = mockProduct({
      post_name: 'Fresh Organic Apples',
      post_description: 'Delicious red apples from my garden',
    });

    renderWithProviders(<ProductCard product={product} />);

    expect(screen.getByText('Fresh Organic Apples')).toBeInTheDocument();
    expect(screen.getByText(/Delicious red apples/i)).toBeInTheDocument();
  });

  it('should display product image', () => {
    const product = mockProduct({
      gif_url: 'https://example.com/apples.jpg',
    });

    renderWithProviders(<ProductCard product={product} />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', expect.stringContaining('apples.jpg'));
  });

  it('should show "Arranged" badge when post is reserved', () => {
    const product = mockProduct({ post_arranged: true });

    renderWithProviders(<ProductCard product={product} />);

    expect(screen.getByText(/arranged/i)).toBeInTheDocument();
  });

  it('should not show "Arranged" badge when post is available', () => {
    const product = mockProduct({ post_arranged: false });

    renderWithProviders(<ProductCard product={product} />);

    expect(screen.queryByText(/arranged/i)).not.toBeInTheDocument();
  });
});
```

---

## Quick Win Commands

```bash
# Run all tests with coverage
npm run test:coverage

# Open coverage report in browser
open coverage/index.html

# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui

# Run only failing tests
npm test -- --only
```

---

## Coverage Milestones

After completing this quick start:

- **Day 1:** Test infrastructure setup ✓
- **Day 2:** Test utilities created ✓
- **Day 3-4:** 10 utility tests written (~5% coverage)
- **Day 5:** Redux tests written (~10% coverage)
- **Day 6-7:** Component tests written (~15-20% coverage)

**Next:** Follow the full QA_TESTING_STRATEGY.md for remaining 80% coverage.

---

## Troubleshooting

### Issue: "Cannot find module '@testing-library/jest-dom'"

```bash
npm install -D @testing-library/jest-dom@^6.9.1
```

### Issue: TypeScript errors in tests

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

### Issue: Tests timing out

Increase timeout in `vitest.config.ts`:

```typescript
test: {
  testTimeout: 10000,
}
```

### Issue: Supabase mocks not working

Ensure mock is defined in `setupTests.ts` BEFORE importing any files that use supabase.

---

## Next Steps

1. Complete all tests from Day 3-7
2. Run `npm run test:coverage` to verify 20% coverage
3. Fix any failing tests
4. Move to Phase 2 of QA_TESTING_STRATEGY.md
5. Set up CI/CD integration

**Good luck!** 🚀
