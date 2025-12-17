"use client";

/**
 * Settings Client Component
 * Premium settings hub with bento-grid layout, user profile summary,
 * and modern micro-interactions. Inspired by Linear, Raycast, and Arc.
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  Keyboard,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  MessageSquare,
  Camera,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Glass } from "@/components/ui/glass";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
    description: "Language, search radius",
    href: "/settings/language",
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

// Keyboard shortcut handler
function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only trigger if not in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case ",":
            e.preventDefault();
            router.push("/settings");
            break;
          case "p":
            e.preventDefault();
            router.push("/settings/personal-info");
            break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration detection pattern
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-[104px] h-9 rounded-lg bg-muted animate-pulse" />;
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
      <TooltipProvider>
        {[
          { value: "light", icon: Sun, label: "Light" },
          { value: "dark", icon: Moon, label: "Dark" },
          { value: "system", icon: Monitor, label: "System" },
        ].map(({ value, icon: Icon, label }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(value)}
                className={cn(
                  "p-1.5 rounded-md transition-all duration-200",
                  theme === value
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}

function ProfileCompletionCard() {
  // Mock data - in real app, this would come from server
  const completionItems = [
    { label: "Profile photo", completed: true },
    { label: "Phone number", completed: false },
    { label: "Address", completed: false },
    { label: "Email verified", completed: true },
  ];

  const completedCount = completionItems.filter((i) => i.completed).length;
  const percentage = Math.round((completedCount / completionItems.length) * 100);

  return (
    <Glass variant="subtle" hover className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Profile Completion</span>
        </div>
        <span className="text-sm font-semibold text-primary">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2 mb-4" />
      <div className="space-y-2">
        {completionItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            {item.completed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground/40" />
            )}
            <span className={cn(item.completed ? "text-muted-foreground" : "text-foreground")}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <Link
        href="/settings/personal-info"
        className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        Complete your profile
        <ChevronRight className="w-3 h-3" />
      </Link>
    </Glass>
  );
}

function ActivitySummaryCard() {
  // Mock data
  const stats = [
    { label: "Items shared", value: "12", icon: Heart },
    { label: "Messages", value: "48", icon: MessageSquare },
    { label: "Days active", value: "23", icon: Clock },
  ];

  return (
    <Glass variant="subtle" hover className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium">Your Activity</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-muted/50 flex items-center justify-center">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </Glass>
  );
}

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
      {onClose && (
        <div className="flex items-center justify-between p-4 lg:hidden">
          <span className="font-semibold">Settings</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        <NavSection title="Account" items={accountItems} currentPath={currentPath} />
        <Separator className="bg-border/50" />
        <NavSection title="Preferences" items={preferenceItems} currentPath={currentPath} />
        <Separator className="bg-border/50" />
        <NavSection title="Support" items={supportItems} currentPath={currentPath} />
      </nav>

      <div className="p-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          FoodShare v1.0 · Made with <Heart className="inline w-3 h-3 text-rose-500 mx-0.5" /> for
          the community
        </p>
      </div>
    </div>
  );
}

function BentoCard({
  icon: Icon,
  title,
  description,
  href,
  gradient,
  size = "default",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  gradient: string;
  size?: "default" | "large";
}) {
  return (
    <Link href={href} className="block">
      <Glass
        variant="subtle"
        hover
        className={cn(
          "group relative overflow-hidden cursor-pointer",
          "hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
          size === "large" ? "p-6 lg:p-8" : "p-5"
        )}
      >
        {/* Animated gradient background on hover */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500",
            gradient
          )}
        />

        {/* Floating particles effect */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative">
          <div
            className={cn(
              "rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
              "transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-xl",
              size === "large" ? "w-14 h-14 mb-4" : "w-12 h-12 mb-3",
              gradient
            )}
          >
            <Icon className={cn("text-white", size === "large" ? "w-6 h-6" : "w-5 h-5")} />
          </div>

          <h3
            className={cn(
              "font-semibold text-foreground mb-1 group-hover:text-primary transition-colors",
              size === "large" ? "text-lg" : "text-base"
            )}
          >
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>

          <div className="mt-3 flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span>Open</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </Glass>
    </Link>
  );
}

function UserProfileHeader() {
  // Mock user data - in real app, this would come from props/context
  const user = {
    name: "Food Sharer",
    email: "user@example.com",
    avatarUrl: null as string | null,
    memberSince: "Dec 2024",
  };

  return (
    <Glass variant="prominent" className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar */}
        <div className="relative group">
          <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-background shadow-xl">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <Link
            href="/settings/personal-info"
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Camera className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>

        {/* User info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">{user.name}</h2>
            <Badge variant="secondary" className="text-xs">
              Member
            </Badge>
          </div>
          <p className="text-muted-foreground mb-2">{user.email}</p>
          <p className="text-xs text-muted-foreground">
            Member since {user.memberSince} · <span className="text-emerald-500">Active</span>
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </Glass>
  );
}

function KeyboardShortcutsHint() {
  return (
    <Glass variant="subtle" className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <Keyboard className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Keyboard shortcuts</p>
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">⌘</kbd> +{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">,</kbd> to open
            settings
          </p>
        </div>
      </div>
    </Glass>
  );
}

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
