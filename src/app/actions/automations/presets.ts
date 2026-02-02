"use server";

/**
 * Preset Automations
 * Create pre-configured automation flows (welcome, reengagement, food_alert, welcome_with_testers)
 */

import { createAutomationFlow } from "./flow-crud";
import { error, type ActionResult } from "./types";

// ============================================================================
// Preset Automations
// ============================================================================

export async function createPresetAutomation(
  preset: "welcome" | "reengagement" | "food_alert" | "welcome_with_testers"
): Promise<ActionResult<{ id: string; name: string }>> {
  const presets = {
    welcome: {
      name: "Welcome Series",
      description: "Onboard new subscribers with a 3-email sequence",
      trigger_type: "user_signup",
      steps: [
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "welcome",
          subject: "Welcome to FoodShare! 🍎",
        },
        { type: "delay" as const, delay_minutes: 2880 },
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "complete-profile",
          subject: "Complete your FoodShare profile 📝",
        },
        { type: "delay" as const, delay_minutes: 7200 },
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "first-share-tips",
          subject: "Ready to share your first food? 🥗",
        },
      ],
    },
    // Enhanced welcome series with beta tester recruitment
    welcome_with_testers: {
      name: "Welcome Series + Tester Recruitment",
      description:
        "5-email onboarding sequence: welcome → profile → tester recruitment → first share → community highlights",
      trigger_type: "user_signup",
      steps: [
        // Step 1: Immediate welcome email
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "welcome",
          subject: "Welcome to FoodShare! 🍎",
        },
        // Step 2: Wait 2 days
        { type: "delay" as const, delay_minutes: 2880 },
        // Step 3: Complete profile reminder
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "complete-profile",
          subject: "Complete your FoodShare profile 📝",
        },
        // Step 4: Wait 2 more days
        { type: "delay" as const, delay_minutes: 2880 },
        // Step 5: Tester recruitment (Web + iOS)
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "tester-recruitment",
          subject: "Help Shape FoodShare's Future - Join Our Beta Program 🚀",
        },
        // Step 6: Wait 3 days
        { type: "delay" as const, delay_minutes: 4320 },
        // Step 7: First share tips
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "first-share-tips",
          subject: "Ready to share your first food? 🥗",
        },
        // Step 8: Wait 5 days
        { type: "delay" as const, delay_minutes: 7200 },
        // Step 9: Community highlights
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "community-highlights",
          subject: "See what your neighbors are sharing 🏘️",
        },
      ],
    },
    reengagement: {
      name: "Re-engagement Campaign",
      description: "Win back inactive users after 30 days",
      trigger_type: "inactivity",
      trigger_config: { days_inactive: 30 },
      steps: [
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "reengagement",
          subject: "We miss you at FoodShare! 💚",
        },
        { type: "delay" as const, delay_minutes: 10080 },
        {
          type: "condition" as const,
          condition: { field: "last_seen_at", operator: "older_than", value: "7d" },
        },
        {
          type: "email" as const,
          delay_minutes: 0,
          subject: "Here's what you're missing on FoodShare",
        },
      ],
    },
    food_alert: {
      name: "Food Alert",
      description: "Notify users when food is available nearby",
      trigger_type: "food_listed_nearby",
      trigger_config: { radius_km: 5, max_per_day: 3 },
      steps: [
        {
          type: "email" as const,
          delay_minutes: 0,
          template_slug: "food-alert",
          subject: "New food available near you! 🍽️",
        },
      ],
    },
  };

  const config = presets[preset];
  if (!config) {
    return error("Invalid preset type", "INVALID_PRESET");
  }

  return createAutomationFlow(config);
}
