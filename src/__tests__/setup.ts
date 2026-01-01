/**
 * Jest Test Setup
 * Global configuration for all tests
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for Next.js compatibility
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Polyfill fetch globals for MSW (Node.js 18+ has these, but jsdom may not expose them)
if (typeof global.Request === 'undefined') {
  // @ts-expect-error - Polyfill for older Node versions
  global.Request = class Request {
    constructor(public url: string, public init?: RequestInit) {}
  };
}

if (typeof global.Response === 'undefined') {
  // @ts-expect-error - Polyfill for older Node versions
  global.Response = class Response {
    constructor(public body?: BodyInit | null, public init?: ResponseInit) {}
    json() { return Promise.resolve({}); }
    text() { return Promise.resolve(''); }
  };
}

// Polyfill BroadcastChannel for MSW 2.x
if (typeof global.BroadcastChannel === 'undefined') {
  // @ts-expect-error - Polyfill for Node.js
  global.BroadcastChannel = class BroadcastChannel {
    name: string;
    constructor(name: string) { this.name = name; }
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    onmessage = null;
    onmessageerror = null;
  };
}

// =============================================================================
// MSW Setup (conditional - only if tests need it)
// =============================================================================

// MSW is set up lazily in individual test files that need it
// Use: import { setupMSW } from '@/lib/testing'; setupMSW();

// Mock next/cache (Server Actions use this)
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: jest.fn((fn) => fn),
  unstable_noStore: jest.fn(),
}));

// Mock the invalidateTag helper from cache-keys
jest.mock('@/lib/data/cache-keys', () => ({
  ...jest.requireActual('@/lib/data/cache-keys'),
  invalidateTag: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn().mockReturnValue([]);
} as unknown as typeof IntersectionObserver;

// Suppress console errors during tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Filter out known React warnings during tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: An update to'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
