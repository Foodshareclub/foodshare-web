'use client';

/**
 * Settings Client Component
 * Premium settings hub with glass morphism and modern design
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FaUser,
  FaShieldAlt,
  FaBell,
  FaGlobe,
  FaPalette,
  FaQuestionCircle,
  FaChevronRight,
  FaHeart,
  FaLeaf,
  FaCog,
} from 'react-icons/fa';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface SettingsCard {
  icon: React.ReactNode;
  gradient: string;
  iconColor: string;
  title: string;
  description: string;
  route: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline';
}

const accountCards: SettingsCard[] = [
  {
    icon: <FaUser className="w-5 h-5" />,
    gradient: 'from-blue-500 to-cyan-500',
    iconColor: 'text-white',
    title: 'Personal info',
    description: 'Update your name, phone number, and address',
    route: '/settings/personal-info',
  },
  {
    icon: <FaShieldAlt className="w-5 h-5" />,
    gradient: 'from-emerald-500 to-teal-500',
    iconColor: 'text-white',
    title: 'Login & security',
    description: 'Manage your password and account security',
    route: '/settings/login-and-security',
  },
];

const preferenceCards: SettingsCard[] = [
  {
    icon: <FaBell className="w-5 h-5" />,
    gradient: 'from-amber-500 to-orange-500',
    iconColor: 'text-white',
    title: 'Notifications',
    description: 'Choose what updates you want to receive',
    route: '#',
    badge: 'Coming soon',
    badgeVariant: 'secondary',
  },
  {
    icon: <FaGlobe className="w-5 h-5" />,
    gradient: 'from-purple-500 to-violet-500',
    iconColor: 'text-white',
    title: 'Language & region',
    description: 'Set your preferred language and timezone',
    route: '#',
    badge: 'Coming soon',
    badgeVariant: 'secondary',
  },
  {
    icon: <FaPalette className="w-5 h-5" />,
    gradient: 'from-pink-500 to-rose-500',
    iconColor: 'text-white',
    title: 'Appearance',
    description: 'Customize how FoodShare looks for you',
    route: '#',
    badge: 'Coming soon',
    badgeVariant: 'secondary',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

function SettingsCardItem({
  card,
  disabled = false,
}: {
  card: SettingsCard;
  disabled?: boolean;
}) {
  const content = (
    <div
      className={cn(
        'group relative flex items-start gap-4 p-5 rounded-2xl border bg-card/80 backdrop-blur-sm',
        'transition-all duration-300 ease-out',
        disabled
          ? 'opacity-50 cursor-not-allowed border-border'
          : 'border-border/50 hover:border-transparent hover:bg-card hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-0.5'
      )}
    >
      {/* Gradient border on hover */}
      {!disabled && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />
      )}

      {/* Icon with gradient background */}
      <div
        className={cn(
          'relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
          'bg-gradient-to-br shadow-lg',
          'transition-transform duration-300',
          !disabled && 'group-hover:scale-110 group-hover:rotate-3',
          card.gradient
        )}
      >
        <span className={card.iconColor}>{card.icon}</span>
        {/* Shine effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold text-foreground truncate">
            {card.title}
          </h3>
          {card.badge && (
            <Badge variant={card.badgeVariant} className="text-[10px] px-2 py-0">
              {card.badge}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {card.description}
        </p>
      </div>

      {/* Arrow */}
      {!disabled && (
        <div className="flex-shrink-0 self-center">
          <FaChevronRight className="w-4 h-4 text-muted-foreground/50 transition-all duration-300 group-hover:text-emerald-500 group-hover:translate-x-1" />
        </div>
      )}
    </div>
  );

  if (disabled) {
    return <motion.div variants={itemVariants}>{content}</motion.div>;
  }

  return (
    <motion.div variants={itemVariants}>
      <Link href={card.route}>{content}</Link>
    </motion.div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div variants={itemVariants} className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}

export function SettingsClient() {
  return (
    <div className="bg-gradient-to-b from-background via-muted/30 to-background pb-10">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Hero Header */}
      <header className="relative border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 lg:px-8 py-10 lg:py-14">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <FaCog className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
                  Settings
                </h1>
              </div>
            </div>
            <p className="text-muted-foreground text-lg max-w-xl">
              Manage your account, security preferences, and personalize your
              FoodShare experience
            </p>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative container mx-auto px-6 lg:px-8 py-10">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Account Section */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <SectionHeader
              icon={<FaUser className="w-4 h-4 text-muted-foreground" />}
              title="Account"
              description="Manage your personal information and security"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {accountCards.map((card) => (
                <SettingsCardItem key={card.route} card={card} />
              ))}
            </div>
          </motion.section>

          <Separator className="bg-border/50" />

          {/* Preferences Section */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <SectionHeader
              icon={<FaPalette className="w-4 h-4 text-muted-foreground" />}
              title="Preferences"
              description="Customize your FoodShare experience"
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {preferenceCards.map((card) => (
                <SettingsCardItem key={card.title} card={card} disabled />
              ))}
            </div>
          </motion.section>

          <Separator className="bg-border/50" />

          {/* Quick Links Section */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <SectionHeader
              icon={<FaHeart className="w-4 h-4 text-muted-foreground" />}
              title="Support & Community"
              description="Get help and connect with the FoodShare community"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Help Card */}
              <motion.div variants={itemVariants}>
                <Link
                  href="/help"
                  className="group flex items-center gap-4 p-5 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm hover:border-transparent hover:bg-card hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <FaQuestionCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-foreground">
                      Help Center
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      FAQs, guides, and support
                    </p>
                  </div>
                  <FaChevronRight className="w-4 h-4 text-muted-foreground/50 transition-all duration-300 group-hover:text-emerald-500 group-hover:translate-x-1" />
                </Link>
              </motion.div>

              {/* About FoodShare Card */}
              <motion.div variants={itemVariants}>
                <Link
                  href="/"
                  className="group flex items-center gap-4 p-5 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm hover:border-transparent hover:bg-card hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 transition-transform duration-300 group-hover:scale-110">
                    <FaLeaf className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-foreground">
                      About FoodShare
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Our mission to reduce food waste
                    </p>
                  </div>
                  <FaChevronRight className="w-4 h-4 text-muted-foreground/50 transition-all duration-300 group-hover:text-emerald-500 group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </div>
          </motion.section>

          {/* Footer Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="pt-6 text-center"
          >
            <p className="text-xs text-muted-foreground">
              FoodShare v1.0 · Made with{' '}
              <FaHeart className="inline w-3 h-3 text-rose-500 mx-0.5" /> for the
              community
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default SettingsClient;
