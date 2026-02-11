/**
 * Notification Settings Page
 * Allows users to manage their notification preferences
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNotificationPreferences } from "@/lib/data/notifications";
import { NotificationSettingsForm } from "./NotificationSettingsForm";

import { generateNoIndexMetadata } from "@/lib/metadata";

export const metadata = generateNoIndexMetadata("Notification Settings", "Manage your notification preferences");

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const preferences = await getNotificationPreferences(user.id);

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground">Choose what notifications you want to receive</p>
      </div>

      <NotificationSettingsForm initialPreferences={preferences} />
    </div>
  );
}
