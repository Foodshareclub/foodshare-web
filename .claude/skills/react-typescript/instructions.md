# React 19 + TypeScript Development Skill

## Overview
Expert guidance for React 19 applications built with TypeScript, Vite, and modern tooling.

## Tech Stack Context
- **React**: 19.2.0 with latest features (useTransition, useOptimistic, etc.)
- **TypeScript**: 5.9.3 with strict type checking
- **Build Tool**: Vite 7.2.4
- **UI Framework**: Chakra UI 3.29.0
- **Routing**: React Router DOM 7.9.6
- **State Management**: Redux Toolkit + React Redux
- **Animation**: Framer Motion 12.23.24
- **Forms**: React Hook Form 7.66.1

## Best Practices

### Component Development
1. **Use functional components** with TypeScript interfaces for props
2. **Prefer named exports** for better tree-shaking
3. **Use proper typing** - avoid `any`, use specific types
4. **Memoization** - Use `React.memo`, `useMemo`, `useCallback` wisely
5. **Custom hooks** - Extract reusable logic into custom hooks

### TypeScript Patterns
```typescript
// Props interface
interface ComponentProps {
  title: string;
  onAction: (id: string) => void;
  children?: React.ReactNode;
}

// Component with proper typing
export const Component: React.FC<ComponentProps> = ({ title, onAction, children }) => {
  // Implementation
};
```

### Performance
- Use `lazy()` and `Suspense` for code splitting
- Implement proper error boundaries
- Optimize re-renders with proper dependency arrays
- Use Vite's dynamic imports for route-based splitting

### Chakra UI Integration
- Use Chakra's theme tokens for consistency
- Leverage responsive props (`base`, `md`, `lg`)
- Combine with Emotion for custom styling when needed
- Use Chakra icons from `@chakra-ui/icons`

### React 19 Features
- **useTransition**: For non-blocking state updates
- **useOptimistic**: For optimistic UI updates
- **Server Components**: Ready for future migration
- **Actions**: Use action functions for form handling

## File Organization
```
src/
  components/
    [feature]/
      Component.tsx
      Component.test.tsx
  hooks/
    useCustomHook.ts
  pages/
    [route]/
      Page.tsx
  store/
    redux-store.ts
    slices/
  types/
    [domain].types.ts
```

## Common Patterns

### Error Handling
```typescript
import { ErrorBoundary } from 'react-error-boundary';

const ErrorFallback = ({ error }: { error: Error }) => (
  <div>Something went wrong: {error.message}</div>
);

// Wrap components
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Component />
</ErrorBoundary>
```

### Async Data Fetching
```typescript
const [data, setData] = useState<DataType | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await api.getData();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

### Form Handling with React Hook Form
```typescript
import { useForm } from 'react-hook-form';

interface FormData {
  email: string;
  password: string;
}

const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

const onSubmit = (data: FormData) => {
  // Handle form submission
};
```

## Testing with Vitest
- Write unit tests for components
- Use `@testing-library/react` for component testing
- Mock external dependencies appropriately
- Aim for >80% coverage on critical paths

## Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run type-check` - Check TypeScript types
- `npm run lint` - Lint code
- `npm test` - Run tests

## When to Use This Skill
- Creating new React components
- Refactoring class components to functional
- Implementing TypeScript types
- Optimizing component performance
- Setting up routing and navigation
- Integrating with Chakra UI
- Form handling and validation
