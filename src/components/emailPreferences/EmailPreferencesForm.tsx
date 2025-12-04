'use client';

/**
 * Email Preferences Form Component
 * Allows users to manage their email notification settings
 */

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { GlassCard } from "@/components/Glass";

interface EmailPreferences {
  chat_notifications: boolean;
  food_listings_notifications: boolean;
  feedback_notifications: boolean;
  review_reminders: boolean;
  notification_frequency: "instant" | "daily_digest" | "weekly_digest";
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export const EmailPreferencesForm: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [preferences, setPreferences] = useState<EmailPreferences>({
    chat_notifications: true,
    food_listings_notifications: true,
    feedback_notifications: false,
    review_reminders: true,
    notification_frequency: "instant",
    quiet_hours_start: null,
    quiet_hours_end: null,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage({ type: "error", text: "You must be logged in to manage preferences" });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("email_preferences")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setPreferences({
          chat_notifications: data.chat_notifications,
          food_listings_notifications: data.food_listings_notifications,
          feedback_notifications: data.feedback_notifications,
          review_reminders: data.review_reminders,
          notification_frequency: data.notification_frequency,
          quiet_hours_start: data.quiet_hours_start,
          quiet_hours_end: data.quiet_hours_end,
        });
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
      setMessage({ type: "error", text: "Failed to load preferences" });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      const { error } = await supabase.from("email_preferences").upsert({
        profile_id: user.id,
        ...preferences,
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Preferences saved successfully!" });

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save preferences:", error);
      setMessage({ type: "error", text: "Failed to save preferences" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <GlassCard variant="standard" padding="lg" className="max-w-3xl mx-auto">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading preferences...</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="standard" padding="lg" className="max-w-3xl mx-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Email Notifications</h2>
          <p className="text-gray-600">Manage how you receive email notifications from FoodShare</p>
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
              className="mt-1 h-5 w-5 text-green-600 rounded focus:ring-green-500"
            />
            <div>
              <p className="font-medium">Chat Messages</p>
              <p className="text-sm text-gray-600">
                Get notified when you receive new chat messages
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.food_listings_notifications}
              onChange={(e) =>
                setPreferences({ ...preferences, food_listings_notifications: e.target.checked })
              }
              className="mt-1 h-5 w-5 text-green-600 rounded focus:ring-green-500"
            />
            <div>
              <p className="font-medium">Food Listings Nearby</p>
              <p className="text-sm text-gray-600">
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
              className="mt-1 h-5 w-5 text-green-600 rounded focus:ring-green-500"
            />
            <div>
              <p className="font-medium">Review Reminders</p>
              <p className="text-sm text-gray-600">
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
                onChange={(e) =>
                  setPreferences({ ...preferences, notification_frequency: "instant" })
                }
                className="h-4 w-4 text-green-600 focus:ring-green-500"
              />
              <div>
                <p className="font-medium">Instant</p>
                <p className="text-sm text-gray-600">Receive emails as events happen</p>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value="daily_digest"
                checked={preferences.notification_frequency === "daily_digest"}
                onChange={(e) =>
                  setPreferences({ ...preferences, notification_frequency: "daily_digest" })
                }
                className="h-4 w-4 text-green-600 focus:ring-green-500"
              />
              <div>
                <p className="font-medium">Daily Digest</p>
                <p className="text-sm text-gray-600">Receive one email per day with all updates</p>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value="weekly_digest"
                checked={preferences.notification_frequency === "weekly_digest"}
                onChange={(e) =>
                  setPreferences({ ...preferences, notification_frequency: "weekly_digest" })
                }
                className="h-4 w-4 text-green-600 focus:ring-green-500"
              />
              <div>
                <p className="font-medium">Weekly Digest</p>
                <p className="text-sm text-gray-600">Receive one email per week with all updates</p>
              </div>
            </label>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Quiet Hours</h3>
          <p className="text-sm text-gray-600">
            Don't send me notifications during these hours (applies to instant notifications only)
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="time"
                value={preferences.quiet_hours_start || ""}
                onChange={(e) =>
                  setPreferences({ ...preferences, quiet_hours_start: e.target.value || null })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                value={preferences.quiet_hours_end || ""}
                onChange={(e) =>
                  setPreferences({ ...preferences, quiet_hours_end: e.target.value || null })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </GlassCard>
  );
};
