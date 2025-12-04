# Vitest Testing Skill

## Overview
Expert guidance for testing React applications with Vitest, React Testing Library, and achieving comprehensive test coverage.

## Tech Stack Context
- **Vitest**: 2.1.8 (Fast unit test framework)
- **React Testing Library**: 16.3.0
- **Testing Library Jest DOM**: 6.9.1
- **Testing Library User Event**: 14.6.1
- **Coverage**: @vitest/coverage-v8 2.1.8
- **JSDOM**: 25.0.1 (Browser environment simulation)

## Configuration

### Vitest Config (vitest.config.ts)
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ]
    }
  }
});
```

### Test Setup File
```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

## Testing Patterns

### Basic Component Test
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const { user } = setup(<Button onClick={handleClick}>Click</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Setup Helper for User Interactions
```typescript
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

export const setup = (jsx: React.ReactElement) => {
  return {
    user: userEvent.setup(),
    ...render(jsx)
  };
};
```

### Testing with Providers
```typescript
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <ChakraProvider>
          {children}
        </ChakraProvider>
      </BrowserRouter>
    </Provider>
  );
};

export const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: AllProviders });
};
```

### Testing Hooks
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useProducts } from './useProducts';

describe('useProducts', () => {
  it('fetches products on mount', async () => {
    const { result } = renderHook(() => useProducts());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toHaveLength(5);
  });
});
```

### Async Testing
```typescript
import { waitFor } from '@testing-library/react';

it('loads and displays data', async () => {
  render(<ProductList />);

  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  // Check data is displayed
  expect(screen.getByText(/fresh apples/i)).toBeInTheDocument();
});
```

### User Interactions
```typescript
import { setup } from '@/test/utils';

it('handles form submission', async () => {
  const handleSubmit = vi.fn();
  const { user } = setup(<LoginForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/email/i), 'user@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'user@example.com',
    password: 'password123'
  });
});
```

## Mocking

### Mock Functions
```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');
mockFn.mockResolvedValue({ data: 'async data' });
```

### Mock Modules
```typescript
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [{ id: 1, title: 'Test' }],
        error: null
      }))
    }))
  }))
}));
```

### Mock React Router
```typescript
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: '123' })
  };
});
```

### Mock Leaflet
```typescript
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div />,
  Marker: () => <div />,
  Popup: ({ children }: any) => <div>{children}</div>
}));
```

## Testing Best Practices

### Query Priority
1. **getByRole**: Most accessible queries
2. **getByLabelText**: For form inputs
3. **getByPlaceholderText**: When label isn't available
4. **getByText**: For non-interactive elements
5. **getByTestId**: Last resort

### Assertions
```typescript
// Presence
expect(element).toBeInTheDocument();
expect(element).not.toBeInTheDocument();

// Visibility
expect(element).toBeVisible();
expect(element).not.toBeVisible();

// Text content
expect(element).toHaveTextContent('text');

// Attributes
expect(element).toHaveAttribute('disabled');
expect(element).toHaveClass('active');

// Form elements
expect(input).toHaveValue('value');
expect(checkbox).toBeChecked();
```

### Accessibility Testing
```typescript
it('has no accessibility violations', async () => {
  const { container } = render(<Component />);

  // Check for proper ARIA labels
  expect(screen.getByRole('button')).toHaveAccessibleName('Submit');

  // Check keyboard navigation
  const button = screen.getByRole('button');
  button.focus();
  expect(button).toHaveFocus();
});
```

## Coverage

### Running Tests
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With UI
npm run test:ui

# Generate coverage
npm run test:coverage
```

### Coverage Goals
- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

### Coverage Exclusions
```typescript
/* v8 ignore next */
if (process.env.NODE_ENV === 'development') {
  // Development-only code
}
```

## Snapshot Testing
```typescript
import { render } from '@testing-library/react';

it('matches snapshot', () => {
  const { container } = render(<Component />);
  expect(container).toMatchSnapshot();
});
```

## Testing Redux

### Testing Actions
```typescript
import { configureStore } from '@reduxjs/toolkit';
import { productsSlice } from './productsSlice';

it('handles addProduct action', () => {
  const store = configureStore({ reducer: { products: productsSlice.reducer } });

  store.dispatch(productsSlice.actions.addProduct({ id: '1', title: 'Test' }));

  expect(store.getState().products.items).toHaveLength(1);
});
```

### Testing with Redux Provider
```typescript
const renderWithStore = (
  ui: React.ReactElement,
  { preloadedState, ...renderOptions } = {}
) => {
  const store = configureStore({
    reducer: { products: productsSlice.reducer },
    preloadedState
  });

  return render(
    <Provider store={store}>{ui}</Provider>,
    renderOptions
  );
};
```

## Common Patterns

### Testing Error States
```typescript
it('displays error message when fetch fails', async () => {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch' }
    })
  });

  render(<ProductList />);

  await waitFor(() => {
    expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
  });
});
```

### Testing Loading States
```typescript
it('shows loading spinner while fetching', () => {
  render(<ProductList />);
  expect(screen.getByRole('status')).toBeInTheDocument();
});
```

### Testing Conditional Rendering
```typescript
it('shows empty state when no products', async () => {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: [], error: null })
  });

  render(<ProductList />);

  await waitFor(() => {
    expect(screen.getByText(/no products found/i)).toBeInTheDocument();
  });
});
```

## Debugging Tests

### Screen Debug
```typescript
import { screen } from '@testing-library/react';

// Print entire DOM
screen.debug();

// Print specific element
screen.debug(screen.getByRole('button'));
```

### Log Queries
```typescript
import { logRoles } from '@testing-library/react';

const { container } = render(<Component />);
logRoles(container);
```

## When to Use This Skill
- Writing unit tests for React components
- Testing custom hooks
- Mocking external dependencies
- Setting up test utilities and helpers
- Improving test coverage
- Debugging failing tests
- Testing async behavior
- Testing Redux integration
- Writing accessible tests
