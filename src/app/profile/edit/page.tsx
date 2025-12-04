'use client'

/**
 * Profile Edit Page - Next.js App Router version
 * Edit personal information including name, email, phone, and address
 */

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentProfile } from '@/hooks/queries'
import { AddressBlock, EmailBlock, NameBlock, PhoneNumberBlock } from '@/components/profile'
import { FaChevronRight } from 'react-icons/fa'
import type { ProfileType } from '@/api/profileAPI'

export default function ProfileEditPage() {
  const router = useRouter()

  // Auth state from Zustand
  const { isAuthenticated, user } = useAuth()
  const userId = user?.id

  // Profile state from React Query
  const { profile: currentProfile, address, isLoading, updateProfile: updateProfileMutation } = useCurrentProfile(userId)

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

    const updates: Partial<ProfileType> = {
      ...currentProfile,
      first_name: firstName,
      second_name: secondName,
      phone: phone,
      updated_at: new Date(),
    }

    await updateProfileMutation(updates)
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-3xl pt-24 pb-12 px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8">
          <button
            onClick={() => router.push('/profile')}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Account settings
          </button>
          <FaChevronRight className="text-gray-800 dark:text-gray-400 text-xs" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Personal info
          </span>
        </nav>

        {/* Loading State */}
        {isLoading || !address || !currentProfile ? (
          <>
            <div className="mt-8">
              <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                Personal info
              </h1>
              <div className="h-[50px] bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg mb-5" />
            </div>
            <div className="h-[50px] bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg mb-5" />
            <div className="h-[50px] bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg mb-5" />
            <div className="h-[50px] bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg mb-5" />
          </>
        ) : (
          <>
            <div className="mt-8">
              <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">
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
