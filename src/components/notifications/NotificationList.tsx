/**
 * NotificationList Component (Server Component)
 * Server-side wrapper that fetches notifications and passes to client components
 */

import { getUserNotifications, getUnreadNotificationCount } from "@/lib/data/notifications";
import { NotificationCenter } from "./NotificationCenter";
import { NotificationBell } from "./NotificationBell";

type NotificationListProps = {
  userId: string;
  variant?: "bell" | "center";
  className?: string;
};

/**
 * Server component that fetches initial notification data
 * and renders the appropriate client component
 */
export async function NotificationList({
  userId,
  variant = "center",
  className,
}: NotificationListProps) {
  // Fetch initial data on server
  const [notifications, unreadCount] = await Promise.all([
    variant === "center" ? getUserNotifications(userId, { limit: 20 }) : Promise.resolve([]),
    getUnreadNotificationCount(userId),
  ]);

  if (variant === "bell") {
    return <NotificationBell userId={userId} initialCount={unreadCount} className={className} />;
  }

  return (
    <NotificationCenter
      userId={userId}
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
      className={className}
    />
  );
}
