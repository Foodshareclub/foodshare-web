# Design Document: Codebase Improvement Initiative

## Overview

This design document outlines the technical approach for improving the FoodShare Next.js application codebase. The improvements span type safety, testing, state management, error handling, performance optimization, and code organization.

## Architecture

### Current State
- Mixed state management: Redux Toolkit + Zustand + React Query
- TypeScript with `ignoreBuildErrors: true`
- Limited test coverage (1 test file)
- Inconsistent error handling

### Target State
- Unified state management: Redux (UI) + React Query (server)
- TypeScript strict mode enabled
- 70%+ test coverage with property-based tests
- Standardized error handling with retry logic

## Components and Interfaces

### Type System
```typescript
// src/types/database.types.ts
export type Database = {
  public: {
    Tables: {
      posts: {
        Row: PostRow;
        Insert: PostInsert;
        Update: PostUpdate;
      };
    };
  };
};

// src/types/postgis.types.ts
export interface Coordinates {
  lat: number;
  lng: number;
}
```

### API Layer
```typescript
// src/lib/api/client.ts
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
}
```

### Error Handler
```typescript
// src/lib/api/errorHandler.ts
export class ApiErrorHandler {
  handle(error: unknown, context: ErrorContext): ApiError;
  shouldRetry(error: ApiError): boolean;
  getRetryDelay(attempt: number): number;
}
```

## Data Models

### Product
```typescript
interface Product {
  id: number;
  postName: string;
  postType: ProductType;
  location: Coordinates | null;
  images: string[];
  isActive: boolean;
  profileId: string;
  createdAt: Date;
}
```

### Error
```typescript
type ErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'SERVER_ERROR';
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Distance Calculation Symmetry
*For any* two coordinate pairs (A, B), the distance from A to B SHALL equal the distance from B to A.
**Validates: Requirements 2.4**

### Property 2: Distance Non-Negativity
*For any* two coordinate pairs, the calculated distance SHALL be >= 0.
**Validates: Requirements 2.4**

### Property 3: API Error Message Safety
*For any* API error displayed to users, the message SHALL NOT contain stack traces or raw error codes.
**Validates: Requirements 4.1**

### Property 4: Error Boundary Recovery
*For any* component that throws during render, an error boundary SHALL catch it and render fallback UI.
**Validates: Requirements 4.2**

### Property 5: Retry Exponential Backoff
*For any* retry sequence, delay(N+1) SHALL be greater than delay(N).
**Validates: Requirements 4.3**

### Property 6: Error Context Completeness
*For any* logged error, the entry SHALL contain timestamp, operation, and requestId.
**Validates: Requirements 4.4**

### Property 7: Virtual Scrolling Efficiency
*For any* list with >50 items, rendered DOM nodes SHALL be less than total items.
**Validates: Requirements 5.5**

### Property 8: API Error Structure
*For any* API error, it SHALL contain a valid ErrorCode.
**Validates: Requirements 7.3**

### Property 9: Interactive Element Accessibility
*For any* interactive element, it SHALL have an accessible name.
**Validates: Requirements 8.1**

### Property 10: Modal Focus Trap
*For any* open modal, Tab SHALL cycle only within modal elements.
**Validates: Requirements 8.2**

### Property 11: Keyboard Navigation
*For any* clickable element, it SHALL be keyboard accessible.
**Validates: Requirements 8.4**

### Property 12: Marker Clustering
*For any* 100+ markers, visible groups SHALL be less than total count.
**Validates: Requirements 9.1**

### Property 13: Viewport Marker Loading
*For any* viewport, loaded markers SHALL be within bounds.
**Validates: Requirements 9.3**

## Error Handling

| Category | Retryable | User Message |
|----------|-----------|--------------|
| Network | Yes (3x) | "Connection issue" |
| Auth | No | "Please sign in" |
| Validation | No | Field-specific |
| Server | Yes (1x) | "Something went wrong" |

## Testing Strategy

### Framework
- **Vitest** for test runner
- **React Testing Library** for components
- **fast-check** for property-based testing

### Coverage Target
- Minimum 70% code coverage
- 100 iterations per property test

### Test Organization
```
src/
├── api/__tests__/
│   ├── productAPI.test.ts
│   └── productAPI.property.test.ts
├── components/__tests__/
│   └── ProductCard.test.tsx
└── utils/__tests__/
    └── distance.property.test.ts
```
