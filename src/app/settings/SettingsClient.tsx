'use client';

/**
 * Settings Client Component
 * Handles interactive settings cards with animations
 */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useGridSize } from '@/hooks';
import { motion } from 'framer-motion';

interface SettingsCard {
  img: string;
  settingTitle: string;
  description: string;
  route: string;
}

const settingsInfoArray: SettingsCard[] = [
  {
    img: '/images/settings/personal_info.png',
    settingTitle: 'Personal info',
    description: 'Provide personal details and how we can reach you',
    route: '/settings/personal-info',
  },
  {
    img: '/images/settings/user_shield.png',
    settingTitle: 'Login & security',
    description: 'Update your password and secure your account',
    route: '/settings/login-and-security',
  },
];

export function SettingsClient() {
  const gridSize = useGridSize();

  const getGridClasses = () => {
    switch (gridSize) {
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
      case 2:
        return 'grid-cols-1 sm:grid-cols-2';
      default:
        return 'grid-cols-1';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-7 xl:px-20 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Account Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your account preferences and security settings
            </p>
          </motion.div>
        </div>
      </div>

      {/* Settings Cards Grid */}
      <div className={`px-7 xl:px-20 py-10 grid gap-6 ${getGridClasses()}`}>
        {settingsInfoArray.map((card, index) => (
          <motion.div
            key={card.route}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Link href={card.route}>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-emerald-500 dark:hover:border-emerald-400">
                <div className="mb-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <Image
                      src={card.img}
                      alt={card.settingTitle}
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {card.settingTitle}
                </h3>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {card.description}
                </p>

                {/* Arrow indicator */}
                <div className="mt-4 flex items-center text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                  <span>Manage</span>
                  <svg
                    className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default SettingsClient;
