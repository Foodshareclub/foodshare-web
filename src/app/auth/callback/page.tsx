'use client'

/**
 * OAuth Callback Handler - Next.js App Router version
 * Handles OAuth redirects and token exchange
 */

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'

export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in callback query params
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        const errorCode = searchParams.get('error_code')

        // Also check hash fragment (Supabase sends tokens there)
        let hashParams: URLSearchParams | null = null
        if (typeof window !== 'undefined' && window.location.hash) {
          hashParams = new URLSearchParams(window.location.hash.substring(1))
          const hashError = hashParams.get('error')
          const hashErrorDesc = hashParams.get('error_description')

          if (hashError && !errorParam) {
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname)

            const isRecoverable = hashError === 'access_denied' || hashError === 'user_cancelled_authorize'
            if (isRecoverable) {
              const returnUrl = sessionStorage.getItem('auth_return_url') || '/'
              sessionStorage.removeItem('auth_return_url')
              router.replace(returnUrl)
              return
            }

            setError(hashErrorDesc || hashError)
            setTimeout(() => router.replace('/auth/login'), 3000)
            return
          }
        }

        if (errorParam) {
          // Clean URL immediately
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, window.location.pathname)
          }

          // Recoverable errors
          const isRecoverable =
            errorCode === 'bad_oauth_state' ||
            errorParam === 'access_denied' ||
            errorParam === 'user_cancelled_authorize'

          if (isRecoverable) {
            const returnUrl = typeof window !== 'undefined'
              ? sessionStorage.getItem('auth_return_url') || '/'
              : '/'
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('auth_return_url')
            }
            router.replace(returnUrl)
            return
          }

          setError(errorDescription || errorParam)
          setTimeout(() => router.replace('/auth/login'), 3000)
          return
        }

        // Let Supabase handle the session from URL
        const { data, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          setError(sessionError.message)
          setTimeout(() => router.replace('/auth/login'), 3000)
          return
        }

        if (data.session) {
          // Get return URL
          const returnUrl = typeof window !== 'undefined'
            ? sessionStorage.getItem('auth_return_url') || '/'
            : '/'
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('auth_return_url')
            window.history.replaceState({}, document.title, window.location.pathname)
          }

          router.replace(returnUrl)
        } else {
          setError('Authentication failed. Please try again.')
          setTimeout(() => router.replace('/auth/login'), 3000)
        }
      } catch (e) {
        console.error('Callback error:', e)
        setError('An unexpected error occurred')
        setTimeout(() => router.replace('/auth/login'), 3000)
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="container mx-auto max-w-[480px] px-4">
        <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 text-center">
          {error ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Redirecting to login...
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex justify-center">
                <AiOutlineLoading3Quarters className="w-12 h-12 text-emerald-500 animate-spin" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xl font-semibold text-gray-900">
                  Completing sign in...
                </p>
                <p className="text-sm text-gray-600">
                  Please wait while we verify your account
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
