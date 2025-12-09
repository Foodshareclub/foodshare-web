"use client";

/**
 * NotificationsPageClient Component
 * Client-side notifications page with realtime updates
 */

import { useState, useEffect } from "react";
import { Bell, Check, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { markAllNotificationsAsRead, deleteReadNotifications } from "@/app/actions/notifications";
import type { UserNotification } from "@/types/notifications.types";

type NotificationsPageClientProps = {
  userId: string;
  initialNotifications: UserNotification[];
  initialUnreadCount: number;
};

export function NotificationsPageClient({
  userId,
  initialNotifications,
  initialUnreadCount,
}: NotificationsPageClientProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isDeletingRead, setIsDeletingRead] = useState(false);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications-page:${userId}`)
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
            setNotifications((prev) => [payload.new as UserNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? (payload.new as UserNotification) : n))
            );
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
  }, [userId]);

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
    setIsDeletingRead(true);
    const result = await deleteReadNotifications();
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => !n.is_read));
    }
    setIsDeletingRead(false);
  };

  const filteredNotifications =
    filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

  const readCount = notifications.filter((n) => n.is_read).length;

  return (
    <div className="container max-w-2xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
            >
              {isMarkingAll ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Mark all read
            </Button>
          )}
          {readCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteRead}
              disabled={isDeletingRead}
              className="text-muted-foreground hover:text-destructive"
            >
              {isDeletingRead ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clear read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notification List */}
      {filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-sm">
            {filter === "unread"
              ? "You're all caught up!"
              : "When you get notifications, they'll show up here"}
          </p>
        </div>
      ) : (
        <div className="space-y-1 rounded-lg border bg-card">
          {filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={() => setUnreadCount((prev) => Math.max(0, prev - 1))}
              onDelete={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
