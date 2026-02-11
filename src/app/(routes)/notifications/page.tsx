/**
 * Notifications Page
 * Full page view of all notifications
 */

import { redirect } from "next/navigation";
import { NotificationsPageClient } from "./NotificationsPageClient";
import { createClient } from "@/lib/supabase/server";
import { getUserNotifications, getUnreadNotificationCount } from "@/lib/data/notifications";

import { generateNoIndexMetadata } from "@/lib/metadata";

export const metadata = generateNoIndexMetadata("Notifications", "View your notifications");

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(user.id, { limit: 50 }),
    getUnreadNotificationCount(user.id),
  ]);

  return (
    <NotificationsPageClient
      userId={user.id}
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
    />
  );
}
