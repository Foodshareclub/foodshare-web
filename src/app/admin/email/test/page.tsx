'use client'

import React from 'react'
import { useTranslations } from 'next-intl'

/**
 * AdminEmailTest - Email provider testing page
 * TODO: Implement email provider testing features
 */
export default function AdminEmailTest() {
  const t = useTranslations()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">
        {t('templates')}
      </h1>
      <p className="text-gray-600 mt-2">
        {t('setup_guides_and_references')}
      </p>
    </div>
  )
}
