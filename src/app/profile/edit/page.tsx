'use client'

/**
 * Profile Edit Page - Next.js App Router version
 * Edit personal information including name, email, phone, and address
 * 
 * Note: This page should ideally be a Server Component that fetches data
 * and passes it to a Client Component. For now, using useAuth for auth state.
 */

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AddressBlock, EmailBlock, NameBlock, PhoneNumberBlock } from '@/components/profile'
import { FaChevronRight } from 'react-icons/fa'

// Simplified profile type for this component
interface ProfileData {
  id: string;
  first_name?: string | null;
  second_name?: string | null;
  phone?: string | null;
}

interface AddressData {
  profile_id: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  county: string;
  state_province: string;
  postal_code: string;
  country: number;
}

interface ProfileEditPageProps {
  /** Profile data passed from server */
  initialProfile?: ProfileData | null;
  /** Address data passed from server */
  initialAddress?: AddressData | null;
}

export default function ProfileEditPage({ initialProfile, initialAddress }: ProfileEditPageProps) {
  const router = useRouter()

  // Auth state
  const { isAuthenticated, user } = useAuth()

  // Use server-provided data or empty defaults
  const currentProfile = initialProfile
  const address = initialAddress
  const isLoading = !initialProfile && isAuthenticated

  // Local state for form fields
  const [firstName, setFirstName] = useState('')
  const [secondName, setSecondName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // State for controlling which block is being edited
  const [a, setA] = useState(false)
  const [b, setB] = useState(false)
  const [c, setC] = useState(false)
  const [d, setD] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?from=/profile/edit')
    }
  }, [isAuthenticated, router])

  // React Query handles fetching automatically via useCurrentProfile

  // Update local state when profile loads
  useEffect(() => {
    if (currentProfile) {
      setFirstName(currentProfile.first_name || '')
      setSecondName(currentProfile.second_name || '')
      setPhone(currentProfile.phone || '')
    }
    if (user?.email) {
      setEmail(user.email)
    }
  }, [currentProfile, user])

  // Handle profile save
  const onSaveHandler = async () => {
    if (!currentProfile) return

    // TODO: Use updateProfile Server Action
    // For now, just refresh the page
    router.refresh()
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <div className="container mx-auto max-w-3xl pt-24 pb-12 px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8">
          <button
            onClick={() => router.push('/profile')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Account settings
          </button>
          <FaChevronRight className="text-muted-foreground text-xs" />
          <span className="text-sm font-medium text-foreground">
            Personal info
          </span>
        </nav>

        {/* Loading State */}
        {isLoading || !address || !currentProfile ? (
          <>
            <div className="mt-8">
              <h1 className="text-4xl font-bold mb-4 text-foreground">
                Personal info
              </h1>
              <div className="h-[50px] bg-muted animate-pulse rounded-lg mb-5" />
            </div>
            <div className="h-[50px] bg-muted animate-pulse rounded-lg mb-5" />
            <div className="h-[50px] bg-muted animate-pulse rounded-lg mb-5" />
            <div className="h-[50px] bg-muted animate-pulse rounded-lg mb-5" />
          </>
        ) : (
          <>
            <div className="mt-8">
              <h1 className="text-4xl font-bold mb-6 text-foreground">
                Personal info
              </h1>

              {/* Name Block */}
              <NameBlock
                firstName={firstName}
                secondName={secondName}
                setFirstName={setFirstName}
                setSecondName={setSecondName}
                onSaveHandler={onSaveHandler}
                a={a}
                b={b}
                c={c}
                d={d}
                setB={setB}
                setC={setC}
                setD={setD}
              />
            </div>

            {/* Email Block */}
            <div className="mt-5">
              <EmailBlock
                setC={setC}
                setD={setD}
                a={a}
                b={b}
                c={c}
                d={d}
                email={email}
                onSaveHandler={onSaveHandler}
                setEmail={setEmail}
                setA={setA}
              />
            </div>

            {/* Phone Block */}
            <div className="mt-5">
              <PhoneNumberBlock
                a={a}
                b={b}
                c={c}
                d={d}
                phone={phone}
                setPhone={setPhone}
                onSaveHandler={onSaveHandler}
                setA={setA}
                setB={setB}
                setD={setD}
              />
            </div>

            {/* Address Block */}
            <div className="mt-5">
              <AddressBlock
                address={address}
                a={a}
                b={b}
                c={c}
                d={d}
                setA={setA}
                setB={setB}
                setC={setC}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
