import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MaintenanceStatus } from '@/components/maintenance/MaintenanceStatus';
import { noIndexMetadata } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Maintenance | FoodShare',
  description: 'FoodShare is currently undergoing maintenance',
  ...noIndexMetadata,
};

export default async function MaintenancePage(): Promise<React.ReactElement> {
  const t = await getTranslations('Maintenance');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Animated icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping" />
          <div className="relative flex items-center justify-center w-24 h-24 bg-amber-500 rounded-full">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('title', { fallback: 'Under Maintenance' })}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t('description', {
              fallback:
                'We are performing scheduled maintenance to improve your experience. Please check back soon.',
            })}
          </p>
        </div>

        <MaintenanceStatus />

        <div className="pt-4 text-sm text-gray-500 dark:text-gray-400">
          <p>
            {t('contact', {
              fallback: 'Need help? Contact us at support@foodshare.club',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
