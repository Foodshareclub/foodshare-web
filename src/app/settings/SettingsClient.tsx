"use client";

/**
 * Settings Client Component
 * Premium settings hub with bento-grid layout, user profile summary,
 * and modern micro-interactions. Inspired by Linear, Raycast, and Arc.
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, Shield, HelpCircle, Settings, Sparkles, LogOut, Menu } from "lucide-react";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import {
  SettingsSidebar,
  UserProfileHeader,
  BentoCard,
  ProfileCompletionCard,
  ActivitySummaryCard,
  KeyboardShortcutsHint,
  preferenceItems,
} from "./components";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";

export function SettingsClient() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-blue-500/8 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 right-1/4 w-56 h-56 bg-purple-500/8 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Settings className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block">
                  Manage your account and preferences
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </motion.header>

        {/* Main content */}
        <div className="flex gap-6 lg:gap-8">
          {/* Desktop Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="hidden lg:block w-72 flex-shrink-0"
          >
            <Glass variant="subtle" className="sticky top-24 overflow-hidden">
              <SettingsSidebar currentPath={pathname} />
            </Glass>
          </motion.aside>

          {/* Mobile Sidebar */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-background border-r border-border z-50 lg:hidden"
                >
                  <SettingsSidebar
                    currentPath={pathname}
                    onClose={() => setMobileMenuOpen(false)}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Main content area */}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex-1 min-w-0 space-y-6"
          >
            {/* User Profile Header */}
            <UserProfileHeader />

            {/* Bento Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Large cards */}
              <div className="sm:col-span-2 lg:col-span-2">
                <BentoCard
                  icon={User}
                  title="Personal Information"
                  description="Update your name, photo, phone number, and address"
                  href="/settings/personal-info"
                  gradient="from-blue-500 to-cyan-500"
                  size="large"
                />
              </div>

              {/* Profile completion */}
              <ProfileCompletionCard />

              {/* Security card */}
              <BentoCard
                icon={Shield}
                title="Security"
                description="Password & 2FA"
                href="/settings/login-and-security"
                gradient="from-emerald-500 to-teal-500"
              />

              {/* Activity summary */}
              <ActivitySummaryCard />

              {/* Help card */}
              <BentoCard
                icon={HelpCircle}
                title="Help Center"
                description="FAQs & support"
                href="/help"
                gradient="from-slate-500 to-gray-600"
              />
            </div>

            {/* Coming soon + Keyboard shortcuts row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Glass variant="subtle" className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Coming Soon</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {preferenceItems
                    .filter((item) => item.disabled)
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.href}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 text-muted-foreground text-xs"
                        >
                          <Icon className="w-3 h-3" />
                          <span>{item.label}</span>
                        </div>
                      );
                    })}
                </div>
              </Glass>

              <KeyboardShortcutsHint />
            </div>

            {/* Danger zone */}
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <LogOut className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium">Account Actions</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Need to take a break? You can log out or manage your account.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </Button>
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}

export default SettingsClient;
