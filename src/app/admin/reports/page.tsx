'use client'

import React from 'react'
import { useTranslations } from 'next-intl'

/**
 * AdminReportsPage - Reports and analytics page
 * TODO: Implement reports and analytics features
 */
export default function AdminReportsPage() {
  const t = useTranslations()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">
        {t('reports_analytics')}
      </h1>
      <p className="text-gray-600 mt-2">
        {t('coming_soon_view_reports_and_analytics')}
      </p>
    </div>
  )
}
