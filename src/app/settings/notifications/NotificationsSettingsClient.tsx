"use client";

/**
 * Notification Settings Client Component
 *
 * Enterprise Liquid Glass notification preferences manager.
 * Single source of truth is the Supabase PostgreSQL backend.
 * Features:
 * - Direct backend preference synchronization
 * - Supabase Realtime subscription for multi-device sync
 * - Optimistic updates with automatic rollback on error
 * - Category-level channel toggling (Push, Email, Telegram, In-App)
 * - Do Not Disturb & Quiet Hours configuration
 */

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bell,
  ChevronLeft,
  Smartphone,
  Mail,
  Send,
  MessageSquare,
  Sparkles,
  ShoppingBag,
  Moon,
  Clock,
  ShieldCheck,
  Check,
  RefreshCw,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Glass } from "@/components/ui/glass";
import { TelegramIntegrationCard } from "@/components/settings/TelegramIntegrationCard";
import { createClient } from "@/lib/supabase/client";
import {
  getFullNotificationPreferences,
  updateNotificationSettingsAction,
  updateCategoryChannelAction,
} from "@/app/actions/notifications";
import type { FullNotificationPreferencesData } from "@/types";
import type { AuthUser } from "@/lib/data/auth";

interface NotificationsSettingsClientProps {
  user: AuthUser;
  initialData?: FullNotificationPreferencesData | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

export function NotificationsSettingsClient({
  user,
  initialData,
}: NotificationsSettingsClientProps) {
  const [data, setData] = useState<FullNotificationPreferencesData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [savedToast, setSavedToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [_isPending, startTransition] = useTransition();

  // Load preferences from backend
  const loadPreferences = useCallback(async () => {
    try {
      const res = await getFullNotificationPreferences();
      if (res.success && res.data) {
        setData(res.data);
      } else if (!res.success) {
        setErrorMessage(res.error.message || "Failed to load preferences");
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      loadPreferences();
    }
  }, [initialData, loadPreferences]);

  // Subscribe to Supabase Realtime for instant multi-device / bot updates
  useEffect(() => {
    const supabase = createClient();
    const channelName = `user-notifications-settings-${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_settings",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadPreferences();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        () => {
          loadPreferences();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, loadPreferences]);

  // Toggle Master Delivery Channel
  const handleToggleChannel = (
    channelKey: "push_enabled" | "email_enabled" | "telegram_enabled"
  ) => {
    if (!data) return;

    const previousValue = data.settings[channelKey];
    const nextValue = !previousValue;

    // Optimistic state
    setData({
      ...data,
      settings: {
        ...data.settings,
        [channelKey]: nextValue,
      },
    });

    startTransition(async () => {
      const res = await updateNotificationSettingsAction({
        [channelKey]: nextValue,
      });

      if (res.success) {
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2000);
      } else {
        // Rollback
        setData((prev) =>
          prev
            ? {
                ...prev,
                settings: {
                  ...prev.settings,
                  [channelKey]: previousValue,
                },
              }
            : null
        );
        setErrorMessage(!res.success ? res.error.message : "Failed to update channel setting");
      }
    });
  };

  // Toggle Category Channel
  const handleToggleCategoryChannel = (category: string, channel: string) => {
    if (!data) return;

    const currentCat = data.preferences[category] || {};
    const currentChannel = currentCat[channel] || { enabled: true, frequency: "instant" };
    const nextEnabled = !currentChannel.enabled;

    // Optimistic state
    setData({
      ...data,
      preferences: {
        ...data.preferences,
        [category]: {
          ...currentCat,
          [channel]: {
            ...currentChannel,
            enabled: nextEnabled,
          },
        },
      },
    });

    startTransition(async () => {
      const res = await updateCategoryChannelAction(category, channel, nextEnabled);
      if (res.success) {
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2000);
      } else {
        // Rollback
        setData((prev) =>
          prev
            ? {
                ...prev,
                preferences: {
                  ...prev.preferences,
                  [category]: {
                    ...currentCat,
                    [channel]: currentChannel,
                  },
                },
              }
            : null
        );
        setErrorMessage(!res.success ? res.error.message : "Failed to update category preference");
      }
    });
  };

  // Toggle Quiet Hours
  const handleToggleQuietHours = () => {
    if (!data) return;

    const previousState = data.settings.quiet_hours.enabled;
    const nextState = !previousState;

    setData({
      ...data,
      settings: {
        ...data.settings,
        quiet_hours: {
          ...data.settings.quiet_hours,
          enabled: nextState,
        },
      },
    });

    startTransition(async () => {
      const res = await updateNotificationSettingsAction({
        quiet_hours: {
          ...data.settings.quiet_hours,
          enabled: nextState,
        },
      });

      if (res.success) {
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2000);
      } else {
        // Rollback
        setData((prev) =>
          prev
            ? {
                ...prev,
                settings: {
                  ...prev.settings,
                  quiet_hours: {
                    ...prev.settings.quiet_hours,
                    enabled: previousState,
                  },
                },
              }
            : null
        );
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading notification preferences...</p>
        </div>
      </div>
    );
  }

  const settings = data?.settings;
  const prefs = data?.preferences || {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background pb-16">
      <div className="container mx-auto max-w-3xl px-4 py-6 lg:py-10">
        {/* Back Link */}
        <Link
          href="/settings"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ChevronLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
          Settings
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 text-white">
              <Bell className="w-6 h-6" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                Notification Preferences
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Backend synchronized notification preferences across Web, Mobile & Telegram
              </p>
            </div>
          </div>

          {savedToast && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium"
            >
              <Check className="w-3.5 h-3.5" />
              Saved to Cloud
            </motion.div>
          )}
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {errorMessage}
          </div>
        )}

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Telegram Card Component */}
          <motion.div variants={itemVariants}>
            <TelegramIntegrationCard
              userId={user.id}
              initialLinked={settings?.telegram_linked}
              initialUsername={settings?.telegram_username}
              onStatusChange={() => loadPreferences()}
            />
          </motion.div>

          {/* Master Delivery Channels */}
          <motion.div variants={itemVariants}>
            <Glass variant="subtle" className="p-6 rounded-2xl">
              <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Master Delivery Channels
              </h2>

              <div className="space-y-4 divide-y divide-border/40">
                {/* Push Notifications */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 mt-0.5">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Push Notifications</p>
                      <p className="text-xs text-muted-foreground">
                        Mobile & browser device push notifications
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.push_enabled ?? true}
                    onCheckedChange={() => handleToggleChannel("push_enabled")}
                  />
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 mt-0.5">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">
                        Activity summaries and critical security updates
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.email_enabled ?? true}
                    onCheckedChange={() => handleToggleChannel("email_enabled")}
                  />
                </div>

                {/* Telegram Channel Toggle */}
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-[#0088cc]/10 text-[#0088cc] mt-0.5">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Telegram Bot Messages</p>
                      <p className="text-xs text-muted-foreground">
                        Direct instant alerts in your Telegram chat
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.telegram_enabled ?? true}
                    onCheckedChange={() => handleToggleChannel("telegram_enabled")}
                  />
                </div>
              </div>
            </Glass>
          </motion.div>

          {/* Category-Level Notification Controls */}
          <motion.div variants={itemVariants}>
            <Glass variant="subtle" className="p-6 rounded-2xl">
              <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-500" />
                Category Preferences
              </h2>

              <div className="space-y-4 divide-y divide-border/40">
                {/* Messages */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 mt-0.5">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Chat Messages & Inquiries
                      </p>
                      <p className="text-xs text-muted-foreground">
                        When someone messages you regarding a food item
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={prefs.chats?.push?.enabled ?? true}
                    onCheckedChange={() => handleToggleCategoryChannel("chats", "push")}
                  />
                </div>

                {/* Nearby Listings */}
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 mt-0.5">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        New Food Listings Nearby
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Alerts when free food is posted in your radius
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={prefs.posts?.push?.enabled ?? true}
                    onCheckedChange={() => handleToggleCategoryChannel("posts", "push")}
                  />
                </div>

                {/* Reservations & Claims */}
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Reservations & Pickups</p>
                      <p className="text-xs text-muted-foreground">
                        Status updates for items you claimed or shared
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={prefs.system?.push?.enabled ?? true}
                    onCheckedChange={() => handleToggleCategoryChannel("system", "push")}
                  />
                </div>
              </div>
            </Glass>
          </motion.div>

          {/* Quiet Hours & Schedule */}
          <motion.div variants={itemVariants}>
            <Glass variant="subtle" className="p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 mt-0.5">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Quiet Hours</h3>
                    <p className="text-xs text-muted-foreground">
                      Mute non-critical notifications between 10:00 PM and 8:00 AM
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings?.quiet_hours?.enabled ?? false}
                  onCheckedChange={handleToggleQuietHours}
                />
              </div>

              {settings?.quiet_hours?.enabled && (
                <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Digest summary will be delivered at 8:30 AM local time.</span>
                </div>
              )}
            </Glass>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default NotificationsSettingsClient;
