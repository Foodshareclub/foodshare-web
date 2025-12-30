"use client";

/**
 * NotificationItem Component
 * Displays a single notification with actions
 */

import { useState } from "react";
import { MessageSquare, ShoppingBag, Star, Clock, MapPin, Bell, Trash2, Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { MoreHorizontal } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserNotification, NotificationType } from "@/types/notifications.types";
import { markNotificationAsRead, deleteNotification } from "@/app/actions/notifications";

type NotificationItemProps = {
  notification: UserNotification;
  onRead?: () => void;
  onDelete?: () => void;
};

const notificationIcons: Record<NotificationType, typeof Bell> = {
  new_message: MessageSquare,
  post_claimed: ShoppingBag,
  post_arranged: Check,
  review_received: Star,
  review_reminder: Star,
  post_expiring: Clock,
  nearby_post: MapPin,
  welcome: Bell,
  system: Bell,
};

const notificationColors: Record<NotificationType, string> = {
  new_message: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  post_claimed: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  post_arranged: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  review_received: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
  review_reminder: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  post_expiring: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  nearby_post: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  welcome: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  system: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function getNotificationLink(notification: UserNotification): string | null {
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
}

export function NotificationItem({ notification, onRead, onDelete }: NotificationItemProps) {
  const [isRead, setIsRead] = useState(notification.is_read);
  const [isDeleting, setIsDeleting] = useState(false);

  const Icon = notificationIcons[notification.type] || Bell;
  const colorClass = notificationColors[notification.type] || notificationColors.system;
  const link = getNotificationLink(notification);
  const timeAgo = formatDate(notification.created_at, { format: "relative-short" });

  const handleMarkAsRead = async () => {
    if (isRead) return;

    // Optimistic update
    setIsRead(true);
    onRead?.();

    const result = await markNotificationAsRead(notification.id);
    if (!result.success) {
      // Revert on error
      setIsRead(false);
    }
  };

  const handleDelete = async () => {
    // Optimistic update - hide immediately
    setIsDeleting(true);
    onDelete?.();

    const result = await deleteNotification(notification.id);
    if (!result.success) {
      // Revert on error
      setIsDeleting(false);
    }
  };

  // Don't render if being deleted
  if (isDeleting) return null;

  const content = (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-lg transition-colors",
        !isRead && "bg-muted/50",
        link && "hover:bg-muted cursor-pointer"
      )}
    >
      {/* Icon or Avatar */}
      <div className="flex-shrink-0">
        {notification.actor?.avatar_url ? (
          <Image
            src={notification.actor.avatar_url}
            alt={`${notification.actor.first_name}'s avatar`}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        ) : (
          <div
            className={cn("w-10 h-10 rounded-full flex items-center justify-center", colorClass)}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", !isRead && "font-medium")}>{notification.title}</p>
        {notification.body && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{notification.body}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>

      {/* Unread indicator */}
      {!isRead && (
        <div className="flex-shrink-0 self-center">
          <div className="w-2 h-2 rounded-full bg-primary" />
        </div>
      )}
    </div>
  );

  return (
    <div className="relative group">
      {link ? (
        <Link href={link} onClick={handleMarkAsRead}>
          {content}
        </Link>
      ) : (
        <div onClick={!isRead ? handleMarkAsRead : undefined}>{content}</div>
      )}

      {/* Actions dropdown */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isRead && (
              <DropdownMenuItem onClick={handleMarkAsRead}>
                <Check className="h-4 w-4 mr-2" />
                Mark as read
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
