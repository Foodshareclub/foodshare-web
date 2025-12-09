"use client";

/**
 * NotificationSettingsForm Component
 * Form for managing notification preferences
 */

import { useState } from "react";
import { Bell, MessageSquare, MapPin, Star, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { updateNotificationPreferences } from "@/app/actions/notifications";

type NotificationPreferences = {
  messages?: boolean;
  new_listings?: boolean;
  reservations?: boolean;
};

type NotificationSettingsFormProps = {
  initialPreferences: NotificationPreferences;
};

const notificationSettings = [
  {
    id: "messages",
    title: "Messages",
    description: "Get notified when someone sends you a message",
    icon: MessageSquare,
  },
  {
    id: "new_listings",
    title: "Nearby Listings",
    description: "Get notified about new food listings near you",
    icon: MapPin,
  },
  {
    id: "reservations",
    title: "Reservations & Reviews",
    description: "Get notified when someone claims your listing or leaves a review",
    icon: Star,
  },
] as const;

export function NotificationSettingsForm({ initialPreferences }: NotificationSettingsFormProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const newValue = !preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: newValue }));

    setIsSaving(true);
    setSavedMessage(null);

    const result = await updateNotificationPreferences({ [key]: newValue });

    setIsSaving(false);

    if (result.success) {
      setSavedMessage("Preferences saved");
      setTimeout(() => setSavedMessage(null), 2000);
    } else {
      // Revert on error
      setPreferences((prev) => ({ ...prev, [key]: !newValue }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Bell className="h-5 w-5" />
            Push Notifications
          </h2>
          <p className="text-sm text-muted-foreground">
            Control which notifications you receive in the app
          </p>
        </div>
        <div className="space-y-6">
          {notificationSettings.map((setting, index) => (
            <div key={setting.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <setting.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-0.5">
                    <Label htmlFor={setting.id} className="text-base font-medium">
                      {setting.title}
                    </Label>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                </div>
                <Switch
                  id={setting.id}
                  checked={preferences[setting.id] ?? true}
                  onCheckedChange={() => handleToggle(setting.id)}
                  disabled={isSaving}
                />
              </div>
              {index < notificationSettings.length - 1 && <Separator className="mt-6" />}
            </div>
          ))}
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-end h-6">
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </div>
        )}
        {savedMessage && (
          <div className="text-sm text-green-600 dark:text-green-400">{savedMessage}</div>
        )}
      </div>
    </div>
  );
}
