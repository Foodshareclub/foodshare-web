'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface NavItemProps {
  href: string
  label: string
  isActive: boolean
}

function NavItem({ href, label, isActive }: NavItemProps) {
  return (
    <Link href={href} className="no-underline w-full">
      <div
        className={`px-4 py-3 rounded-md transition-all duration-200 cursor-pointer ${isActive ? 'bg-green-500 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
      >
        <p className={isActive ? 'font-bold' : 'font-normal'}>{label}</p>
      </div>
    </Link>
  )
}

/**
 * AdminLayout - Layout wrapper for all admin pages
 * Features responsive sidebar navigation and admin header
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations()
  const pathname = usePathname()

  const navItems = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/listings', label: 'Listings' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/email', label: 'Email CRM' },
    { href: '/admin/email/monitor', label: '📊 Email Monitor' },
    { href: '/admin/email/test', label: '🧪 Test Providers' },
    { href: '/admin/ai-insights', label: '✨ AI Insights' },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-full md:w-[250px] bg-white border-r border-gray-200 hidden md:block fixed h-screen overflow-y-auto">
        <div className="flex flex-col gap-2 p-4">
          {/* Admin Header */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-green-600">
              {t('admin_panel')}
            </h1>
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {t('admin')}
            </span>
          </div>

          {/* Navigation Items */}
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              isActive={pathname === item.href}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-0 md:ml-[250px]">
        {/* Mobile Header */}
        <div className="block md:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold text-green-600">
              {t('admin_panel')}
            </h1>
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {t('admin')}
            </span>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  )
}
