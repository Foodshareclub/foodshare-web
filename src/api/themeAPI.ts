/**
 * Theme API
 * Handles theme preference syncing with Supabase for logged-in users
 */

import { supabase } from "@/lib/supabase/client";
import type { Theme, ThemeSchedule } from "@/store/zustand/useUIStore";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ThemeAPI");

export interface ThemePreferences {
  theme: Theme;
  schedule: ThemeSchedule;
  transition: "instant" | "smooth" | "radial";
}

const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  theme: "system",
  schedule: {
    enabled: false,
    lightStart: "07:00",
    darkStart: "19:00",
  },
  transition: "radial",
};

/**
 * Theme API methods for syncing preferences with Supabase
 */
export const themeAPI = {
  /**
   * Get user's theme preferences from Supabase
   */
  async getThemePreferences(userId: string): Promise<ThemePreferences | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("theme_preferences")
        .eq("id", userId)
        .single();

      if (error) {
        logger.error("Error fetching theme preferences", error);
        return null;
      }

      return (data?.theme_preferences as ThemePreferences) || DEFAULT_THEME_PREFERENCES;
    } catch (err) {
      logger.error("Failed to get theme preferences", err as Error);
      return null;
    }
  },

  /**
   * Update user's theme preferences in Supabase
   */
  async updateThemePreferences(
    userId: string,
    preferences: Partial<ThemePreferences>
  ): Promise<boolean> {
    try {
      // First get current preferences to merge
      const current = await this.getThemePreferences(userId);
      const merged: ThemePreferences = {
        ...DEFAULT_THEME_PREFERENCES,
        ...current,
        ...preferences,
        schedule: {
          ...DEFAULT_THEME_PREFERENCES.schedule,
          ...current?.schedule,
          ...preferences.schedule,
        },
      };

      const { error } = await supabase
        .from("profiles")
        .update({ theme_preferences: merged })
        .eq("id", userId);

      if (error) {
        logger.error("Error updating theme preferences", error);
        return false;
      }

      return true;
    } catch (err) {
      logger.error("Failed to update theme preferences", err as Error);
      return false;
    }
  },

  /**
   * Update only the theme setting
   */
  async setTheme(userId: string, theme: Theme): Promise<boolean> {
    return this.updateThemePreferences(userId, { theme });
  },

  /**
   * Update only the schedule settings
   */
  async setSchedule(userId: string, schedule: Partial<ThemeSchedule>): Promise<boolean> {
    const current = await this.getThemePreferences(userId);
    return this.updateThemePreferences(userId, {
      schedule: {
        ...DEFAULT_THEME_PREFERENCES.schedule,
        ...current?.schedule,
        ...schedule,
      },
    });
  },

  /**
   * Update only the transition setting
   */
  async setTransition(
    userId: string,
    transition: "instant" | "smooth" | "radial"
  ): Promise<boolean> {
    return this.updateThemePreferences(userId, { transition });
  },
};
