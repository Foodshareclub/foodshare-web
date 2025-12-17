"use client";

/**
 * App Providers
 *
 * Provides:
 * - QueryClientProvider for React Query (used for client-side caching only)
 * - NextIntlClientProvider for i18n
 * - ThemeProvider for dark/light mode
 * - LocaleContext for dynamic locale switching
 * - ActionToastProvider for server action feedback toasts
 *
 * NOTE: Primary data fetching uses Server Components + lib/data functions.
 * React Query is only used for client-side state management where needed.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { getBrowserLocale, type Locale } from "@/i18n/config";
import { ActionToastProvider } from "@/hooks/useActionToast";

/**
 * Create QueryClient with optimized defaults
 * - staleTime: 1 minute (data considered fresh)
 * - refetchOnWindowFocus: disabled (server data is authoritative)
 * - retry: 1 attempt (fail fast for better UX)
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

// Singleton for browser, new instance for each SSR request
let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: always create a new QueryClient
    return makeQueryClient();
  }
  // Browser: reuse singleton
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

// Loading component - renders before ThemeProvider, so we use inline styles
// with CSS custom properties that respect the user's system preference
const LoadingSpinner = () => (
  <div
    className="min-h-screen flex flex-col justify-center"
    style={{
      // Use CSS variables from globals.css which respect prefers-color-scheme
      backgroundColor: "hsl(var(--background))",
    }}
  >
    <div
      className="m-auto w-12 h-12 rounded-full animate-spin"
      style={{
        borderWidth: "4px",
        borderStyle: "solid",
        borderColor: "hsl(var(--primary))",
        borderTopColor: "transparent",
      }}
    />
  </div>
);

// Message loading cache - using AbstractIntlMessages type for nested messages
type Messages = Record<string, unknown>;
const messageCache = new Map<Locale, Messages>();

async function loadMessages(locale: Locale): Promise<Messages> {
  if (messageCache.has(locale)) {
    return messageCache.get(locale)!;
  }

  try {
    // Dynamic import for locale messages
    const messages = (await import(`../../messages/${locale}.json`)).default;
    messageCache.set(locale, messages);
    return messages;
  } catch (error) {
    console.error(`Failed to load messages for locale "${locale}":`, error);
    // Fallback to English
    if (locale !== "en") {
      return loadMessages("en");
    }
    return {};
  }
}

// Context for locale switching
interface LocaleContextType {
  changeLocale: (newLocale: Locale) => Promise<void>;
  locale: Locale;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

/**
 * Client detection using useSyncExternalStore
 * This avoids the cascading render issue with setState in useEffect
 */
function subscribeToNothing(): () => void {
  return () => {};
}

function getClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

function useIsClient(): boolean {
  return useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);
}

interface ProvidersProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function Providers({ children, initialLocale = "en" }: ProvidersProps) {
  const isClient = useIsClient();
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<Messages | null>(null);
  const [isLocaleLoaded, setIsLocaleLoaded] = useState(false);

  // Get or create QueryClient (singleton pattern for browser)
  const queryClient = useMemo(() => getQueryClient(), []);

  useEffect(() => {
    // Load browser locale preferences on client
    // Using async IIFE to batch state updates after async operation
    const initLocale = async (): Promise<void> => {
      const browserLocale = getBrowserLocale();
      const msgs = await loadMessages(browserLocale);
      // Batch updates together after async operation completes
      setLocale(browserLocale);
      setMessages(msgs);
      setIsLocaleLoaded(true);
    };
    initLocale();
  }, []);

  const changeLocale = useCallback(async (newLocale: Locale) => {
    // Load messages for new locale
    const newMessages = await loadMessages(newLocale);

    // Persist preference in cookie (for server-side reading) and localStorage
    document.cookie = `locale=${newLocale};path=/;max-age=31536000;samesite=lax`;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("locale", newLocale);
    }

    // Update state to re-render with new locale
    setLocale(newLocale);
    setMessages(newMessages);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const localeContextValue = useMemo(() => ({ changeLocale, locale }), [changeLocale, locale]);

  // Show loading until client-side rendering and locale messages are ready
  if (!isClient || !isLocaleLoaded || !messages) {
    return <LoadingSpinner />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleContext.Provider value={localeContextValue}>
        <NextIntlClientProvider key={locale} locale={locale} messages={messages} timeZone="UTC">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ActionToastProvider>{children}</ActionToastProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </LocaleContext.Provider>
    </QueryClientProvider>
  );
}

/**
 * Hook to change locale dynamically
 */
export function useChangeLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useChangeLocale must be used within Providers");
  }

  return context;
}
