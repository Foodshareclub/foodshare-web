/**
 * Setup Welcome Automation Script
 * Run with: node scripts/setup-welcome-automation.mjs
 *
 * This script seeds email templates and creates the welcome automation
 * using the Supabase service role key (bypasses RLS).
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load env files
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Email template definitions
const LOGO_URL =
  "https://api.foodshare.club/storage/v1/object/public/assets/logo-512.png";
const BRAND_COLOR = "#ff2d55";
const BRAND_GRADIENT = "linear-gradient(135deg, #ff2d55 0%, #ff5177 100%)";

const emailWrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; color: #1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        ${content}
        <tr>
          <td style="background: ${BRAND_GRADIENT}; padding: 30px; text-align: center;">
            <img src="${LOGO_URL}" alt="FoodShare" style="width: 40px; height: 40px; border-radius: 50%; background: white; padding: 2px; margin-bottom: 12px;">
            <p style="margin: 0 0 8px; font-size: 14px; color: rgba(255,255,255,0.9);">FoodShare LLC</p>
            <p style="margin: 0 0 16px; font-size: 12px; color: rgba(255,255,255,0.8);">4632 Winding Way, Sacramento, CA 95841</p>
            <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.7);">
              <a href="{{unsubscribe_url}}" style="color: rgba(255,255,255,0.9); text-decoration: underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;

const templates = [
  {
    name: "Welcome Email",
    slug: "welcome",
    subject: "Welcome to FoodShare! 🍎",
    category: "automation",
    variables: ["first_name", "unsubscribe_url"],
    plain_text_content: "Welcome to FoodShare! You're now part of a growing community...",
    html_content: emailWrapper(`
        <tr>
          <td style="background: ${BRAND_GRADIENT}; padding: 40px 30px; text-align: center;">
            <img src="${LOGO_URL}" alt="FoodShare" style="width: 80px; height: 80px; border-radius: 50%; background: white; padding: 4px; margin-bottom: 16px;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Welcome to FoodShare! 🎉</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px;">
            <p style="margin: 0 0 20px; font-size: 17px;">Hi {{first_name}},</p>
            <p style="margin: 0 0 24px; font-size: 16px; color: #444;">Welcome to FoodShare! You're now part of a community dedicated to reducing food waste.</p>
            <table width="100%"><tr><td align="center" style="padding: 20px 0;">
              <a href="https://foodshare.club/map" style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 600;">Explore the Map →</a>
            </td></tr></table>
          </td>
        </tr>
    `),
  },
  {
    name: "Complete Profile Reminder",
    slug: "complete-profile",
    subject: "Complete your FoodShare profile 📝",
    category: "automation",
    variables: ["first_name", "unsubscribe_url"],
    plain_text_content: "Complete your profile to connect with your community...",
    html_content: emailWrapper(`
        <tr>
          <td style="background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
            <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Complete Your Profile</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px;">
            <p style="margin: 0 0 20px; font-size: 17px;">Hi {{first_name}},</p>
            <p style="margin: 0 0 24px; font-size: 16px; color: #444;">A complete profile helps you connect with your local food sharing community.</p>
            <table width="100%"><tr><td align="center" style="padding: 20px 0;">
              <a href="https://foodshare.club/profile/edit" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 600;">Complete Profile →</a>
            </td></tr></table>
          </td>
        </tr>
    `),
  },
  {
    name: "Beta Tester Recruitment",
    slug: "tester-recruitment",
    subject: "Help Shape FoodShare's Future - Join Our Beta Program 🚀",
    category: "automation",
    variables: ["first_name", "unsubscribe_url"],
    plain_text_content: "Join our beta testing program for Web and iOS...",
    html_content: emailWrapper(`
        <tr>
          <td style="background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
            <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Join Our Beta Program</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px;">
            <p style="margin: 0 0 20px; font-size: 17px;">Hi {{first_name}},</p>
            <p style="margin: 0 0 24px; font-size: 16px; color: #444;">We need passionate testers like you!</p>
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin: 20px 0;">
              <h3 style="margin: 0 0 12px; font-size: 18px; color: #15803d;">🌐 Web App Beta</h3>
              <p style="margin: 0 0 16px; font-size: 14px; color: #166534;">Test new features before release</p>
              <a href="https://forms.gle/web-tester-form" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Join Web Beta →</a>
            </div>
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 24px; margin: 20px 0;">
              <h3 style="margin: 0 0 12px; font-size: 18px; color: #1d4ed8;">📱 iOS App Beta (TestFlight)</h3>
              <p style="margin: 0 0 16px; font-size: 14px; color: #1e40af;">Get early access to our iPhone app</p>
              <a href="https://forms.gle/ios-tester-form" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Join iOS TestFlight →</a>
            </div>
          </td>
        </tr>
    `),
  },
  {
    name: "First Share Tips",
    slug: "first-share-tips",
    subject: "Ready to share your first food? 🥗",
    category: "automation",
    variables: ["first_name", "unsubscribe_url"],
    plain_text_content: "Tips for sharing your first food item...",
    html_content: emailWrapper(`
        <tr>
          <td style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">🥗</div>
            <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Ready to Share?</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px;">
            <p style="margin: 0 0 20px; font-size: 17px;">Hi {{first_name}},</p>
            <p style="margin: 0 0 24px; font-size: 16px; color: #444;">Here's how to create a listing that gets claimed quickly!</p>
            <table width="100%"><tr><td align="center" style="padding: 20px 0;">
              <a href="https://foodshare.club/create" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 600;">Share Your First Item →</a>
            </td></tr></table>
          </td>
        </tr>
    `),
  },
  {
    name: "Community Highlights",
    slug: "community-highlights",
    subject: "See what your neighbors are sharing 🏘️",
    category: "automation",
    variables: ["first_name", "unsubscribe_url"],
    plain_text_content: "Your local FoodShare community is thriving...",
    html_content: emailWrapper(`
        <tr>
          <td style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">🏘️</div>
            <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Community Highlights</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px;">
            <p style="margin: 0 0 20px; font-size: 17px;">Hi {{first_name}},</p>
            <p style="margin: 0 0 24px; font-size: 16px; color: #444;">Your local FoodShare community is thriving!</p>
            <table width="100%"><tr><td align="center" style="padding: 20px 0;">
              <a href="https://foodshare.club/map" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 600;">Browse Food Near You →</a>
            </td></tr></table>
          </td>
        </tr>
    `),
  },
];

// Welcome automation flow configuration
const automationFlow = {
  name: "Welcome Series + Tester Recruitment",
  description:
    "5-email onboarding: welcome → profile → tester recruitment → first share → community highlights",
  trigger_type: "user_signup",
  trigger_config: {},
  status: "active",
  steps: [
    { type: "email", delay_minutes: 0, template_slug: "welcome", subject: "Welcome to FoodShare! 🍎" },
    { type: "delay", delay_minutes: 2880 }, // 2 days
    { type: "email", delay_minutes: 0, template_slug: "complete-profile", subject: "Complete your FoodShare profile 📝" },
    { type: "delay", delay_minutes: 2880 }, // 2 more days
    { type: "email", delay_minutes: 0, template_slug: "tester-recruitment", subject: "Help Shape FoodShare's Future - Join Our Beta Program 🚀" },
    { type: "delay", delay_minutes: 4320 }, // 3 days
    { type: "email", delay_minutes: 0, template_slug: "first-share-tips", subject: "Ready to share your first food? 🥗" },
    { type: "delay", delay_minutes: 7200 }, // 5 days
    { type: "email", delay_minutes: 0, template_slug: "community-highlights", subject: "See what your neighbors are sharing 🏘️" },
  ],
};

async function main() {
  console.log("🚀 Setting up Welcome Automation with Tester Recruitment\n");

  // Step 1: Seed templates
  console.log("📧 Seeding email templates...");
  const templateResults = { created: 0, updated: 0, errors: [] };

  for (const template of templates) {
    const { data: existing } = await supabase
      .from("email_templates")
      .select("id")
      .eq("slug", template.slug)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("email_templates")
        .update({
          name: template.name,
          subject: template.subject,
          html_content: template.html_content,
          plain_text_content: template.plain_text_content,
          category: template.category,
          variables: template.variables,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        templateResults.errors.push(`${template.slug}: ${error.message}`);
      } else {
        templateResults.updated++;
        console.log(`   ✓ Updated: ${template.slug}`);
      }
    } else {
      const { error } = await supabase.from("email_templates").insert({
        name: template.name,
        slug: template.slug,
        subject: template.subject,
        html_content: template.html_content,
        plain_text_content: template.plain_text_content,
        category: template.category,
        variables: template.variables,
        is_active: true,
      });

      if (error) {
        templateResults.errors.push(`${template.slug}: ${error.message}`);
      } else {
        templateResults.created++;
        console.log(`   ✓ Created: ${template.slug}`);
      }
    }
  }

  console.log(`\n   Templates: ${templateResults.created} created, ${templateResults.updated} updated`);
  if (templateResults.errors.length > 0) {
    console.log(`   Errors: ${templateResults.errors.join(", ")}`);
  }

  // Step 2: Check for existing automation
  console.log("\n🤖 Setting up automation flow...");
  const { data: existingFlow } = await supabase
    .from("email_automation_flows")
    .select("id, name, status")
    .ilike("name", "%Welcome Series + Tester%")
    .not("status", "eq", "archived")
    .single();

  let automationId;
  let automationStatus;

  if (existingFlow) {
    console.log(`   Found existing flow: ${existingFlow.name} (${existingFlow.status})`);
    automationId = existingFlow.id;
    automationStatus = existingFlow.status;

    // Update to active if not already
    if (existingFlow.status !== "active") {
      const { error } = await supabase
        .from("email_automation_flows")
        .update({ status: "active", steps: automationFlow.steps })
        .eq("id", existingFlow.id);

      if (!error) {
        automationStatus = "active";
        console.log("   ✓ Activated existing flow");
      }
    }
  } else {
    // Create new
    const { data: newFlow, error } = await supabase
      .from("email_automation_flows")
      .insert(automationFlow)
      .select("id, name, status")
      .single();

    if (error) {
      console.error(`   ✗ Failed to create: ${error.message}`);
      process.exit(1);
    }

    automationId = newFlow.id;
    automationStatus = newFlow.status;
    console.log(`   ✓ Created: ${newFlow.name}`);
  }

  // Final summary
  console.log("\n" + "=".repeat(50));
  console.log("✅ SETUP COMPLETE!\n");
  console.log("📧 Templates:");
  console.log(`   Created: ${templateResults.created}`);
  console.log(`   Updated: ${templateResults.updated}`);
  console.log("\n🤖 Automation:");
  console.log(`   ID: ${automationId}`);
  console.log(`   Name: ${automationFlow.name}`);
  console.log(`   Status: ${automationStatus}`);
  console.log("\n📋 Email Flow:");
  console.log("   Day 0:  Welcome Email");
  console.log("   Day 2:  Complete Profile");
  console.log("   Day 4:  Tester Recruitment (Web + iOS)");
  console.log("   Day 7:  First Share Tips");
  console.log("   Day 12: Community Highlights");
  console.log("=".repeat(50));
}

main().catch(console.error);
