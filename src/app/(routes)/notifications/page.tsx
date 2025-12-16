/**
 * Notifications Page
 * Full page view of all notifications
 */

import { redirect } from "next/navigation";
import { NotificationsPageClient } from "./NotificationsPageClient";
import { createClient } from "@/lib/supabase/server";
import { getUserNotifications, getUnreadNotificationCount } from "@/lib/data/notifications";

// Force dynamic rendering - user-specific content
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notifications | FoodShare",
  description: "View your notifications",
};

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
