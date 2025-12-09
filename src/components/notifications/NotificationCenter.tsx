"use client";

/**
 * NotificationCenter Component
 * Dropdown panel showing notification list with actions
 * Features: Realtime updates, sound notifications, browser notifications, toast alerts
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  Check,
  Trash2,
  Settings,
  Loader2,
  Volume2,
  VolumeX,
  BellRing,
  X,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NotificationItem } from "./NotificationItem";
import { markAllNotificationsAsRead, deleteReadNotifications } from "@/app/actions/notifications";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import type { UserNotification, NotificationType } from "@/types/notifications.types";

// Storage key for sound preference
const SOUND_ENABLED_KEY = "notification_sound_enabled";

// Toast notification for new incoming notifications
type ToastNotification = {
  id: string;
  title: string;
  body?: string;
  type: NotificationType;
};

type NotificationCenterProps = {
  userId: string;
  initialNotifications?: UserNotification[];
  initialUnreadCount?: number;
  className?: string;
};

export function NotificationCenter({
  userId,
  initialNotifications = [],
  initialUnreadCount = 0,
  className,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Sound preference from localStorage
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored !== "false";
  });

  // Browser notifications and sound
  const {
    showNotification: showBrowserNotification,
    requestPermission,
    isGranted,
    isSupported,
  } = useBrowserNotifications();
  const { playSound } = useNotificationSound(soundEnabled);

  // Track if component has mounted to avoid playing sound on initial load
  const hasMounted = useRef(false);

  useEffect(() => {
    // Small delay to ensure we don't trigger on initial render
    const timer = setTimeout(() => {
      hasMounted.current = true;
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Persist sound preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled));
    }
  }, [soundEnabled]);

  // Show toast notification
  const showToast = useCallback((notification: UserNotification) => {
    const toast: ToastNotification = {
      id: notification.id,
      title: notification.title,
      body: notification.body || undefined,
      type: notification.type,
    };
    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 5000);
  }, []);

  // Dismiss toast
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch notifications when popover opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("user_notifications")
        .select(
          `
          *,
          actor:actor_id (id, first_name, second_name, avatar_url),
          post:post_id (id, post_name, images)
        `
        )
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
      setIsLoading(false);
    };

    fetchNotifications();
  }, [isOpen, userId]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notification-center:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newNotification = payload.new as UserNotification;
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Only trigger alerts after component has mounted (not on initial load)
            if (hasMounted.current) {
              // Play sound
              playSound();

              // Show browser notification (if not focused or popover closed)
              if (document.hidden || !isOpen) {
                showBrowserNotification(newNotification.title, {
                  body: newNotification.body || undefined,
                  tag: newNotification.id,
                  data: { url: getNotificationUrl(newNotification) },
                });
              }

              // Show in-app toast (if popover is closed)
              if (!isOpen) {
                showToast(newNotification);
              }
            }
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? (payload.new as UserNotification) : n))
            );
            // Update unread count
            if (payload.new.is_read && !payload.old?.is_read) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          } else if (payload.eventType === "DELETE") {
            setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
            if (!payload.old?.is_read) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isOpen, playSound, showBrowserNotification, showToast]);

  // Helper to get notification URL
  const getNotificationUrl = (notification: UserNotification): string | null => {
    switch (notification.type) {
      case "new_message":
        return notification.room_id ? `/chat/${notification.room_id}` : "/chat";
      case "post_claimed":
      case "post_arranged":
      case "post_expiring":
      case "nearby_post":
        return notification.post_id ? `/listing/${notification.post_id}` : null;
      case "review_received":
      case "review_reminder":
        return "/profile/reviews";
      default:
        return null;
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    const result = await markAllNotificationsAsRead();
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    }
    setIsMarkingAll(false);
  };

  const handleDeleteRead = async () => {
    const result = await deleteReadNotifications();
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => !n.is_read));
    }
  };

  const handleNotificationRead = () => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleNotificationDelete = () => {
    // Notification will be removed via realtime subscription
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            {/* Sound toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                  >
                    {soundEnabled ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {soundEnabled ? "Mute sounds" : "Enable sounds"}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {soundEnabled ? "Mute notification sounds" : "Enable notification sounds"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Browser notification permission */}
            {isSupported && !isGranted && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={requestPermission}
                    >
                      <BellRing className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">Enable browser notifications</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Enable browser notifications</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                className="h-8 text-xs"
              >
                {isMarkingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Check className="h-3 w-3 mr-1" />
                )}
                Mark all read
              </Button>
            )}
            <Link href="/settings/notifications">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
                <span className="sr-only">Notification settings</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleNotificationRead}
                  onDelete={handleNotificationDelete}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2 flex justify-between">
              <Link href="/notifications">
                <Button variant="ghost" size="sm" className="text-xs">
                  View all notifications
                </Button>
              </Link>
              {notifications.some((n) => n.is_read) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteRead}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear read
                </Button>
              )}
            </div>
          </>
        )}
      </PopoverContent>

      {/* Toast notifications for new incoming notifications */}
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed bottom-4 left-1/2 z-[100] max-w-sm"
          >
            <div className="bg-background border rounded-lg shadow-lg p-4 flex items-start gap-3">
              <div className="flex-shrink-0">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.body && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{toast.body}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => dismissToast(toast.id)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </Popover>
  );
}
