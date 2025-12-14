"use client";

/**
 * App Providers
 *
 * Provides:
 * - NextIntlClientProvider for i18n
 * - ThemeProvider for dark/light mode
 * - LocaleContext for dynamic locale switching
 * - ActionToastProvider for server action feedback toasts
 *
 * Note: TanStack Query has been removed. Data fetching is done via:
 * - Server Components with lib/data/* functions
 * - Server Actions for mutations
 * - Supabase client subscriptions for realtime (in individual components)
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { getBrowserLocale, type Locale } from "@/i18n/config";
import { ActionToastProvider } from "@/hooks/useActionToast";

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

interface ProvidersProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function Providers({ children, initialLocale = "en" }: ProvidersProps) {
  const [isClient, setIsClient] = useState(false);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<Messages | null>(null);

  useEffect(() => {
    // This is intentional - we need to detect client-side hydration
    // and load browser-specific locale preferences
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
    // Detect and load browser locale (now checks saved preference first)
    const browserLocale = getBrowserLocale();

    setLocale(browserLocale);

    loadMessages(browserLocale).then(setMessages);
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

  // Show loading until both client-side rendering and messages are ready
  if (!isClient || !messages) {
    return <LoadingSpinner />;
  }

  return (
    <LocaleContext.Provider value={{ changeLocale, locale }}>
      <NextIntlClientProvider key={locale} locale={locale} messages={messages} timeZone="UTC">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ActionToastProvider>{children}</ActionToastProvider>
        </ThemeProvider>
      </NextIntlClientProvider>
    </LocaleContext.Provider>
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
