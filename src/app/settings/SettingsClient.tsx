"use client";

/**
 * Settings Client Component
 * Modern settings hub with sidebar navigation and glass morphism
 * Inspired by Linear, Notion, and modern SaaS apps
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Shield,
  Bell,
  Globe,
  Palette,
  HelpCircle,
  ChevronRight,
  Heart,
  Leaf,
  Settings,
  Sparkles,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Glass } from "@/components/ui/glass";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  badge?: string;
  disabled?: boolean;
  gradient: string;
}

const accountItems: NavItem[] = [
  {
    icon: User,
    label: "Personal info",
    description: "Name, phone, address",
    href: "/settings/personal-info",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Shield,
    label: "Login & security",
    description: "Password, 2FA",
    href: "/settings/login-and-security",
    gradient: "from-emerald-500 to-teal-500",
  },
];

const preferenceItems: NavItem[] = [
  {
    icon: Bell,
    label: "Notifications",
    description: "Email, push alerts",
    href: "/settings/notifications",
    badge: "Soon",
    disabled: true,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Globe,
    label: "Language & region",
    description: "Locale settings",
    href: "/settings/language",
    badge: "Soon",
    disabled: true,
    gradient: "from-purple-500 to-violet-500",
  },
  {
    icon: Palette,
    label: "Appearance",
    description: "Theme, display",
    href: "/settings/appearance",
    badge: "Soon",
    disabled: true,
    gradient: "from-pink-500 to-rose-500",
  },
];

const supportItems: NavItem[] = [
  {
    icon: HelpCircle,
    label: "Help Center",
    description: "FAQs & guides",
    href: "/help",
    gradient: "from-slate-500 to-gray-600",
  },
  {
    icon: Leaf,
    label: "About FoodShare",
    description: "Our mission",
    href: "/",
    gradient: "from-emerald-500 to-green-600",
  },
];

function NavSection({
  title,
  items,
  currentPath,
}: {
  title: string;
  items: NavItem[];
  currentPath: string;
}) {
  return (
    <div className="space-y-1">
      <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.href;

        if (item.disabled) {
          return (
            <div
              key={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground/50 cursor-not-allowed"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br opacity-40",
                  item.gradient
                )}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-xs truncate opacity-60">{item.description}</p>
              </div>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/80"
            )}
          >
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br shadow-sm transition-transform duration-200",
                "group-hover:scale-105",
                item.gradient
              )}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">{item.label}</span>
              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
            </div>
            <ChevronRight
              className={cn(
                "w-4 h-4 text-muted-foreground/50 transition-all duration-200",
                "group-hover:text-foreground group-hover:translate-x-0.5",
                isActive && "text-primary"
              )}
            />
          </Link>
        );
      })}
    </div>
  );
}

function SettingsSidebar({ currentPath, onClose }: { currentPath: string; onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Mobile close button */}
      {onClose && (
        <div className="flex items-center justify-between p-4 lg:hidden">
          <span className="font-semibold">Settings</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        <NavSection title="Account" items={accountItems} currentPath={currentPath} />
        <Separator className="bg-border/50" />
        <NavSection title="Preferences" items={preferenceItems} currentPath={currentPath} />
        <Separator className="bg-border/50" />
        <NavSection title="Support" items={supportItems} currentPath={currentPath} />
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          FoodShare v1.0 · Made with <Heart className="inline w-3 h-3 text-rose-500 mx-0.5" /> for
          the community
        </p>
      </div>
    </div>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  gradient,
  external,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  gradient: string;
  external?: boolean;
}) {
  const content = (
    <Glass
      variant="subtle"
      hover
      className={cn(
        "group relative p-5 cursor-pointer overflow-hidden",
        "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
      )}
    >
      {/* Gradient glow on hover */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300",
          gradient
        )}
      />

      <div className="relative flex items-start gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
            "transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
            gradient
          )}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{title}</h3>
            {external && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground/50 self-center transition-all duration-200 group-hover:text-primary group-hover:translate-x-1" />
      </div>
    </Glass>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link href={href}>{content}</Link>;
}

export function SettingsClient() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-blue-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-56 h-56 bg-purple-500/8 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Manage your account and preferences
                </p>
              </div>
            </div>

            {/* Mobile menu toggle */}
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
        <div className="flex gap-8">
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
                  className="fixed inset-0 bg-black/50 z-40 lg:hidden"
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
            className="flex-1 min-w-0"
          >
            {/* Welcome section */}
            <Glass variant="prominent" className="p-6 lg:p-8 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground mb-1">
                    Welcome to Settings
                  </h2>
                  <p className="text-muted-foreground">
                    Customize your FoodShare experience. Update your profile, manage security, and
                    personalize how the app works for you.
                  </p>
                </div>
              </div>
            </Glass>

            {/* Quick actions grid */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground px-1">Quick Actions</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <QuickActionCard
                  icon={User}
                  title="Update Profile"
                  description="Edit your name, photo, and contact info"
                  href="/settings/personal-info"
                  gradient="from-blue-500 to-cyan-500"
                />
                <QuickActionCard
                  icon={Shield}
                  title="Security Settings"
                  description="Password, two-factor authentication"
                  href="/settings/login-and-security"
                  gradient="from-emerald-500 to-teal-500"
                />
                <QuickActionCard
                  icon={HelpCircle}
                  title="Get Help"
                  description="FAQs, guides, and support resources"
                  href="/help"
                  gradient="from-slate-500 to-gray-600"
                />
                <QuickActionCard
                  icon={Heart}
                  title="Give Feedback"
                  description="Help us improve FoodShare"
                  href="/feedback"
                  gradient="from-rose-500 to-pink-500"
                />
              </div>
            </div>

            {/* Coming soon section */}
            <div className="mt-10 space-y-4">
              <h3 className="text-lg font-semibold text-foreground px-1">Coming Soon</h3>
              <Glass variant="subtle" className="p-6">
                <div className="flex flex-wrap gap-3">
                  {preferenceItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.href}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-muted-foreground"
                      >
                        <div
                          className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br opacity-50",
                            item.gradient
                          )}
                        >
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  We&apos;re working on these features. Stay tuned for updates!
                </p>
              </Glass>
            </div>

            {/* Danger zone */}
            <div className="mt-10 space-y-4">
              <h3 className="text-lg font-semibold text-foreground px-1 flex items-center gap-2">
                <LogOut className="w-4 h-4 text-destructive" />
                Account Actions
              </h3>
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Need to take a break? You can log out or manage your account status.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </Button>
                </div>
              </div>
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}

export default SettingsClient;
