# Testing Next.js 16 with Jest

## Overview

Testing Next.js 16 applications with Jest and React Testing Library, focusing on Server Components and Server Actions patterns.

## Configuration

### jest.config.js

```javascript
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/", "<rootDir>/e2e/"],
  collectCoverageFrom: ["src/**/*.{js,jsx,ts,tsx}", "!src/**/*.d.ts", "!src/**/index.ts"],
};

module.exports = createJestConfig(customJestConfig);
```

### Test Setup

```typescript
// jest.setup.js
import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));
```

## Testing Patterns

### Test Utilities

```typescript
// src/test/utils.tsx
import { render, RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactElement } from "react";

export function setup(jsx: ReactElement, options?: RenderOptions) {
  return {
    user: userEvent.setup(),
    ...render(jsx, options),
  };
}
```

### Testing Client Components

```typescript
import { screen } from '@testing-library/react';
import { setup } from '@/test/utils';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    post_name: 'Fresh Apples',
    post_description: 'Organic apples',
  };

  it('renders product information', () => {
    setup(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Fresh Apples')).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = jest.fn();
    const { user } = setup(<ProductCard product={mockProduct} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith('1');
  });
});
```

### Testing Server Actions

```typescript
// Mock Supabase
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      delete: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
      }),
    },
  })),
}));

// Mock revalidateTag
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

describe("createProduct action", () => {
  it("creates product and revalidates cache", async () => {
    const { createProduct } = await import("./products");
    const { revalidateTag } = require("next/cache");

    const formData = new FormData();
    formData.set("post_name", "Test Product");

    await createProduct(formData);

    expect(revalidateTag).toHaveBeenCalledWith("products");
  });
});
```

### Testing Forms with Server Actions

```typescript
import { setup } from '@/test/utils';
import { screen, waitFor } from '@testing-library/react';
import { CreateProductForm } from './CreateProductForm';

jest.mock('@/app/actions/products', () => ({
  createProduct: jest.fn().mockResolvedValue({ success: true }),
}));

describe('CreateProductForm', () => {
  it('submits form data to server action', async () => {
    const { createProduct } = require('@/app/actions/products');
    const { user } = setup(<CreateProductForm />);

    await user.type(screen.getByLabelText(/title/i), 'New Product');
    await user.type(screen.getByLabelText(/description/i), 'Product description');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(createProduct).toHaveBeenCalled();
    });
  });

  it('shows validation errors', async () => {
    const { user } = setup(<CreateProductForm />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
  });
});
```

## Mocking

### Mock Supabase Client

```typescript
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          data: [{ id: "1", post_name: "Test" }],
          error: null,
        }),
      }),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  }),
}));
```

### Mock React Leaflet (for map tests)

```typescript
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="marker">{children}</div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({ flyTo: jest.fn() }),
}));
```

### Mock next-intl

```typescript
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));
```

## Testing shadcn/ui Components

```typescript
import { setup } from '@/test/utils';
import { screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders with variant', () => {
    setup(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('shows loading state', () => {
    setup(<Button disabled>Loading...</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

## Async Testing

```typescript
import { waitFor, screen } from '@testing-library/react';

it('loads and displays products', async () => {
  setup(<ProductList />);

  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  expect(screen.getByText('Fresh Apples')).toBeInTheDocument();
});

it('handles error state', async () => {
  jest.mocked(fetchProducts).mockRejectedValue(new Error('Network error'));

  setup(<ProductList />);

  expect(await screen.findByText(/error/i)).toBeInTheDocument();
});
```

## Commands

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run test:ci       # CI mode with coverage
```

## When to Use This Skill

- Testing React components
- Mocking Server Actions
- Testing forms and user interactions
- Mocking Supabase, navigation, i18n
- Writing unit and integration tests
