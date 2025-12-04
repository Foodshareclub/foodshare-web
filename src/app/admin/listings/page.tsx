'use client'

import React from 'react'
import { useTranslations } from 'next-intl'

/**
 * AdminListings - Listings management page
 * TODO: Implement enhanced listings management with bulk operations
 */
export default function AdminListings() {
  const t = useTranslations()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">
        {t('listings_management')}
      </h1>
      <p className="text-gray-600 mt-2">
        {t('review_approve_and_manage_all_listings')}
      </p>
    </div>
  )
}
