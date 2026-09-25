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

import { ActionToastProvider } from "@/hooks/useActionToast";
import { type Locale, getBrowserLocale, getLocaleDirection } from "@/i18n/config";
import { GPUProvider } from "@/lib/gpu";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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

// Message loading cache - using AbstractIntlMessages type for nested messages
type Messages = Record<string, unknown>;
const messageCache = new Map<Locale, Messages>();

async function loadMessages(locale: Locale): Promise<Messages> {
  const cached = messageCache.get(locale);
  if (cached) return cached;

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

interface ProvidersProps {
  children: React.ReactNode;
  initialLocale: Locale;
  initialMessages: Messages;
}

export function Providers({ children, initialLocale, initialMessages }: ProvidersProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<Messages>(initialMessages);

  // Get or create QueryClient (singleton pattern for browser)
  const queryClient = useMemo(() => getQueryClient(), []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getLocaleDirection(locale);
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    // Server messages make the first render usable before hydration. Only load
    // another catalog when a browser-only preference differs from the cookie.
    const initLocale = async (): Promise<void> => {
      const browserLocale = getBrowserLocale();
      if (browserLocale === initialLocale) return;
      const msgs = await loadMessages(browserLocale);
      if (!cancelled) {
        setLocale(browserLocale);
        setMessages(msgs);
      }
    };
    void initLocale();
    return () => {
      cancelled = true;
    };
  }, [initialLocale]);

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

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleContext.Provider value={localeContextValue}>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <GPUProvider>
              <ActionToastProvider>{children}</ActionToastProvider>
            </GPUProvider>
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
