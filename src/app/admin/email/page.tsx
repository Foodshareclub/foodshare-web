'use client'

import React from 'react'
import { useTranslations } from 'next-intl'

/**
 * AdminEmailCRM - Email CRM management page
 * TODO: Implement email CRM features
 */
export default function AdminEmailCRM() {
  const t = useTranslations()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">
        {t('email_management_crm')}
      </h1>
      <p className="text-gray-600 mt-2">
        {t('smart_routing_quota_monitoring_and_complete_email_control')}
      </p>
    </div>
  )
}
