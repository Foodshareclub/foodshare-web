"use client";

/**
 * Email Preferences Form Component
 * Allows users to manage their email notification settings
 */

import React, { useState, useTransition } from "react";
import { saveEmailPreferences, type EmailPreferencesInput } from "@/app/actions/email-preferences";
import type { EmailPreferences } from "@/lib/data/email-preferences";

interface EmailPreferencesFormProps {
  initialPreferences: EmailPreferences | null;
}

const defaultPreferences: EmailPreferencesInput = {
  chat_notifications: true,
  food_listings_notifications: true,
  feedback_notifications: false,
  review_reminders: true,
  notification_frequency: "instant",
  quiet_hours_start: null,
  quiet_hours_end: null,
};

export function EmailPreferencesForm({ initialPreferences }: EmailPreferencesFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [preferences, setPreferences] = useState<EmailPreferencesInput>(
    initialPreferences
      ? {
          chat_notifications: initialPreferences.chat_notifications,
          food_listings_notifications: initialPreferences.food_listings_notifications,
          feedback_notifications: initialPreferences.feedback_notifications,
          review_reminders: initialPreferences.review_reminders,
          notification_frequency: initialPreferences.notification_frequency,
          quiet_hours_start: initialPreferences.quiet_hours_start,
          quiet_hours_end: initialPreferences.quiet_hours_end,
        }
      : defaultPreferences
  );

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveEmailPreferences(preferences);

      if (result.success) {
        setMessage({ type: "success", text: "Preferences saved successfully!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: result.error || "Failed to save preferences" });
      }
    });
  };

  return (
    <div className="glass rounded-xl p-6 max-w-3xl mx-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Email Notifications</h2>
          <p className="text-muted-foreground">
            Manage how you receive email notifications from FoodShare
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Notification Types</h3>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.chat_notifications}
              onChange={(e) =>
                setPreferences({ ...preferences, chat_notifications: e.target.checked })
              }
              className="mt-1 h-5 w-5 text-primary rounded focus:ring-primary"
            />
            <div>
              <p className="font-medium">Chat Messages</p>
              <p className="text-sm text-muted-foreground">
                Get notified when you receive new chat messages
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.food_listings_notifications}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  food_listings_notifications: e.target.checked,
                })
              }
              className="mt-1 h-5 w-5 text-primary rounded focus:ring-primary"
            />
            <div>
              <p className="font-medium">Food Listings Nearby</p>
              <p className="text-sm text-muted-foreground">
                Get notified when new food is listed near your location
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.review_reminders}
              onChange={(e) =>
                setPreferences({ ...preferences, review_reminders: e.target.checked })
              }
              className="mt-1 h-5 w-5 text-primary rounded focus:ring-primary"
            />
            <div>
              <p className="font-medium">Review Reminders</p>
              <p className="text-sm text-muted-foreground">
                Get reminded to leave reviews after completing food shares
              </p>
            </div>
          </label>
        </div>

        {/* Notification Frequency */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Notification Frequency</h3>

          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value="instant"
                checked={preferences.notification_frequency === "instant"}
                onChange={() =>
                  setPreferences({ ...preferences, notification_frequency: "instant" })
                }
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <div>
                <p className="font-medium">Instant</p>
                <p className="text-sm text-muted-foreground">Receive emails as events happen</p>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value="daily_digest"
                checked={preferences.notification_frequency === "daily_digest"}
                onChange={() =>
                  setPreferences({ ...preferences, notification_frequency: "daily_digest" })
                }
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <div>
                <p className="font-medium">Daily Digest</p>
                <p className="text-sm text-muted-foreground">
                  Receive one email per day with all updates
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value="weekly_digest"
                checked={preferences.notification_frequency === "weekly_digest"}
                onChange={() =>
                  setPreferences({ ...preferences, notification_frequency: "weekly_digest" })
                }
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <div>
                <p className="font-medium">Weekly Digest</p>
                <p className="text-sm text-muted-foreground">
                  Receive one email per week with all updates
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Quiet Hours</h3>
          <p className="text-sm text-muted-foreground">
            Don&apos;t send me notifications during these hours (applies to instant notifications
            only)
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="time"
                value={preferences.quiet_hours_start || ""}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    quiet_hours_start: e.target.value || null,
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                value={preferences.quiet_hours_end || ""}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    quiet_hours_end: e.target.value || null,
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
