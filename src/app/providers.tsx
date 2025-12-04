'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { NextIntlClientProvider } from 'next-intl'
import { ThemeProvider } from 'next-themes'
import { getBrowserLocale, type Locale } from '@/i18n/config'

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex flex-col justify-center">
    <div className="m-auto w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
)

// Create QueryClient with optimized defaults
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Keep unused data in cache for 30 minutes
        gcTime: 30 * 60 * 1000,
        // Don't refetch on window focus by default
        refetchOnWindowFocus: false,
        // Retry failed requests once
        retry: 1,
        // Don't refetch on reconnect by default
        refetchOnReconnect: false,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  })
}

// Singleton for browser, new instance for server
let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: reuse existing client or create new one
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
  }
}

// Message loading cache
const messageCache = new Map<Locale, Record<string, string>>()

async function loadMessages(locale: Locale): Promise<Record<string, string>> {
  if (messageCache.has(locale)) {
    return messageCache.get(locale)!
  }

  try {
    const messages = (await import(`../../messages/${locale}.json`)).default
    messageCache.set(locale, messages)
    return messages
  } catch {
    // Fallback to English
    if (locale !== 'en') {
      return loadMessages('en')
    }
    return {}
  }
}

interface ProvidersProps {
  children: React.ReactNode
  initialLocale?: Locale
}

export function Providers({ children, initialLocale = 'en' }: ProvidersProps) {
  const [isClient, setIsClient] = useState(false)
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [messages, setMessages] = useState<Record<string, string> | null>(null)
  const queryClient = getQueryClient()

  useEffect(() => {
    setIsClient(true)
    // Detect and load browser locale
    const browserLocale = getBrowserLocale()
    setLocale(browserLocale)

    loadMessages(browserLocale).then(setMessages)
  }, [])

  // Show loading until both client-side rendering and messages are ready
  if (!isClient || !messages) {
    return <LoadingSpinner />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </NextIntlClientProvider>
      {/* React Query Devtools - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  )
}

/**
 * Hook to change locale dynamically
 */
export function useChangeLocale() {
  const [, setLocale] = useState<Locale>('en')
  const [, setMessages] = useState<Record<string, string> | null>(null)

  const changeLocale = async (newLocale: Locale) => {
    const messages = await loadMessages(newLocale)
    setLocale(newLocale)
    setMessages(messages)
    // Persist preference in cookie (for server-side reading) and localStorage
    document.cookie = `locale=${newLocale};path=/;max-age=31536000;samesite=lax`
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('locale', newLocale)
    }
    // Force page reload to apply new locale
    window.location.reload()
  }

  return { changeLocale }
}
