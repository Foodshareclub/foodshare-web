'use client'

/**
 * App Providers
 * 
 * Provides:
 * - NextIntlClientProvider for i18n
 * - ThemeProvider for dark/light mode
 * 
 * Note: TanStack Query has been removed. Data fetching is done via:
 * - Server Components with lib/data/* functions
 * - Server Actions for mutations
 * - Supabase client subscriptions for realtime (in individual components)
 */

import { useEffect, useState } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { ThemeProvider } from 'next-themes'
import { getBrowserLocale, type Locale } from '@/i18n/config'

// Loading component - renders before ThemeProvider, so we use inline styles
// with CSS custom properties that respect the user's system preference
const LoadingSpinner = () => (
  <div 
    className="min-h-screen flex flex-col justify-center"
    style={{
      // Use CSS variables from globals.css which respect prefers-color-scheme
      backgroundColor: 'hsl(var(--background))',
    }}
  >
    <div 
      className="m-auto w-12 h-12 rounded-full animate-spin"
      style={{
        borderWidth: '4px',
        borderStyle: 'solid',
        borderColor: 'hsl(var(--primary))',
        borderTopColor: 'transparent',
      }}
    />
  </div>
)

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
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </NextIntlClientProvider>
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
