'use client'

import React from 'react'
import { useTranslations } from 'next-intl'

/**
 * AdminUsersPage - User management page
 * TODO: Implement user management features
 */
export default function AdminUsersPage() {
  const t = useTranslations()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">
        {t('user_management')}
      </h1>
      <p className="text-gray-600 mt-2">
        {t('coming_soon_manage_users_and_permissions')}
      </p>
    </div>
  )
}
